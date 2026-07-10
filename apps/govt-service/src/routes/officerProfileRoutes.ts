import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody } from '../middleware/validate.js';
import { createOfficerProfileSchema } from '../schemas/createOfficerProfile.schema.js';
import { updateOfficerProfileSchema } from '../schemas/updateOfficerProfile.schema.js';
import * as officerProfileController from '../controllers/officerProfileController.js';

export const officerProfileRouter = Router();

// Officer-profile directory/CRUD is admin-panel-only, gated by the shared service token.
officerProfileRouter.get('/', requireServiceToken, officerProfileController.listOfficerProfiles);

// Registered before '/:id' so 'by-user' isn't swallowed as an :id value.
officerProfileRouter.get('/by-user/:userId', requireServiceToken, officerProfileController.getOfficerProfileByUserId);
officerProfileRouter.get('/:id', requireServiceToken, officerProfileController.getOfficerProfile);

officerProfileRouter.post(
  '/',
  requireServiceToken,
  validateBody(createOfficerProfileSchema),
  officerProfileController.createOfficerProfile,
);
officerProfileRouter.patch(
  '/:id',
  requireServiceToken,
  validateBody(updateOfficerProfileSchema),
  officerProfileController.updateOfficerProfile,
);
