import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as workerService from '../services/workerService.js';

/**
 * @openapi
 * /api/v1/farms/{farmId}/workers:
 *   post:
 *     summary: Add a worker to a farm
 *     tags: [Workers]
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
 *             $ref: '#/components/schemas/AddWorkerDto'
 *     responses:
 *       201:
 *         description: Worker added
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm not found
 *       409:
 *         description: Worker already on this farm
 */
export async function addWorker(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const worker = await workerService.addWorker(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.status(201).json({ data: worker });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/farms/{farmId}/workers:
 *   get:
 *     summary: List active workers on a farm
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of workers
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm not found
 */
export async function listWorkers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const workers = await workerService.listWorkers(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
    );
    res.json({ data: workers });
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/farms/{farmId}/workers/{userId}:
 *   delete:
 *     summary: Remove (soft-delete) a worker from a farm
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Worker removed
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm or worker not found
 */
export async function removeWorker(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await workerService.removeWorker(
      req.params['farmId'] as string,
      req.params['userId'] as string,
      req.user.id,
      req.user.role,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * @openapi
 * /api/v1/farms/{farmId}/workers/{userId}:
 *   patch:
 *     summary: Update a worker's role
 *     tags: [Workers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: farmId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateWorkerRoleDto'
 *     responses:
 *       200:
 *         description: Worker role updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Missing or invalid JWT
 *       403:
 *         description: Not the farm owner
 *       404:
 *         description: Farm or worker not found
 */
export async function updateWorkerRole(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const worker = await workerService.updateWorkerRole(
      req.params['farmId'] as string,
      req.params['userId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.json({ data: worker });
  } catch (err) {
    next(err);
  }
}
