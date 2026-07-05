import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createRegistrationSchema } from '../schemas/createRegistration.schema.js';
import { updateRegistrationStatusSchema } from '../schemas/updateRegistrationStatus.schema.js';
import { listRegistrationsQuerySchema } from '../schemas/listRegistrations.schema.js';
import * as registrationController from '../controllers/registrationController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const officerOnly = authorize('govt_officer', 'admin') as (req: Request, res: Response, next: NextFunction) => void;

router.post(
  '/',
  auth,
  validateBody(createRegistrationSchema),
  (req, res, next) => registrationController.submitRegistration(req as AuthenticatedRequest, res, next),
);

router.get(
  '/',
  auth,
  validateQuery(listRegistrationsQuerySchema),
  (req, res, next) => registrationController.listRegistrations(req as AuthenticatedRequest, res, next),
);

router.get(
  '/:registrationId',
  auth,
  (req, res, next) => registrationController.getRegistration(req as AuthenticatedRequest, res, next),
);

router.patch(
  '/:registrationId/status',
  auth,
  officerOnly,
  validateBody(updateRegistrationStatusSchema),
  (req, res, next) => registrationController.updateStatus(req as AuthenticatedRequest, res, next),
);

export { router as registrationRouter };
