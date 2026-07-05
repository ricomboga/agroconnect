import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import * as auditController from '../controllers/auditController.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/audit-log', auth, adminOnly, auditController.listAuditLog);

export { router as auditRouter };
