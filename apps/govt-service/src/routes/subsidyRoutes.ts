import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { applySubsidySchema } from '../schemas/applySubsidy.schema.js';
import * as subsidyController from '../controllers/subsidyController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// Public — no auth required
router.get('/', (req, res, next) => subsidyController.listPrograms(req, res, next));

// Farmer auth required
router.post(
  '/:programId/apply',
  auth,
  validateBody(applySubsidySchema),
  (req, res, next) => subsidyController.applyForSubsidy(req as AuthenticatedRequest, res, next),
);

router.get(
  '/applications',
  auth,
  (req, res, next) => subsidyController.listApplications(req as AuthenticatedRequest, res, next),
);

export { router as subsidyRouter };
