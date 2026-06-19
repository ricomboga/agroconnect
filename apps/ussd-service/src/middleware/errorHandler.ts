import type { NextFunction, Request, Response } from 'express';
import { RESPONSES } from '../menus/responses.js';
import { logger } from '../logger.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error({ err, path: req.path }, 'Unhandled error in ussd-service');
  res.status(200).type('text/plain').send(RESPONSES.GENERIC_ERROR);
}
