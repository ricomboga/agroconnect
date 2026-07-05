import { Router, Request, Response, NextFunction } from 'express';
import { authorize } from '@agroconnect/shared';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { validateGpsQuerySchema } from '../schemas/validateGps.query.schema.js';
import { validateGps } from '../controllers/adminGeoController.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

router.get('/validate-gps', auth, authorize('admin'), validateQuery(validateGpsQuerySchema), validateGps);

export { router as adminGeoRouter };
