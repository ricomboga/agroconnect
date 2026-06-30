import type { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = (err as { statusCode?: number }).statusCode ?? 500;
  const message = err instanceof Error ? err.message : 'Internal server error';
  logger.error({ err }, message);
  res.status(status).json({ error: { message }, timestamp: new Date().toISOString() });
}
