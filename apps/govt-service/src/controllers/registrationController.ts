import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as registrationService from '../services/registrationService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { ListRegistrationsQuery } from '../schemas/listRegistrations.schema.js';

/**
 * @openapi
 * /api/v1/govt/registrations:
 *   post:
 *     summary: Submit a farm registration
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRegistrationDto'
 *     responses:
 *       201:
 *         description: Registration submitted
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 */
export async function submitRegistration(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const registration = await registrationService.submitRegistration(req.user.id, req.body);
    res.status(201).json({ data: registration });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/registrations:
 *   get:
 *     summary: List farmer's registrations
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated list of registrations
 *       401:
 *         description: Missing or invalid JWT
 */
export async function listRegistrations(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const query = req.query as unknown as ListRegistrationsQuery;
    const { registrations, total } = await registrationService.listRegistrations(
      req.user.id,
      req.user.role,
      pagination,
      { county: query.county, status: query.status },
    );
    res.json({
      data: registrations,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/registrations/{registrationId}:
 *   get:
 *     summary: Get registration detail
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Registration detail
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Not found
 */
export async function getRegistration(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const registration = await registrationService.getRegistration(
      req.params['registrationId'] as string,
    );
    res.json({ data: registration });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/govt/registrations/{registrationId}/status:
 *   patch:
 *     summary: Update registration status (govt_officer only)
 *     tags: [Government]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status updated
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
export async function updateStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const registration = await registrationService.updateStatus(
      req.params['registrationId'] as string,
      req.user.id,
      req.body,
    );
    res.json({ data: registration });
  } catch (err) {
    next(err);
  }
}
