import { NextRequest, NextResponse } from 'next/server'

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? ''

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('__rt')?.value

  if (refreshToken) {
    await fetch(`${AUTH_SERVICE}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('__ac')
  response.cookies.delete('__rt')
  return response
}
