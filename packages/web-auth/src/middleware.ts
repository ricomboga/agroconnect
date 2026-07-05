import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE } from './cookies'
import type { UserRole } from './types'

export type RoleRestrictions = Record<string, UserRole[]>

export function createAuthMiddleware(roleRestrictions: RoleRestrictions) {
  return async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl
    const token = req.cookies.get(ACCESS_COOKIE)?.value

    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('returnUrl', pathname)

    if (!token) {
      return NextResponse.redirect(loginUrl)
    }

    let role: UserRole
    try {
      const payload = await verifyAccessToken(token)
      role = payload.role as UserRole
    } catch {
      return NextResponse.redirect(loginUrl)
    }

    for (const [prefix, allowed] of Object.entries(roleRestrictions)) {
      if (pathname.startsWith(prefix) && !allowed.includes(role)) {
        return NextResponse.redirect(loginUrl)
      }
    }

    return NextResponse.next()
  }
}
