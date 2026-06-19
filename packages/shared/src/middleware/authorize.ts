import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from './authenticate.js';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user || !roles.includes(user.role)) {
      res.status(403).json({
        error_code: 'FORBIDDEN',
        message_key: 'error.auth.forbidden',
        request_id: '',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  };
}
