import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createLicenseSchema } from '../schemas/createLicense.schema.js';
import { updateLicenseStatusSchema } from '../schemas/updateLicenseStatus.schema.js';
import * as licenseController from '../controllers/licenseController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const officerOnly = authorize('govt_officer', 'admin') as (req: Request, res: Response, next: NextFunction) => void;

router.post(
  '/',
  auth,
  validateBody(createLicenseSchema),
  (req, res, next) => licenseController.applyForLicense(req as AuthenticatedRequest, res, next),
);

router.get(
  '/',
  auth,
  (req, res, next) => licenseController.listLicenses(req as AuthenticatedRequest, res, next),
);

router.get(
  '/:licenseId',
  auth,
  (req, res, next) => licenseController.getLicense(req as AuthenticatedRequest, res, next),
);

router.patch(
  '/:licenseId/status',
  auth,
  officerOnly,
  validateBody(updateLicenseStatusSchema),
  (req, res, next) => licenseController.updateStatus(req as AuthenticatedRequest, res, next),
);

export { router as licenseRouter };
