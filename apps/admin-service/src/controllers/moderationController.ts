import type { Response, NextFunction, RequestHandler } from 'express';
import type { AdminRequest } from '../types/index.js';
import * as moderationService from '../services/moderationService.js';
import type { UpdateModerationDto } from '../schemas/updateModeration.schema.js';

export const listFlagged: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query['page_size'] ?? '20'), 10) || 20));
    const result = await moderationService.listFlagged(page, pageSize);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const moderatePost = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { postId } = req.params as { postId: string };
    const { status } = req.body as UpdateModerationDto;
    await moderationService.moderatePost(postId, status, req.user.phone);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
