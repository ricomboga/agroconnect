import { jwtVerify, importSPKI, type KeyLike, type JWTPayload } from 'jose'

let cachedPublicKey: KeyLike | null = null

async function getPublicKey(): Promise<KeyLike> {
  if (!cachedPublicKey) {
    const pem = process.env.AUTH_JWT_PUBLIC_KEY!
    cachedPublicKey = await importSPKI(pem, 'RS256')
  }
  return cachedPublicKey
}

export async function verifyAccessToken(token: string): Promise<JWTPayload> {
  const key = await getPublicKey()
  const { payload } = await jwtVerify(token, key)
  return payload
}
