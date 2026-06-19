import { cookies } from 'next/headers'
import { jwtVerify, importSPKI, type KeyLike } from 'jose'
import type { JwtPayload } from '@agroconnect/shared'

export type UserRole =
  | 'farmer'
  | 'extension_officer'
  | 'vet_officer'
  | 'supplier'
  | 'buyer'
  | 'govt_officer'
  | 'admin'
  | 'lender'

let cachedPublicKey: KeyLike | null = null

async function getPublicKey(): Promise<KeyLike> {
  if (!cachedPublicKey) {
    const pem = process.env.AUTH_JWT_PUBLIC_KEY!
    cachedPublicKey = await importSPKI(pem, 'RS256')
  }
  return cachedPublicKey
}

export async function getServerSession(): Promise<JwtPayload | null> {
  try {
    const token = cookies().get('__ac')?.value
    if (!token) return null
    const key = await getPublicKey()
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as JwtPayload
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
