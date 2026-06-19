import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../jwt.js';
import type { AuthUser } from '../types/auth.js';

export interface AuthRequest extends Request {
  user: AuthUser;
}

const PUBLIC_KEY = (): string =>
  (process.env['JWT_PUBLIC_KEY'] ?? '').replace(/\\n/g, '\n');

function unauthorized(res: Response, messageKey: string): void {
  res.status(401).json({
    error_code: 'UNAUTHORIZED',
    message_key: messageKey,
    request_id: '',
    timestamp: new Date().toISOString(),
  });
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    unauthorized(res, 'error.auth.missing_token');
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyJwt(token, PUBLIC_KEY());
    (req as AuthRequest).user = {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
      isVerified: false, // isVerified is not encoded in the JWT — resolved by the service if needed
      partner_bank_id: payload.partner_bank_id,
    };
    next();
  } catch (err) {
    const messageKey = err instanceof Error ? err.message : 'error.token.invalid';
    unauthorized(res, messageKey);
  }
}
