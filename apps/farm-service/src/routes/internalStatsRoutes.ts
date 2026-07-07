import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  getStatsHandler,
  getFarmersByCountyHandler,
  getLivestockStatsHandler,
} from '../controllers/internalStatsController.js';

const router = Router();

router.use(requireServiceToken);
router.get('/stats', getStatsHandler);
router.get('/stats/farmers-by-county', getFarmersByCountyHandler);
router.get('/stats/livestock', getLivestockStatsHandler);

export { router as internalStatsRouter };
