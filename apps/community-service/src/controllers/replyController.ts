import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as replyService from '../services/replyService.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reply = await replyService.createReply(
      req.params['id'] as string,
      req.user.id,
      req.body,
    );
    res.status(201).json({ data: reply });
  } catch (err) {
    next(err);
  }
}

export async function listReplies(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const { replies, total } = await replyService.listReplies(
      req.params['id'] as string,
      pagination,
    );
    res.json({
      data: replies,
      meta: { total, page: Number(req.query['page'] ?? 1), page_size: pagination.take },
    });
  } catch (err) {
    next(err);
  }
}

export async function upvoteReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reply = await replyService.upvoteReply(req.params['replyId'] as string);
    res.json({ data: reply });
  } catch (err) {
    next(err);
  }
}

export async function verifyReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reply = await replyService.verifyReply(
      req.params['replyId'] as string,
      req.user.role,
    );
    res.json({ data: reply });
  } catch (err) {
    next(err);
  }
}

export async function reportReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reply = await replyService.reportReply(req.params['replyId'] as string);
    res.json({ data: reply });
  } catch (err) {
    next(err);
  }
}
