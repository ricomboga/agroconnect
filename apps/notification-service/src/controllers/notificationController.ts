import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import * as notificationRepo from '../repositories/notificationRepository.js';
import { parsePaginationParams } from '../utils/pagination.js';
import { createError } from '../middleware/errorHandler.js';

export async function listNotifications(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = parsePaginationParams(req.query);
    const unreadOnly = req.query['unread_only'] === 'true';
    const { notifications, total, unreadCount } = await notificationRepo.findNotificationsByUser(
      req.user.id,
      { ...pagination, unreadOnly },
    );
    res.json({
      data: notifications,
      meta: {
        total,
        unread_count: unreadCount,
        page: Number(req.query['page'] ?? 1),
        page_size: pagination.take,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function markRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const updated = await notificationRepo.markNotificationRead(id, req.user.id);
    if (!updated) {
      throw createError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND', 'error.notification.not_found');
    }
    res.json({ data: { id, read: true } });
  } catch (err) {
    next(err);
  }
}
