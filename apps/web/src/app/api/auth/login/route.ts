import { NextRequest, NextResponse } from 'next/server'
import { loginRequestSchema, buildLoginResponse } from '@agroconnect/web-auth/server'

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? ''

export async function POST(req: NextRequest) {
  const parsed = loginRequestSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { message: 'Invalid request', errors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const body = parsed.data

  const upstream = await fetch(`${AUTH_SERVICE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!upstream.ok) {
    const error = await upstream.json().catch(() => ({}))
    return NextResponse.json(error, { status: upstream.status })
  }

  const { data } = await upstream.json()
  const { accessToken, refreshToken, user } = data

  return buildLoginResponse({ accessToken, refreshToken, user })
}
