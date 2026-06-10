import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createPlotSchema } from '../schemas/createPlot.schema.js';
import * as plotController from '../controllers/plotController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, (req, res, next) =>
  plotController.listPlots(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createPlotSchema), (req, res, next) =>
  plotController.createPlot(req as AuthenticatedRequest, res, next),
);

export { router as plotRouter };
