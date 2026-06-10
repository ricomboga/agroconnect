import { Response, NextFunction } from 'express';
import { createVerify } from 'crypto';
import { AuthenticatedRequest } from '../types/index.js';

const PUBLIC_KEY = process.env['JWT_PUBLIC_KEY'] ?? '';

function base64UrlDecode(str: string): string {
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message_key: 'error.unauthorized',
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length !== 3) {
    res.status(401).json({
      error_code: 'INVALID_TOKEN',
      message_key: 'error.invalid_token',
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const [header, payload, signature] = parts as [string, string, string];
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${header}.${payload}`);
    const valid = verifier.verify(PUBLIC_KEY, signature, 'base64url');
    if (!valid) throw new Error('Invalid signature');

    const claims = JSON.parse(base64UrlDecode(payload)) as Record<string, unknown>;
    const exp = claims['exp'] as number | undefined;
    if (exp && Date.now() / 1000 > exp) throw new Error('Token expired');

    req.user = {
      userId: String(claims['sub'] ?? ''),
      role: String(claims['role'] ?? ''),
      phone: String(claims['phone'] ?? ''),
    };
    next();
  } catch {
    res.status(401).json({
      error_code: 'INVALID_TOKEN',
      message_key: 'error.invalid_token',
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    });
  }
}
