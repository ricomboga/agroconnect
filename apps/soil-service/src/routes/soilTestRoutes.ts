import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createSoilTestSchema } from '../schemas/createSoilTest.schema.js';
import { listSoilTestsQuerySchema } from '../schemas/listSoilTests.query.schema.js';
import * as soilTestController from '../controllers/soilTestController.js';
import { AuthenticatedRequest } from '../types/index.js';

const router = Router({ mergeParams: true });
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.post('/', auth, validateBody(createSoilTestSchema), (req, res, next) =>
  soilTestController.createSoilTest(req as AuthenticatedRequest, res, next),
);

router.get('/', auth, validateQuery(listSoilTestsQuerySchema), (req, res, next) =>
  soilTestController.listSoilTests(req as AuthenticatedRequest, res, next),
);

router.get('/recommendation', auth, (req, res, next) =>
  soilTestController.getRecommendation(req as AuthenticatedRequest, res, next),
);

export { router as soilTestRouter };
