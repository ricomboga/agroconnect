import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error_code: 'VALIDATION_ERROR',
        message_key: 'error.validation',
        details: result.error.flatten(),
        request_id: req.headers['x-request-id'] ?? '',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    req.query = result.data;
    next();
  };
}
