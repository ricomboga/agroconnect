import { getServerSessionWithRefresh } from '@agroconnect/web-auth/server'
import type { JwtPayload } from '@agroconnect/shared'

export { getServerSession, getServerSessionWithRefresh, isAuthenticated, getRole } from '@agroconnect/web-auth/server'
export type { UserRole } from '@agroconnect/web-auth'

/**
 * Session guard for /api/lender/* route handlers. The page-level middleware
 * (apps/web/middleware.ts) restricts /lender/:path* to 'lender'|'admin', but
 * that matcher never covers /api/*, so every lender API route must check the
 * role itself — this centralizes that check so it can't be forgotten on a
 * new route the way it was on several existing ones.
 *
 * Uses getServerSessionWithRefresh (not getServerSession) so a session whose
 * 15-minute access token has expired mid-form doesn't get a silent 401 —
 * returns the possibly-refreshed token too, so callers forward that upstream
 * instead of separately re-reading the now-stale __ac cookie.
 */
export async function requireLenderSession(): Promise<{ session: JwtPayload; token: string } | null> {
  const auth = await getServerSessionWithRefresh()
  if (!auth || (auth.session.role !== 'lender' && auth.session.role !== 'admin')) return null
  return auth
}
