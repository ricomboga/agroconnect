import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  authCookieOptions,
} from './cookies'
import type { AuthUser } from '@agroconnect/shared'

export const loginRequestSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
  deviceId: z.string().optional(),
})

export interface LoginUpstreamResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

export function buildLoginResponse({ accessToken, refreshToken, user }: LoginUpstreamResult) {
  const response = NextResponse.json({ user, accessToken })

  response.cookies.set(ACCESS_COOKIE, accessToken, authCookieOptions(ACCESS_TOKEN_TTL_SECONDS))
  response.cookies.set(REFRESH_COOKIE, refreshToken, authCookieOptions(REFRESH_TOKEN_TTL_SECONDS))

  return response
}

export function buildLogoutResponse() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(ACCESS_COOKIE)
  response.cookies.delete(REFRESH_COOKIE)
  return response
}
