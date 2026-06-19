import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as subsidyService from '../services/subsidyService.js';
import { parsePaginationParams } from '../utils/pagination.js';

/**
 * @openapi
 * /api/v1/govt/subsidies:
 *   get:
 *     summary: List available subsidy programs
 *     tags: [Government]
 *     responses:
 *       200:
 *         description: Paginated list of subsidy programs
 */
export async function listPrograms(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { programs, total } = await subsidyService.listPrograms(pagination);
    res.json({
      data: programs,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies/{programId}/apply:
 *   post:
 *     summary: Apply for a subsidy program
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Application submitted
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Program not found
 *       409:
 *         description: Duplicate application
 */
export async function applyForSubsidy(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const application = await subsidyService.applyForSubsidy(
      req.user.id,
      req.params['programId'] as string,
      req.body,
    );
    res.status(201).json({ data: application });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies/applications:
 *   get:
 *     summary: List farmer's subsidy applications
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of applications
 *       401:
 *         description: Missing or invalid JWT
 */
export async function listApplications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { applications, total } = await subsidyService.listApplications(req.user.id, pagination);
    res.json({
      data: applications,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
