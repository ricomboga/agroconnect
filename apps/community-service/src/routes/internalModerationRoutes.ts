import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  listFlaggedHandler,
  moderateThreadHandler,
  listFlaggedRepliesHandler,
  moderateReplyHandler,
} from '../controllers/internalModerationController.js';

const router = Router();

router.use(requireServiceToken);

router.get('/moderation/threads', listFlaggedHandler);
router.patch('/moderation/threads/:postId', moderateThreadHandler);

router.get('/moderation/replies', listFlaggedRepliesHandler);
router.patch('/moderation/replies/:replyId', moderateReplyHandler);

// Legacy alias kept for backwards compat
router.get('/moderation', listFlaggedHandler);
router.patch('/moderation/:postId', moderateThreadHandler);

export { router as internalModerationRouter };
