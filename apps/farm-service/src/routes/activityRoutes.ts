import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { createActivitySchema } from '../schemas/createActivity.schema.js';
import { updateActivitySchema } from '../schemas/updateActivity.schema.js';
import * as activityController from '../controllers/activityController.js';
import { AuthenticatedRequest } from '../types/index.js';
import { Request, Response, NextFunction } from 'express';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, (req, res, next) =>
  activityController.listActivities(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createActivitySchema), (req, res, next) =>
  activityController.scheduleActivity(req as AuthenticatedRequest, res, next),
);
router.patch('/:activityId', auth, validateBody(updateActivitySchema), (req, res, next) =>
  activityController.updateActivity(req as AuthenticatedRequest, res, next),
);

export { router as activityRouter };
