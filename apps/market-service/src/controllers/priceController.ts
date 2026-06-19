import { Request, Response, NextFunction } from 'express';
import * as priceService from '../services/priceService.js';

/**
 * @openapi
 * /api/v1/market/prices:
 *   get:
 *     summary: Get current KES commodity prices for key crops
 *     tags: [Prices]
 *     responses:
 *       200:
 *         description: List of commodity prices
 */
export async function getCurrentPrices(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const prices = await priceService.getCurrentPrices();
    res.json({ data: prices });
  } catch (err) {
    next(err);
  }
}
