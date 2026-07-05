import { NextRequest } from 'next/server'
import { REFRESH_COOKIE, buildLogoutResponse } from '@agroconnect/web-auth/server'

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? ''

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value

  if (refreshToken) {
    await fetch(`${AUTH_SERVICE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }

  return buildLogoutResponse()
}
