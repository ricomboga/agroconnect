import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { authenticate, type AuthRequest } from '../../src/middleware/authenticate';

// --- helpers ---

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
  return `${signing}.${base64url(signer.sign(privateKey))}`;
}

const PRIVATE_KEY = process.env['JWT_PRIVATE_KEY'] ?? '';
const now = Math.floor(Date.now() / 1000);

function makeReq(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as unknown as Request;
}

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res;
}

const makeNext = (): NextFunction => jest.fn();

// --- tests ---

describe('authenticate middleware', () => {
  it('populates req.user and calls next for a valid token', () => {
    const payload = { sub: 'user-001', role: 'farmer', phone: '+254712345678', iat: now, exp: now + 900 };
    const token = signToken(payload, PRIVATE_KEY);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect((req as AuthRequest).user).toEqual({
      id: 'user-001',
      phone: '+254712345678',
      role: 'farmer',
      isVerified: false,
    });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when the Authorization header is missing', () => {
    const req = makeReq();
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'UNAUTHORIZED', message_key: 'error.auth.missing_token' }),
    );
  });

  it('returns 401 when the Authorization header does not start with Bearer', () => {
    const req = makeReq('Basic dXNlcjpwYXNz');
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for an expired token', () => {
    const payload = { sub: 'user-001', role: 'farmer', phone: '+254712345678', iat: now - 1000, exp: now - 1 };
    const token = signToken(payload, PRIVATE_KEY);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message_key: 'error.token.expired' }),
    );
  });

  it('returns 401 for a token with a tampered signature', () => {
    const payload = { sub: 'user-001', role: 'farmer', phone: '+254712345678', iat: now, exp: now + 900 };
    const token = signToken(payload, PRIVATE_KEY);
    const parts = token.split('.');
    const bad = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -4)}XXXX`;
    const req = makeReq(`Bearer ${bad}`);
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message_key: 'error.token.invalid' }),
    );
  });

  it('returns 401 for a completely malformed token string', () => {
    const req = makeReq('Bearer not-a-jwt');
    const res = makeRes();
    const next = makeNext();

    authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message_key: 'error.token.malformed' }),
    );
  });
});
