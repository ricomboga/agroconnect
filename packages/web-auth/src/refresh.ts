import { verifyAccessToken } from './jwt'
import type { UserRole } from './types'

export interface RefreshResult {
  accessToken: string
  refreshToken: string
  role: UserRole
}

// Access tokens are short-lived (15 min). Without this, anyone whose cookie
// outlives that window gets rejected mid-session even though their refresh
// token (30-day TTL) is still valid — silently mint a new access token from
// it instead of forcing a re-login. Shared by the page-level middleware and
// by getServerSessionWithRefresh (for API route handlers, which the
// middleware never covers).
export async function tryRefresh(refreshToken: string): Promise<RefreshResult | null> {
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
