import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as activityService from '../services/activityService.js';
import { parsePaginationParams } from '../utils/pagination.js';
import type { ListActivitiesQuery } from '../schemas/listActivities.query.schema.js';

export async function getActivity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await activityService.getActivity(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      req.params['activityId'] as string,
    );
    res.json({ data: activity });
  } catch (err) {
    next(err);
  }
}

export async function scheduleActivity(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const activity = await activityService.scheduleActivity(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
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
    const query = req.query as unknown as ListActivitiesQuery;
    const pagination = parsePaginationParams(req.query);
    const filter = {
      from_date: query.from_date,
      to_date: query.to_date,
      status: query.status,
    };
    const { activities, total } = await activityService.listActivities(
      req.params['farmId'] as string,
      req.user.id,
      req.user.role,
      filter,
      pagination,
    );
    const page = Number(query.page ?? 1);
    const pageSize = pagination.take;
    res.json({
      data: activities,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
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
      req.user.id,
      req.user.role,
      req.params['activityId'] as string,
      req.body,
    );
    res.json({ data: activity });
  } catch (err) {
    next(err);
  }
}
