import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { listFarmsQuerySchema } from '../schemas/listFarmsQuery.schema.js';
import * as farmsController from '../controllers/farmsController.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get('/farms', auth, adminOnly, validateQuery(listFarmsQuerySchema) as RequestHandler, farmsController.listFarms);

export { router as farmsRouter };
