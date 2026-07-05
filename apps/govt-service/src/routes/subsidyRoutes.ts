import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { applySubsidySchema } from '../schemas/applySubsidy.schema.js';
import { createSubsidyProgramSchema } from '../schemas/createSubsidyProgram.schema.js';
import { updateSubsidyApplicationStatusSchema } from '../schemas/updateSubsidyApplicationStatus.schema.js';
import { listSubsidyApplicationsQuerySchema } from '../schemas/listSubsidyApplications.schema.js';
import { bulkApproveApplicationsSchema } from '../schemas/bulkApproveApplications.schema.js';
import * as subsidyController from '../controllers/subsidyController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const officerOnly = authorize('govt_officer', 'admin') as (req: Request, res: Response, next: NextFunction) => void;

// Public — no auth required
router.get('/', (req, res, next) => subsidyController.listPrograms(req, res, next));

// Officer/admin only — all programs incl. inactive/draft, with per-program stats
router.get('/admin', auth, officerOnly, (req, res, next) =>
  subsidyController.listProgramsAdmin(req as AuthenticatedRequest, res, next),
);

// Officer/admin only — create a new subsidy program
router.post(
  '/',
  auth,
  officerOnly,
  validateBody(createSubsidyProgramSchema),
  (req, res, next) => subsidyController.createProgram(req as AuthenticatedRequest, res, next),
);

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
  validateQuery(listSubsidyApplicationsQuerySchema),
  (req, res, next) => subsidyController.listApplications(req as AuthenticatedRequest, res, next),
);

// Officer/admin only — approve/reject a subsidy application
router.patch(
  '/applications/:applicationId/status',
  auth,
  officerOnly,
  validateBody(updateSubsidyApplicationStatusSchema),
  (req, res, next) => subsidyController.updateApplicationStatus(req as AuthenticatedRequest, res, next),
);

// Officer/admin only — bulk-approve a set of subsidy applications
router.patch(
  '/applications/bulk',
  auth,
  officerOnly,
  validateBody(bulkApproveApplicationsSchema),
  (req, res, next) => subsidyController.bulkApproveApplications(req as AuthenticatedRequest, res, next),
);

export { router as subsidyRouter };
