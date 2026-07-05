import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as subsidyService from '../services/subsidyService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { ListSubsidyApplicationsQuery } from '../schemas/listSubsidyApplications.schema.js';
import { BulkApproveApplicationsDto } from '../schemas/bulkApproveApplications.schema.js';

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
    const query = req.query as unknown as ListSubsidyApplicationsQuery;
    const { applications, total } = await subsidyService.listApplications(
      req.user.id,
      req.user.role,
      pagination,
      { programId: query.programId, county: query.county, status: query.status },
    );
    res.json({
      data: applications,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies/applications/{applicationId}/status:
 *   patch:
 *     summary: Approve or reject a subsidy application (govt_officer only)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Application status updated
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export async function updateApplicationStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const application = await subsidyService.updateApplicationStatus(
      req.params['applicationId'] as string,
      req.user.id,
      req.body,
    );
    res.json({ data: application });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies:
 *   post:
 *     summary: Create a new subsidy program (govt_officer only)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Program created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Forbidden
 */
export async function createProgram(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const program = await subsidyService.createProgram(req.body);
    res.status(201).json({ data: program });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies/admin:
 *   get:
 *     summary: List all subsidy programs incl. inactive/draft, with per-program application counts (govt_officer/admin only)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 */
export async function listProgramsAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const status = req.query['status'] as 'draft' | 'upcoming' | 'open' | 'closed' | undefined;
    const ministry = req.query['ministry'] as string | undefined;
    const [{ programs, total }, ministries] = await Promise.all([
      subsidyService.listProgramsAdmin(pagination, { status, ministry }),
      subsidyService.listMinistries(),
    ]);
    res.json({
      data: programs,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take, ministries },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/subsidies/applications/bulk:
 *   patch:
 *     summary: Bulk-approve subsidy applications (govt_officer/admin only)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 */
export async function bulkApproveApplications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as BulkApproveApplicationsDto;
    const updated = await subsidyService.bulkApproveApplications(
      {
        ids: dto.ids,
        collectionPoint: dto.collectionPoint,
        deliveryDate: dto.collectionDate,
        approvedItems: dto.approvedItem,
      },
      req.user.id,
    );
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
}
