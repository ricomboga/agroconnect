import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createFarmSchema } from '../schemas/createFarm.schema.js';
import { updateFarmSchema } from '../schemas/updateFarm.schema.js';
import { farmSummaryQuerySchema } from '../schemas/farmSummary.query.schema.js';
import { paginationQuerySchema } from '@agroconnect/shared';
import * as farmController from '../controllers/farmController.js';
import * as summaryController from '../controllers/summaryController.js';
import * as reportController from '../controllers/reportController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.post('/', auth, validateBody(createFarmSchema), (req, res, next) =>
  farmController.createFarm(req as AuthenticatedRequest, res, next),
);
router.get('/', auth, validateQuery(paginationQuerySchema), (req, res, next) =>
  farmController.listFarms(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId', auth, (req, res, next) =>
  farmController.getFarm(req as AuthenticatedRequest, res, next),
);
router.patch('/:farmId', auth, validateBody(updateFarmSchema), (req, res, next) =>
  farmController.updateFarm(req as AuthenticatedRequest, res, next),
);
router.delete('/:farmId', auth, (req, res, next) =>
  farmController.deleteFarm(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/report', auth, (req, res, next) =>
  reportController.generateReport(req as AuthenticatedRequest, res, next),
);
router.get('/:farmId/summary', auth, validateQuery(farmSummaryQuerySchema), (req, res, next) =>
  summaryController.getFarmSummary(req as AuthenticatedRequest, res, next),
);

export { router as farmRouter };
