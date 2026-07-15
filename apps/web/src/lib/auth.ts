import { getServerSession } from '@agroconnect/web-auth/server'
import type { JwtPayload } from '@agroconnect/shared'

export { getServerSession, isAuthenticated, getRole } from '@agroconnect/web-auth/server'
export type { UserRole } from '@agroconnect/web-auth'

/**
 * Session guard for /api/lender/* route handlers. The page-level middleware
 * (apps/web/middleware.ts) restricts /lender/:path* to 'lender'|'admin', but
 * that matcher never covers /api/*, so every lender API route must check the
 * role itself — this centralizes that check so it can't be forgotten on a
 * new route the way it was on several existing ones.
 */
export async function requireLenderSession(): Promise<JwtPayload | null> {
  const session = await getServerSession()
  if (!session || (session.role !== 'lender' && session.role !== 'admin')) return null
  return session
}
