import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { getFarmerProductionSummaryHandler } from '../controllers/internalProductionController.js';

const router = Router();

router.use(requireServiceToken);
router.get('/:farmerId', getFarmerProductionSummaryHandler);

export { router as internalProductionRouter };
