import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  getFarmerProductionSummaryHandler,
  getFarmProfilesByOwnersHandler,
  getFarmProfilesByCountiesHandler,
} from '../controllers/internalProductionController.js';

const router = Router();

router.use(requireServiceToken);
router.get('/by-owners', getFarmProfilesByOwnersHandler);
router.get('/by-counties', getFarmProfilesByCountiesHandler);
router.get('/:farmerId', getFarmerProductionSummaryHandler);

export { router as internalProductionRouter };
