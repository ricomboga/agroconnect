import crypto from 'node:crypto';

export interface JwtPayload {
  sub: string;
  role: string;
  phone: string;
  partner_bank_id?: string;
  iat: number;
  exp: number;
}

export function verifyJwt(token: string, publicKey: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('error.token.malformed');
  const [header, body, signature] = parts as [string, string, string];
  let valid: boolean;
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${header}.${body}`);
    valid = verifier.verify(publicKey, Buffer.from(signature, 'base64url'));
  } catch {
    throw new Error('error.token.invalid');
  }
  if (!valid) throw new Error('error.token.invalid');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as JwtPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('error.token.expired');
  return payload;
}
