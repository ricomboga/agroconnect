import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createThreadSchema } from '../schemas/createThread.schema.js';
import { updateThreadSchema } from '../schemas/updateThread.schema.js';
import { listThreadsQuerySchema } from '../schemas/listThreads.query.schema.js';
import * as threadController from '../controllers/threadController.js';
import { replyRouter } from './replyRoutes.js';
import { AuthenticatedRequest } from '../types/index.js';

export const threadRouter = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// Public reads
threadRouter.get('/', validateQuery(listThreadsQuerySchema), threadController.listThreads);
threadRouter.get('/:id', threadController.getThread);

// Authenticated writes
threadRouter.post(
  '/',
  auth,
  validateBody(createThreadSchema),
  (req, res, next) => threadController.createThread(req as AuthenticatedRequest, res, next),
);
threadRouter.patch(
  '/:id',
  auth,
  validateBody(updateThreadSchema),
  (req, res, next) => threadController.updateThread(req as AuthenticatedRequest, res, next),
);
threadRouter.delete(
  '/:id',
  auth,
  (req, res, next) => threadController.deleteThread(req as AuthenticatedRequest, res, next),
);
threadRouter.post(
  '/:id/upvote',
  auth,
  (req, res, next) => threadController.upvoteThread(req as AuthenticatedRequest, res, next),
);

// Nested reply routes (GET list — public; POST — auth handled inside replyRouter)
threadRouter.use('/:id/replies', replyRouter);
