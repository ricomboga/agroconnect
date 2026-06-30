import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as replyService from '../services/replyService.js';
import { CreateReplyDto } from '../schemas/createReply.schema.js';
import { parsePaginationParams } from '../utils/pagination.js';

export async function createReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = req.body as CreateReplyDto;
    const reply = await replyService.createReply(
      req.params['id'] as string,
      req.user.id,
      dto,
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
    const reply = await replyService.upvoteReply(req.params['replyId'] as string, req.user.id);
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
    const { reason } = req.body as { reason?: string };
    await replyService.reportReply(req.params['replyId'] as string, reason);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteReply(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await replyService.deleteReply(req.params['replyId'] as string, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
