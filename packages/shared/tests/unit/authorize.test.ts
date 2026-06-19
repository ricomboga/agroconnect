import type { Request, Response, NextFunction } from 'express';
import { authorize } from '../../src/middleware/authorize';
import type { AuthRequest } from '../../src/middleware/authenticate';

function makeReq(role?: string): Request {
  const req = { headers: {} } as unknown as Request;
  if (role !== undefined) {
    (req as AuthRequest).user = { id: 'u1', phone: '+254712345678', role, isVerified: false };
  }
  return req;
}

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return res;
}

const makeNext = (): NextFunction => jest.fn();

describe('authorize middleware', () => {
  it('calls next when the role matches the single allowed role', () => {
    const req = makeReq('farmer');
    const res = makeRes();
    const next = makeNext();

    authorize('farmer')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next when the role is one of multiple allowed roles', () => {
    const req = makeReq('admin');
    const res = makeRes();
    const next = makeNext();

    authorize('farmer', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when the role is not in the allowed list', () => {
    const req = makeReq('buyer');
    const res = makeRes();
    const next = makeNext();

    authorize('farmer', 'extension_officer')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error_code: 'FORBIDDEN', message_key: 'error.auth.forbidden' }),
    );
  });

  it('returns 403 when req.user is not set (authenticate was skipped)', () => {
    const req = makeReq(); // no user
    const res = makeRes();
    const next = makeNext();

    authorize('farmer')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 for a supplier attempting a farmer-only route', () => {
    const req = makeReq('supplier');
    const res = makeRes();
    const next = makeNext();

    authorize('farmer')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('calls next for every role listed in docs/security.md when all are allowed', () => {
    const roles = ['farmer', 'extension_officer', 'vet_officer', 'supplier', 'buyer', 'govt_officer', 'admin'];
    for (const role of roles) {
      const req = makeReq(role);
      const res = makeRes();
      const next = makeNext();
      authorize(...roles)(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    }
  });
});
