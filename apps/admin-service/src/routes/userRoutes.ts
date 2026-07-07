import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { requireAuth, authorize } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { listUsersQuerySchema } from '../schemas/listUsersQuery.schema.js';
import { updateUserStatusSchema } from '../schemas/updateUserStatus.schema.js';
import { createUserSchema } from '../schemas/createUser.schema.js';
import * as userController from '../controllers/userController.js';
import type { AdminRequest } from '../types/index.js';

const router = Router();

const auth = requireAuth as (req: Request, res: Response, next: NextFunction) => void;
const adminOnly = authorize('admin') as (req: Request, res: Response, next: NextFunction) => void;

router.get(
  '/users',
  auth,
  adminOnly,
  validateQuery(listUsersQuerySchema) as RequestHandler,
  (req, res, next) => userController.listUsers(req as AdminRequest, res, next),
);
router.post(
  '/users',
  auth,
  adminOnly,
  validateBody(createUserSchema) as RequestHandler,
  (req, res, next) => userController.createUser(req as AdminRequest, res, next),
);
router.patch('/users/:id/status', auth, adminOnly, validateBody(updateUserStatusSchema) as RequestHandler, (req, res, next) =>
  userController.setUserStatus(req as AdminRequest, res, next),
);
router.patch('/users/:id/verify', auth, adminOnly, (req, res, next) =>
  userController.verifyUser(req as AdminRequest, res, next),
);

export { router as userRouter };
