import type { Request, Response, NextFunction } from 'express';
import { countActiveFarms, countDiagnosesThisMonth } from '../repositories/adminStatsRepository.js';

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total_farms, diagnoses_this_month] = await Promise.all([
      countActiveFarms(),
      countDiagnosesThisMonth(),
    ]);
    res.json({ total_farms, diagnoses_this_month });
  } catch (err) {
    next(err);
  }
}
