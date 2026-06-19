import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, importSPKI, type JWTPayload } from 'jose'
import type { UserRole } from './lib/auth'

export const config = {
  matcher: [
    '/admin/:path*',
    '/lender',
    '/lender/:path*',
    '/provider',
    '/provider/:path*',
    '/farmer',
    '/farmer/:path*',
  ],
}

const ROLE_RESTRICTIONS: Record<string, UserRole[]> = {
  '/admin': ['admin'],
  '/lender': ['lender', 'admin'],
  '/provider': ['extension_officer', 'vet_officer', 'admin'],
  '/farmer': ['farmer', 'admin'],
}

let cachedPublicKey: CryptoKey | null = null

async function getPublicKey(): Promise<CryptoKey> {
  if (!cachedPublicKey) {
    const pem = process.env.AUTH_JWT_PUBLIC_KEY!
    cachedPublicKey = (await importSPKI(pem, 'RS256')) as CryptoKey
  }
  return cachedPublicKey
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get('__ac')?.value

  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('returnUrl', pathname)

  if (!token) {
    return NextResponse.redirect(loginUrl)
  }

  let payload: JWTPayload
  try {
    const key = await getPublicKey()
    const result = await jwtVerify(token, key)
    payload = result.payload
  } catch {
    return NextResponse.redirect(loginUrl)
  }

  const role = payload.role as UserRole
  for (const [prefix, allowed] of Object.entries(ROLE_RESTRICTIONS)) {
    if (pathname.startsWith(prefix) && !allowed.includes(role)) {
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}
