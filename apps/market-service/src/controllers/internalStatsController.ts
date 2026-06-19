import type { Request, Response, NextFunction } from 'express';
import { countActiveListings } from '../repositories/adminStatsRepository.js';

export async function getStatsHandler(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const active_listings = await countActiveListings();
    res.json({ active_listings });
  } catch (err) {
    next(err);
  }
}
