import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as reportService from '../services/reportService.js';

export async function generateReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await reportService.generateReport(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
    );
    const statusCode = 'jobId' in result ? 202 : 200;
    res.status(statusCode).json({ data: result });
  } catch (err) {
    next(err);
  }
}
