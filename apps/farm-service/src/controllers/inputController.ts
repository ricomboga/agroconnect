import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as inputService from '../services/inputService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import type { ListInputsQuery } from '../schemas/listInputs.query.schema.js';

export async function recordInput(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = await inputService.recordInput(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
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
    const query = req.query as unknown as ListInputsQuery;
    const pagination = parsePaginationParams(req.query);
    const { inputs, total } = await inputService.listInputs(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      { type: query.type, season: query.season },
      pagination,
    );
    res.json({
      data: inputs,
      meta: { total, page: query.page, page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}
