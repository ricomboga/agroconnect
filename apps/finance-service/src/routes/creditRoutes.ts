import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as creditController from '../controllers/creditController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, (req, res, next) =>
  creditController.getCreditScore(req as AuthenticatedRequest, res, next),
);
router.post('/compute', auth, (req, res, next) =>
  creditController.recomputeCreditScore(req as AuthenticatedRequest, res, next),
);

export { router as creditRouter };
