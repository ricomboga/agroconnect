import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { listNotificationsQuerySchema } from '../schemas/listNotifications.query.schema.js';
import * as notificationController from '../controllers/notificationController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, validateQuery(listNotificationsQuerySchema), (req, res, next) =>
  notificationController.listNotifications(req as AuthenticatedRequest, res, next),
);

router.patch('/:id/read', auth, (req, res, next) =>
  notificationController.markRead(req as AuthenticatedRequest, res, next),
);

export { router as notificationRouter };
