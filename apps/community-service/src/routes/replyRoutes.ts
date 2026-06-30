import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createReplySchema } from '../schemas/createReply.schema.js';
import * as replyController from '../controllers/replyController.js';
import { AuthenticatedRequest } from '../types/index.js';

// Mounted at /api/v1/community/threads/:id/replies
export const replyRouter = Router({ mergeParams: true });

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

replyRouter.get('/', replyController.listReplies);
replyRouter.post(
  '/',
  auth,
  validateBody(createReplySchema),
  (req, res, next) => replyController.createReply(req as AuthenticatedRequest, res, next),
);

// Standalone reply routes — mounted at /api/v1/community/replies
export const standaloneReplyRouter = Router();

standaloneReplyRouter.post(
  '/:replyId/upvote',
  auth,
  (req, res, next) => replyController.upvoteReply(req as AuthenticatedRequest, res, next),
);
standaloneReplyRouter.post(
  '/:replyId/verify',
  auth,
  (req, res, next) => replyController.verifyReply(req as AuthenticatedRequest, res, next),
);
standaloneReplyRouter.post(
  '/:replyId/report',
  auth,
  (req, res, next) => replyController.reportReply(req as AuthenticatedRequest, res, next),
);
standaloneReplyRouter.delete(
  '/:replyId',
  auth,
  (req, res, next) => replyController.deleteReply(req as AuthenticatedRequest, res, next),
);
