import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { countySummaryQuerySchema } from '../schemas/countySummaryQuery.schema.js';
import * as reportController from '../controllers/reportController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const officerOnly = authorize('govt_officer', 'admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get(
  '/county-summary',
  auth,
  officerOnly,
  validateQuery(countySummaryQuerySchema),
  (req, res, next) => reportController.countySummary(req as AuthenticatedRequest, res, next),
);

export { router as reportRouter };
