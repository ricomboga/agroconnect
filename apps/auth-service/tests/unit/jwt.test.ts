import crypto from 'node:crypto';
import { verifyJwt } from '@agroconnect/shared';

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signToken(payload: object, privateKey: string): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signing = `${header}.${body}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signing);
  const sig = base64url(signer.sign(privateKey));
  return `${signing}.${sig}`;
}

const PRIVATE_KEY = process.env['JWT_PRIVATE_KEY'] ?? '';
const PUBLIC_KEY = process.env['JWT_PUBLIC_KEY'] ?? '';
const now = Math.floor(Date.now() / 1000);

const validPayload = {
  sub: 'user-id-123',
  role: 'farmer',
  phone: '+254712345678',
  iat: now,
  exp: now + 900,
};

describe('verifyJwt', () => {
  it('returns the payload for a valid token', () => {
    const token = signToken(validPayload, PRIVATE_KEY);
    const result = verifyJwt(token, PUBLIC_KEY);
    expect(result.sub).toBe('user-id-123');
    expect(result.role).toBe('farmer');
    expect(result.phone).toBe('+254712345678');
  });

  it('throws error.token.malformed for a token without two dots', () => {
    expect(() => verifyJwt('not.a.valid.jwt.structure', PUBLIC_KEY)).toThrow('error.token.malformed');
    expect(() => verifyJwt('onlyone', PUBLIC_KEY)).toThrow('error.token.malformed');
  });

  it('throws error.token.invalid when the signature is tampered', () => {
    const token = signToken(validPayload, PRIVATE_KEY);
    const parts = token.split('.');
    // change first char of signature — guaranteed to alter decoded bytes (all 6 bits are significant here)
    const tamperedSig = (parts[2][0] === 'A' ? 'B' : 'A') + parts[2].slice(1);
    const tampered = `${parts[0]}.${parts[1]}.${tamperedSig}`;
    expect(() => verifyJwt(tampered, PUBLIC_KEY)).toThrow('error.token.invalid');
  });

  it('throws error.token.invalid when the payload is tampered', () => {
    const token = signToken(validPayload, PRIVATE_KEY);
    const parts = token.split('.');
    // replace the body with a different payload (unsigned)
    const fakeBody = base64url(JSON.stringify({ ...validPayload, role: 'admin' }));
    const tampered = `${parts[0]}.${fakeBody}.${parts[2]}`;
    expect(() => verifyJwt(tampered, PUBLIC_KEY)).toThrow('error.token.invalid');
  });

  it('throws error.token.expired for a token past its exp', () => {
    const expired = signToken({ ...validPayload, exp: now - 1 }, PRIVATE_KEY);
    expect(() => verifyJwt(expired, PUBLIC_KEY)).toThrow('error.token.expired');
  });

  it('throws error.token.invalid when verified against the wrong public key', () => {
    const { publicKey: otherPublicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const otherPem = otherPublicKey.export({ type: 'spki', format: 'pem' }) as string;
    const token = signToken(validPayload, PRIVATE_KEY);
    expect(() => verifyJwt(token, otherPem)).toThrow('error.token.invalid');
  });
});
