import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { getStatsHandler, getLoansByInstitutionHandler } from '../controllers/internalStatsController.js';

const router = Router();

router.use(requireServiceToken);
router.get('/stats', getStatsHandler);
router.get('/stats/loans-by-institution', getLoansByInstitutionHandler);

export { router as internalStatsRouter };
