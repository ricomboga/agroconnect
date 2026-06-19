import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createPlotSchema } from '../schemas/createPlot.schema.js';
import { paginationQuerySchema } from '@agroconnect/shared';
import * as plotController from '../controllers/plotController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, validateQuery(paginationQuerySchema), (req, res, next) =>
  plotController.listPlots(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createPlotSchema), (req, res, next) =>
  plotController.createPlot(req as AuthenticatedRequest, res, next),
);

export { router as plotRouter };
