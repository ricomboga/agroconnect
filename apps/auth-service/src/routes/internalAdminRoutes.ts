import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  listUsersHandler,
  setUserStatusHandler,
  verifyUserHandler,
  getStatsHandler,
  createUserHandler,
  deleteUserHandler,
} from '../controllers/internalAdminController.js';

const router = Router();

router.use(requireServiceToken);

router.get('/users', listUsersHandler);
router.post('/users', createUserHandler);
router.patch('/users/:id/status', setUserStatusHandler);
router.patch('/users/:id/verify', verifyUserHandler);
router.delete('/users/:id', deleteUserHandler);
router.get('/stats', getStatsHandler);

export { router as internalAdminRouter };
