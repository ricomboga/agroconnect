import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createHarvestSchema } from '../schemas/createHarvest.schema.js';
import { updateHarvestSchema } from '../schemas/updateHarvest.schema.js';
import { paginationQuerySchema } from '@agroconnect/shared';
import * as harvestController from '../controllers/harvestController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, validateQuery(paginationQuerySchema), (req, res, next) =>
  harvestController.listHarvests(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createHarvestSchema), (req, res, next) =>
  harvestController.recordHarvest(req as AuthenticatedRequest, res, next),
);
router.patch('/:harvestId', auth, validateBody(updateHarvestSchema), (req, res, next) =>
  harvestController.updateHarvest(req as AuthenticatedRequest, res, next),
);
router.delete('/:harvestId', auth, (req, res, next) =>
  harvestController.deleteHarvest(req as AuthenticatedRequest, res, next),
);

export { router as harvestRouter };
