import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as harvestService from '../services/harvestService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function recordHarvest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const harvest = await harvestService.recordHarvest(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.status(201).json({ data: harvest });
  } catch (err) {
    next(err);
  }
}

export async function listHarvests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { harvests, total } = await harvestService.listHarvests(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      pagination,
    );
    res.json({
      data: harvests,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateHarvest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const harvest = await harvestService.updateHarvest(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.params['harvestId'] as string,
      req.body,
    );
    res.json({ data: harvest });
  } catch (err) {
    next(err);
  }
}

export async function deleteHarvest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await harvestService.deleteHarvest(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.params['harvestId'] as string,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
