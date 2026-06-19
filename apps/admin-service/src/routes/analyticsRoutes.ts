import { Router } from 'express';
import type { RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { getSummary } from '../controllers/analyticsController.js';

const router = Router();

const auth = requireAuth as RequestHandler;
const adminOnly = authorize('admin') as RequestHandler;

router.get('/analytics/summary', auth, adminOnly, getSummary);

export { router as analyticsRouter };
