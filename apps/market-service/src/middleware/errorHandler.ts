import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger.js';

export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
  messageKey?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const errorCode = err.errorCode ?? 'INTERNAL_ERROR';
  const messageKey = err.messageKey ?? 'error.internal';

  logger.error(
    { err, requestId: req.headers['x-request-id'], path: req.path, method: req.method },
    'Request error',
  );

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message_key: messageKey,
      details: null,
      request_id: req.headers['x-request-id'] ?? '',
      timestamp: new Date().toISOString(),
    },
  });
}

export function createError(
  message: string,
  statusCode: number,
  errorCode: string,
  messageKey?: string,
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  err.messageKey = messageKey ?? `error.${errorCode.toLowerCase()}`;
  return err;
}
