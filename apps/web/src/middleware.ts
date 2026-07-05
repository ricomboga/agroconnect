import { createAuthMiddleware, type RoleRestrictions } from '@agroconnect/web-auth/server'
import type { UserRole } from '@agroconnect/web-auth'

export const config = {
  matcher: [
    '/admin/:path*',
    '/lender',
    '/lender/:path*',
    '/provider',
    '/provider/:path*',
    '/farmer',
    '/farmer/:path*',
    '/farms',
    '/farms/:path*',
    '/govt',
    '/govt/:path*',
    '/supplier',
    '/supplier/:path*',
  ],
}

const ROLE_RESTRICTIONS: RoleRestrictions = {
  '/admin': ['admin'],
  '/lender': ['lender', 'admin'],
  '/provider': ['extension_officer', 'vet_officer', 'admin'],
  '/farmer': ['farmer', 'admin'],
  '/farms': ['farmer', 'admin'],
  '/govt': ['govt_officer', 'admin'],
  '/supplier': ['supplier', 'admin'],
}

export const middleware = createAuthMiddleware(ROLE_RESTRICTIONS)
