import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createSupplierProfileSchema } from '../schemas/createSupplierProfile.schema.js';
import { listSupplierProfilesQuerySchema } from '../schemas/listSupplierProfiles.query.schema.js';
import * as supplierProfileController from '../controllers/supplierProfileController.js';

const publicRouter = Router();

publicRouter.get(
  '/',
  validateQuery(listSupplierProfilesQuerySchema),
  supplierProfileController.listSupplierProfiles,
);

publicRouter.get('/:id', supplierProfileController.getSupplierProfile);

const internalRouter = Router();

internalRouter.post(
  '/',
  requireServiceToken,
  validateBody(createSupplierProfileSchema),
  supplierProfileController.createSupplierProfile,
);

export { publicRouter as supplierProfileRouter, internalRouter as internalSupplierProfileRouter };
