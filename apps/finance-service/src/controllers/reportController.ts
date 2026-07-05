import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as farmerReportService from '../services/farmerReportService.js';

function rangeFromQuery(req: AuthenticatedRequest): { fromDate?: string; toDate?: string } {
  const query = req.query as { from_date?: string; to_date?: string };
  return { fromDate: query.from_date, toDate: query.to_date };
}

/**
 * @openapi
 * /api/v1/finance/reports/me:
 *   get:
 *     summary: Comprehensive financial + production report for the logged-in farmer
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Farmer financial report
 *       400:
 *         description: Invalid date range
 *       401:
 *         description: Missing or invalid JWT
 */
export async function getMyReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await farmerReportService.generateFarmerReport(req.user.id, rangeFromQuery(req));
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}
