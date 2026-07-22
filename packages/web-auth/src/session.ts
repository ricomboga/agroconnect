import { cookies } from 'next/headers'
import type { JwtPayload } from '@agroconnect/shared'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, authCookieOptions } from './cookies'
import { tryRefresh } from './refresh'
import type { UserRole } from './types'

export async function getServerSession(): Promise<JwtPayload | null> {
  try {
    const token = cookies().get(ACCESS_COOKIE)?.value
    if (!token) return null
    return (await verifyAccessToken(token)) as unknown as JwtPayload
  } catch {
    return null
  }
}

/**
 * Like getServerSession, but silently mints a new access token from the
 * refresh-token cookie when the access token is missing/expired — mirrors
 * what the page-level middleware already does for navigations. Route
 * Handlers never go through that middleware (its matcher only covers page
 * paths, never /api/*), so without this, any mutation proxied through an
 * API route (e.g. Add Product) fails with a stale-token 401 as soon as the
 * 15-minute access token expires — even though the user's session (30-day
 * refresh token) is still perfectly valid. Returns the possibly-refreshed
 * token too, so callers forward the fresh one upstream instead of
 * re-reading the now-stale cookie.
 */
export async function getServerSessionWithRefresh(): Promise<{ session: JwtPayload; token: string } | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(ACCESS_COOKIE)?.value

  if (token) {
    try {
      const session = (await verifyAccessToken(token)) as unknown as JwtPayload
      return { session, token }
    } catch {
      // fall through to refresh
    }
  }

  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
  if (!refreshToken) return null

  const refreshed = await tryRefresh(refreshToken)
  if (!refreshed) return null

  cookieStore.set(ACCESS_COOKIE, refreshed.accessToken, authCookieOptions(ACCESS_TOKEN_TTL_SECONDS))
  cookieStore.set(REFRESH_COOKIE, refreshed.refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_SECONDS))

  const session = (await verifyAccessToken(refreshed.accessToken)) as unknown as JwtPayload
  return { session, token: refreshed.accessToken }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession()
  return session !== null
}

export async function getRole(): Promise<UserRole | null> {
  const session = await getServerSession()
  if (!session) return null
  return session.role as UserRole
}
