import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, authCookieOptions } from './cookies'
import type { UserRole } from './types'

export type RoleRestrictions = Record<string, UserRole[]>

interface RefreshResult {
  accessToken: string
  refreshToken: string
  role: UserRole
}

// Access tokens are short-lived (15 min). Without this, anyone whose cookie
// outlives that window gets bounced to /login mid-session even though their
// refresh token (30-day TTL) is still valid — silently mint a new access
// token from it instead of forcing a re-login.
async function tryRefresh(refreshToken: string): Promise<RefreshResult | null> {
  const authServiceUrl = process.env.AUTH_SERVICE_URL
  if (!authServiceUrl) return null

  try {
    const res = await fetch(`${authServiceUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null

    const body = (await res.json()) as { data: { accessToken: string; refreshToken: string } }
    const payload = await verifyAccessToken(body.data.accessToken)
    return { accessToken: body.data.accessToken, refreshToken: body.data.refreshToken, role: payload.role as UserRole }
  } catch {
    return null
  }
}

export function createAuthMiddleware(roleRestrictions: RoleRestrictions) {
  return async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = req.cookies.get(ACCESS_COOKIE)?.value

    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('returnUrl', pathname)

    let role: UserRole
    let refreshed: RefreshResult | null = null

    if (token) {
      try {
        const payload = await verifyAccessToken(token)
        role = payload.role as UserRole
      } catch {
        const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
        refreshed = refreshToken ? await tryRefresh(refreshToken) : null
        if (!refreshed) {
          return NextResponse.redirect(loginUrl)
        }
        role = refreshed.role
      }
    } else {
      const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
      refreshed = refreshToken ? await tryRefresh(refreshToken) : null
      if (!refreshed) {
        return NextResponse.redirect(loginUrl)
      }
      role = refreshed.role
    }

    for (const [prefix, allowed] of Object.entries(roleRestrictions)) {
      if (pathname.startsWith(prefix) && !allowed.includes(role)) {
        return NextResponse.redirect(loginUrl)
      }
    }

    if (refreshed) {
      // Mutate the request's own cookie jar too — NextResponse.next() only updates
      // the browser's cookies for the *next* request. Without also forwarding it on
      // `request`, the Server Component rendering this same request would still read
      // the stale expired __ac cookie via cookies() and bounce to /login regardless.
      req.cookies.set(ACCESS_COOKIE, refreshed.accessToken)
      req.cookies.set(REFRESH_COOKIE, refreshed.refreshToken)
    }

    const response = NextResponse.next({ request: req })
    if (refreshed) {
      response.cookies.set(ACCESS_COOKIE, refreshed.accessToken, authCookieOptions(ACCESS_TOKEN_TTL_SECONDS))
      response.cookies.set(REFRESH_COOKIE, refreshed.refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_SECONDS))
    }
    return response
  }
}
