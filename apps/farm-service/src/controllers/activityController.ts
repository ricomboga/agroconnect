import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as activityService from '../services/activityService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function scheduleActivity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await activityService.scheduleActivity(
      req.params['farmId'] as string,
      req.user.userId,
      req.body,
    );
    res.status(201).json({ data: activity });
  } catch (err) {
    next(err);
  }
}

export async function listActivities(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const filter = {
      from_date: req.query['from_date'] as string | undefined,
      to_date: req.query['to_date'] as string | undefined,
      status: req.query['status'] as 'pending' | 'completed' | 'skipped' | undefined,
    };
    const { activities, total } = await activityService.listActivities(
      req.params['farmId'] as string,
      req.user.userId,
      filter,
      pagination,
    );
    res.json({
      data: activities,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateActivity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await activityService.updateActivity(
      req.params['farmId'] as string,
      req.user.userId,
      req.params['activityId'] as string,
      req.body,
    );
    res.json({ data: activity });
  } catch (err) {
    next(err);
  }
}
