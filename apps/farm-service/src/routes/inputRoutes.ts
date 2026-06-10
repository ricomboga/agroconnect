import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createInputSchema } from '../schemas/createInput.schema.js';
import * as inputController from '../controllers/inputController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, (req, res, next) =>
  inputController.listInputs(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createInputSchema), (req, res, next) =>
  inputController.recordInput(req as AuthenticatedRequest, res, next),
);

export { router as inputRouter };
