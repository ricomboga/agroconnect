import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { updateModerationSchema } from '../schemas/updateModeration.schema.js';
import * as moderationController from '../controllers/moderationController.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/moderation', auth, adminOnly, moderationController.listFlagged);
router.patch('/moderation/:postId', auth, adminOnly, validateBody(updateModerationSchema) as RequestHandler, (req, res, next) =>
  moderationController.moderatePost(req as AdminRequest, res, next),
);

export { router as moderationRouter };
