import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { listFlaggedHandler, moderatePostHandler } from '../controllers/internalModerationController.js';

const router = Router();

router.use(requireServiceToken);

router.get('/moderation', listFlaggedHandler);
router.patch('/moderation/:postId', moderatePostHandler);

export { router as internalModerationRouter };
