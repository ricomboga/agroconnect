import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { bulkApproveApplicationsSchema } from '../schemas/bulkApproveApplications.schema.js';
import * as programsController from '../controllers/programsController.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/programs', auth, adminOnly, (req, res, next) =>
  programsController.listPrograms(req as AdminRequest, res, next),
);
router.get('/programs/:id/applications', auth, adminOnly, (req, res, next) =>
  programsController.listApplications(req as AdminRequest, res, next),
);
router.patch(
  '/programs/applications/bulk',
  auth,
  adminOnly,
  validateBody(bulkApproveApplicationsSchema) as RequestHandler,
  (req, res, next) => programsController.bulkApprove(req as AdminRequest, res, next),
);

export { router as programsRouter };
