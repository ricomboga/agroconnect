import type { Request, Response, NextFunction } from 'express';
import { getProductionSummary } from '../services/productionSummaryService.js';
import { createError } from '../middleware/errorHandler.js';

function parseDate(raw: string | undefined, field: string): Date | undefined {
  if (!raw) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createError(`${field} must be YYYY-MM-DD`, 400, 'VALIDATION_ERROR', 'error.validation');
  }
  return new Date(raw);
}

/**
 * @openapi
 * /internal/production/{farmerId}:
 *   get:
 *     summary: Aggregated crop/animal-product/collection totals for a farmer (service-to-service)
 *     tags: [Internal]
 *     security:
 *       - serviceToken: []
 *     parameters:
 *       - in: path
 *         name: farmerId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Production summary for the farmer
 *       400:
 *         description: Invalid date format
 *       401:
 *         description: Missing or invalid service token
 */
export async function getFarmerProductionSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmerId = req.params['farmerId'] as string;
    const from = parseDate(req.query['from_date'] as string | undefined, 'from_date');
    const to = parseDate(req.query['to_date'] as string | undefined, 'to_date');

    const summary = await getProductionSummary(farmerId, { from, to });
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
