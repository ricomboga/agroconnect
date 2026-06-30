import type { Request, Response, NextFunction } from 'express';
import {
  findFlaggedThreads,
  countFlaggedThreads,
  setThreadStatus,
} from '../repositories/adminModerationRepository.js';
import {
  findFlaggedReplies,
  countFlaggedReplies,
  setReplyStatus,
} from '../repositories/replyRepository.js';
import { createError } from '../middleware/errorHandler.js';

export async function listFlaggedHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const pagination = { take: pageSize, skip: (page - 1) * pageSize };

    const [data, total] = await Promise.all([
      findFlaggedThreads(pagination),
      countFlaggedThreads(),
    ]);

    res.json({ data, meta: { total, page, page_size: pageSize } });
  } catch (err) {
    next(err);
  }
}

export async function moderateThreadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { postId } = req.params as { postId: string };
    const { status } = req.body as { status: 'active' | 'hidden' | 'deleted' };

    try {
      await setThreadStatus(postId, status);
    } catch {
      throw createError('Post not found', 404, 'POST_NOT_FOUND', 'error.post_not_found');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listFlaggedRepliesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const pagination = { take: pageSize, skip: (page - 1) * pageSize };

    const [data, total] = await Promise.all([
      findFlaggedReplies(pagination),
      countFlaggedReplies(),
    ]);

    res.json({ data, meta: { total, page, page_size: pageSize } });
  } catch (err) {
    next(err);
  }
}

export async function moderateReplyHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { replyId } = req.params as { replyId: string };
    const { status } = req.body as { status: 'active' | 'deleted' };

    try {
      await setReplyStatus(replyId, status);
    } catch {
      throw createError('Reply not found', 404, 'REPLY_NOT_FOUND', 'error.reply.not_found');
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
