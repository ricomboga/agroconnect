import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createExpertSchema } from '../schemas/createExpert.schema.js';
import { updateExpertSchema } from '../schemas/updateExpert.schema.js';
import { listExpertsQuerySchema } from '../schemas/listExperts.query.schema.js';
import * as expertController from '../controllers/expertController.js';

export const expertRouter = Router();

expertRouter.get('/', validateQuery(listExpertsQuerySchema), expertController.listExperts);

// Registered before '/:id' so 'by-user' isn't swallowed as an :id value.
expertRouter.get('/by-user/:userId', requireServiceToken, expertController.getExpertByUserId);
expertRouter.get('/:id', expertController.getExpert);

// Expert creation/edits restricted to internal callers (admin panel / seed scripts)
expertRouter.post(
  '/',
  requireServiceToken,
  validateBody(createExpertSchema),
  expertController.createExpert,
);
expertRouter.patch(
  '/:id',
  requireServiceToken,
  validateBody(updateExpertSchema),
  expertController.updateExpert,
);
