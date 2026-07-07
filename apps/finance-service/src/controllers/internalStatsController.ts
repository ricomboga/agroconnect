import type { Request, Response, NextFunction } from 'express';
import { sumDisbursedLoans, sumDisbursedLoansByInstitution } from '../repositories/adminStatsRepository.js';

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const loans_disbursed_kes = await sumDisbursedLoans();
    res.json({ loans_disbursed_kes });
  } catch (err) {
    next(err);
  }
}

export async function getLoansByInstitutionHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await sumDisbursedLoansByInstitution();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
