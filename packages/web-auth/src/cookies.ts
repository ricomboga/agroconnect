export const ACCESS_COOKIE = '__ac'
export const REFRESH_COOKIE = '__rt'

export const ACCESS_TOKEN_TTL_SECONDS = 900
export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}
