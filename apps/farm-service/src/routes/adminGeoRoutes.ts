import { Router, Request, Response, NextFunction } from 'express';
import { authorize } from '@agroconnect/shared';
import { requireAuth } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { validateGpsQuerySchema } from '../schemas/validateGps.query.schema.js';
import { validateGps } from '../controllers/adminGeoController.js';

const router = Router();
const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;

// 'lender' is included so NGO/grant institutions can validate GPS coordinates
// when onboarding a farmer through the NGO portal's farmer-creation wizard
// (mirrors the admin wizard's GPS-validation step) — read-only, no side effects.
router.get('/validate-gps', auth, authorize('admin', 'lender'), validateQuery(validateGpsQuerySchema), validateGps);

export { router as adminGeoRouter };
