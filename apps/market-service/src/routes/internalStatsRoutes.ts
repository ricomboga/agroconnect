import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { getStatsHandler } from '../controllers/internalStatsController.js';

const router = Router();

router.use(requireServiceToken);
router.get('/stats', getStatsHandler);

export { router as internalStatsRouter };
