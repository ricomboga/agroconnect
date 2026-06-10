import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as inputService from '../services/inputService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function recordInput(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = await inputService.recordInput(
      req.params['farmId'] as string,
      req.user.userId,
      req.body,
    );
    res.status(201).json({ data: input });
  } catch (err) {
    next(err);
  }
}

export async function listInputs(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const filter = {
      type: req.query['type'] as string | undefined,
      season: req.query['season'] as string | undefined,
    };
    const { inputs, total } = await inputService.listInputs(
      req.params['farmId'] as string,
      req.user.userId,
      filter,
      pagination,
    );
    res.json({
      data: inputs,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
