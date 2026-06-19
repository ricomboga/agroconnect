import type { Request, Response, NextFunction } from 'express';
import { sumDisbursedLoans } from '../repositories/adminStatsRepository.js';

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loans_disbursed_kes = await sumDisbursedLoans();
    res.json({ loans_disbursed_kes });
  } catch (err) {
    next(err);
  }
}
