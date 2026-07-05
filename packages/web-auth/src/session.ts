import { cookies } from 'next/headers'
import type { JwtPayload } from '@agroconnect/shared'
import { verifyAccessToken } from './jwt'
import { ACCESS_COOKIE } from './cookies'
import type { UserRole } from './types'

export async function getServerSession(): Promise<JwtPayload | null> {
  try {
    const token = cookies().get(ACCESS_COOKIE)?.value
    if (!token) return null
    return (await verifyAccessToken(token)) as unknown as JwtPayload
  } catch {
    return null
  }
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getServerSession()
  return session !== null
}

export async function getRole(): Promise<UserRole | null> {
  const session = await getServerSession()
  if (!session) return null
  return session.role as UserRole
}
