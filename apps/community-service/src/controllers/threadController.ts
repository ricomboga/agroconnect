import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as threadService from '../services/threadService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createThread(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await threadService.createThread(req.user.id, req.body);
    res.status(201).json({ data: thread });
  } catch (err) {
    next(err);
  }
}

export async function listThreads(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { threads, total } = await threadService.listThreads(req.query as never, pagination);
    res.json({
      data: threads,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

export async function getThread(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await threadService.getThread(req.params['id'] as string);
    res.json({ data: thread });
  } catch (err) {
    next(err);
  }
}

export async function updateThread(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await threadService.updateThread(
      req.params['id'] as string,
      req.user.id,
      req.user.role,
      req.body,
    );
    res.json({ data: thread });
  } catch (err) {
    next(err);
  }
}

export async function deleteThread(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await threadService.deleteThread(req.params['id'] as string, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function upvoteThread(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const thread = await threadService.upvoteThread(req.params['id'] as string);
    res.json({ data: thread });
  } catch (err) {
    next(err);
  }
}
