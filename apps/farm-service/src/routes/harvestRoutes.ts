import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createHarvestSchema } from '../schemas/createHarvest.schema.js';
import * as harvestController from '../controllers/harvestController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, (req, res, next) =>
  harvestController.listHarvests(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createHarvestSchema), (req, res, next) =>
  harvestController.recordHarvest(req as AuthenticatedRequest, res, next),
);

export { router as harvestRouter };
