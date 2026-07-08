import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  listUsersHandler,
  getUserHandler,
  setUserStatusHandler,
  verifyUserHandler,
  getStatsHandler,
  createUserHandler,
  deleteUserHandler,
  batchGetUsersHandler,
  listExpertsHandler,
  assignExpertHandler,
  kycQueueHandler,
  getKycHandler,
  decideKycHandler,
  createAuditLogHandler,
  listAuditLogsHandler,
} from '../controllers/internalAdminController.js';

const router = Router();

router.use(requireServiceToken);

router.get('/users', listUsersHandler);
router.get('/users/batch', batchGetUsersHandler);
router.get('/users/:id', getUserHandler);
router.post('/users', createUserHandler);
router.get('/users/:id', getUserHandler);
router.patch('/users/:id/status', setUserStatusHandler);
router.patch('/users/:id/verify', verifyUserHandler);
router.delete('/users/:id', deleteUserHandler);
router.get('/stats', getStatsHandler);
router.get('/experts', listExpertsHandler);
router.patch('/farmers/:id/expert', assignExpertHandler);
router.get('/kyc', kycQueueHandler);
router.get('/users/:id/kyc', getKycHandler);
router.patch('/users/:id/kyc', decideKycHandler);
router.post('/audit-log', createAuditLogHandler);
router.get('/audit-log', listAuditLogsHandler);

export { router as internalAdminRouter };
