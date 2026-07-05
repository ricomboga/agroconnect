import type { Request, Response, NextFunction } from 'express';
import {
  countActiveFarms,
  countDiagnosesThisMonth,
  countFarmsHealthBelowThreshold,
} from '../repositories/adminStatsRepository.js';

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [total_farms, diagnoses_this_month, farms_health_below_50] = await Promise.all([
      countActiveFarms(),
      countDiagnosesThisMonth(),
      countFarmsHealthBelowThreshold(),
    ]);
    res.json({ total_farms, diagnoses_this_month, farms_health_below_50 });
  } catch (err) {
    next(err);
  }
}
