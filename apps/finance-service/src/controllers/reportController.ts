import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import * as farmerReportService from '../services/farmerReportService.js';

function rangeFromQuery(req: AuthenticatedRequest): { fromDate?: string; toDate?: string } {
  const query = req.query as { from_date?: string; to_date?: string };
  return { fromDate: query.from_date, toDate: query.to_date };
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function trailingYearRangeFromQuery(req: Request): { fromDate?: string; toDate?: string } {
  const query = req.query as { from_date?: string; to_date?: string };
  if (query.from_date || query.to_date) {
    return { fromDate: query.from_date, toDate: query.to_date };
  }
  const to = new Date();
  const from = new Date();
  from.setFullYear(from.getFullYear() - 1);
  return { fromDate: toIsoDate(from), toDate: toIsoDate(to) };
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

/**
 * @openapi
 * /api/v1/finance/admin/farmers/{farmerId}/report:
 *   get:
 *     summary: Comprehensive financial + production report for an arbitrary farmer (admin)
 *     tags: [Admin, Reports]
 *     security:
 *       - bearerAuth: []
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
 *         description: Farmer financial report, defaulting to the trailing 12 months when no range is given
 *       403:
 *         description: Caller is not an admin
 */
export async function getFarmerReportForAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farmerId = req.params['farmerId'] as string;
    const report = await farmerReportService.generateFarmerReport(farmerId, trailingYearRangeFromQuery(req));
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
}
