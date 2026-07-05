import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as reportService from '../services/reportService.js';
import { CountySummaryQuery } from '../schemas/countySummaryQuery.schema.js';

/**
 * @openapi
 * /api/v1/govt/reports/county-summary:
 *   get:
 *     summary: Aggregate govt-service counts for a county (govt_officer/admin)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: County summary aggregates
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Forbidden
 */
export async function countySummary(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as CountySummaryQuery;
    const summary = await reportService.getCountySummary(query.county);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
