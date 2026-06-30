import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createActivitySchema } from '../schemas/createActivity.schema.js';
import { updateActivitySchema } from '../schemas/updateActivity.schema.js';
import { listActivitiesQuerySchema } from '../schemas/listActivities.query.schema.js';
import * as activityController from '../controllers/activityController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/', auth, validateQuery(listActivitiesQuerySchema), (req, res, next) =>
  activityController.listActivities(req as AuthenticatedRequest, res, next),
);
router.post('/', auth, validateBody(createActivitySchema), (req, res, next) =>
  activityController.scheduleActivity(req as AuthenticatedRequest, res, next),
);
router.get('/:activityId', auth, (req, res, next) =>
  activityController.getActivity(req as AuthenticatedRequest, res, next),
);
router.patch('/:activityId', auth, validateBody(updateActivitySchema), (req, res, next) =>
  activityController.updateActivity(req as AuthenticatedRequest, res, next),
);

export { router as activityRouter };
