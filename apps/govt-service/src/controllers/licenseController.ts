import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as licenseService from '../services/licenseService.js';
import { parsePaginationParams } from '../utils/pagination.js';

/**
 * @openapi
 * /api/v1/govt/licenses:
 *   post:
 *     summary: Apply for a license
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: License application submitted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 */
export async function applyForLicense(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const license = await licenseService.applyForLicense(req.user.id, req.body);
    res.status(201).json({ data: license });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/licenses:
 *   get:
 *     summary: List farmer's license applications
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of licenses
 *       401:
 *         description: Missing or invalid JWT
 */
export async function listLicenses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { licenses, total } = await licenseService.listLicenses(req.user.id, pagination);
    res.json({
      data: licenses,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
