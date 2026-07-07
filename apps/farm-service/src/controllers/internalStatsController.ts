import type { Request, Response, NextFunction } from 'express';
import {
  countActiveFarms,
  countDiagnosesThisMonth,
  countFarmsHealthBelowThreshold,
  countFarmersByCounty,
  sumLivestockByCounty,
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

export async function getFarmersByCountyHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await countFarmersByCounty();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function getLivestockStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const county = req.query['county'] as string | undefined;
    const animalType = req.query['animal_type'] as string | undefined;
    const data = await sumLivestockByCounty({ county, animalType });
    res.json({ data });
  } catch (err) {
    next(err);
  }
}
