import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const AUTH_SERVICE = process.env.AUTH_SERVICE_URL ?? ''

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => ({})))
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

  const isProduction = process.env.NODE_ENV === 'production'

  const response = NextResponse.json({ user, accessToken })

  response.cookies.set('__ac', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 900,
    path: '/',
  })

  response.cookies.set('__rt', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 2_592_000,
    path: '/',
  })

  return response
}
