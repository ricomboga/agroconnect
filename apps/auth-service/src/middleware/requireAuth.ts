import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { verifyJwt } from '@agroconnect/shared';
import { logger } from '../logger.js';

const PUBLIC_KEY = (process.env['JWT_PUBLIC_KEY'] ?? '').replace(/\\n/g, '\n');

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message_key: 'error.unauthorized',
      request_id: (req.headers['x-request-id'] as string) ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyJwt(token, PUBLIC_KEY);
    req.user = { id: payload.sub, role: payload.role, phone: payload.phone };
    next();
  } catch (err) {
    const messageKey = err instanceof Error ? err.message : 'error.token.invalid';
    logger.warn({ path: req.path, messageKey }, 'Token verification failed');
    res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message_key: messageKey,
      request_id: (req.headers['x-request-id'] as string) ?? '',
      timestamp: new Date().toISOString(),
    });
  }
}
