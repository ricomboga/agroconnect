import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createExpertSchema } from '../schemas/createExpert.schema.js';
import { listExpertsQuerySchema } from '../schemas/listExperts.query.schema.js';
import * as expertController from '../controllers/expertController.js';

export const expertRouter = Router();

expertRouter.get('/', validateQuery(listExpertsQuerySchema), expertController.listExperts);
expertRouter.get('/:id', expertController.getExpert);

// Expert creation restricted to internal callers (admin panel / seed scripts)
expertRouter.post(
  '/',
  requireServiceToken,
  validateBody(createExpertSchema),
  expertController.createExpert,
);
