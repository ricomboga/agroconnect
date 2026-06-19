import type { Request, Response, NextFunction } from 'express';

export function requireServiceToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env['INTERNAL_SERVICE_SECRET'];
  if (!expected || req.headers['x-service-token'] !== expected) {
    res.status(401).json({
      error_code: 'UNAUTHORIZED',
      message_key: 'error.auth.missing_token',
      request_id: (req.headers['x-request-id'] as string) ?? '',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  next();
}
