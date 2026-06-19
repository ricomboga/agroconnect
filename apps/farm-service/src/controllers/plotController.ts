import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as plotService from '../services/plotService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createPlot(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plot = await plotService.createPlot(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.status(201).json({ data: plot });
  } catch (err) {
    next(err);
  }
}

export async function listPlots(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { plots, total } = await plotService.listPlots(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      pagination,
    );
    res.json({
      data: plots,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
