import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE, REFRESH_COOKIE, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, authCookieOptions } from './cookies'
import { tryRefresh, type RefreshResult } from './refresh'
import type { UserRole } from './types'

export type RoleRestrictions = Record<string, UserRole[]>

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
