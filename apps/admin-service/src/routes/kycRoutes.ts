import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { kycDecisionSchema } from '../schemas/kycDecision.schema.js';
import * as kycController from '../controllers/kycController.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/kyc', auth, adminOnly, (req, res, next) =>
  kycController.listQueue(req as AdminRequest, res, next),
);
router.get('/kyc/:userId', auth, adminOnly, (req, res, next) =>
  kycController.getKyc(req as AdminRequest, res, next),
);
router.patch('/kyc/:userId', auth, adminOnly, validateBody(kycDecisionSchema) as RequestHandler, (req, res, next) =>
  kycController.decideKyc(req as AdminRequest, res, next),
);

export { router as kycRouter };
