import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as summaryService from '../services/summaryService.js';
import type { PaginationQuery } from '@agroconnect/shared';

export async function getFarmSummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as Pick<PaginationQuery, never> & {
      from_date?: string;
      to_date?: string;
    };
    const summary = await summaryService.getFarmSummary(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      query.from_date,
      query.to_date,
    );
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
