import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { getSummary } from '../controllers/analyticsController.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/analytics/summary', auth, adminOnly, (req, res, next) =>
  getSummary(req as AdminRequest, res, next),
);

export { router as analyticsRouter };
