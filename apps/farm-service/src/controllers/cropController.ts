import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as cropService from '../services/cropService.js';
import { ScheduleFilter } from '../services/scheduleService.js';

/**
 * @openapi
 * /api/v1/farms/{farmId}/crops:
 *   post:
 *     summary: Add a new crop plot and auto-generate its activity schedule
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCropDto'
 *     responses:
 *       201:
 *         description: Plot created and schedule generated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm not found
 */
export async function addCrop(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await cropService.addCrop(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/farms/{farmId}/plots/{plotId}/crop:
 *   post:
 *     summary: Save crop details for an existing plot and regenerate its activity schedule
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: plotId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SaveCropDetailsDto'
 *     responses:
 *       201:
 *         description: Crop details saved and schedule regenerated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm or plot not found
 */
export async function saveCropDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await cropService.saveCropDetails(
      req.params['farmId'] as string,
      req.params['plotId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/farms/{farmId}/schedule:
 *   get:
 *     summary: Get all activities for this farm grouped by status (overdue/today/upcoming/done)
 *     tags: [Farms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, skipped]
 *       - in: query
 *         name: from_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to_date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: plotId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Activities grouped by status
 *       401:
 *         description: Missing or invalid JWT
 *       404:
 *         description: Farm not found
 */
export async function getSchedule(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filter: ScheduleFilter = {
      status: req.query['status'] as ScheduleFilter['status'],
      from_date: req.query['from_date'] as string | undefined,
      to_date: req.query['to_date'] as string | undefined,
      plotId: req.query['plotId'] as string | undefined,
    };
    const result = await cropService.getSchedule(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      filter,
    );
    res.json({ data: result.data, grouped: result.grouped });
  } catch (err) {
    next(err);
  }
}
