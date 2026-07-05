import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as farmService from '../services/farmService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createFarm(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetOwnerId =
      req.user.role === 'admin' && req.body.ownerId ? (req.body.ownerId as string) : req.user.id;
    const farm = await farmService.createFarm(targetOwnerId, req.body);
    res.status(201).json({ data: farm });
  } catch (err) {
    next(err);
  }
}

export async function listFarms(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const filters = {
      search: req.query['search'] as string | undefined,
      county: req.query['county'] as string | undefined,
    };
    const { farms, total } = await farmService.listFarms(req.user.id, req.user.role, pagination, filters);
    const page = Number(req.query['page'] ?? 1);
    const pageSize = pagination.take;
    res.json({
      data: farms,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    next(err);
  }
}

export async function getFarm(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farm = await farmService.getFarm(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
    );
    res.json({ data: farm });
  } catch (err) {
    next(err);
  }
}

export async function updateFarm(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const farm = await farmService.updateFarm(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.json({ data: farm });
  } catch (err) {
    next(err);
  }
}

export async function deleteFarm(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await farmService.deleteFarm(req.params['farmId'] as string, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
