import { Router } from 'express';
import { requireServiceToken } from '../middleware/requireServiceToken.js';
import {
  listUsersHandler,
  getUserHandler,
  setUserStatusHandler,
  verifyUserHandler,
  resetPinHandler,
  getStatsHandler,
  createUserHandler,
  createSystemUserHandler,
  updateUserHandler,
  deleteUserHandler,
  batchGetUsersHandler,
  listExpertsHandler,
  assignExpertHandler,
  kycQueueHandler,
  getKycHandler,
  decideKycHandler,
  createAuditLogHandler,
  listAuditLogsHandler,
  listRolesHandler,
  createRoleHandler,
  listPermissionsHandler,
  createPermissionHandler,
  attachPermissionToRoleHandler,
  detachPermissionFromRoleHandler,
  assignRoleToUserHandler,
  unassignRoleFromUserHandler,
  getUserRolesHandler,
} from '../controllers/internalAdminController.js';

const router = Router();

router.use(requireServiceToken);

router.get('/users', listUsersHandler);
router.get('/users/batch', batchGetUsersHandler);
router.get('/users/:id', getUserHandler);
router.post('/users', createUserHandler);
router.post('/system-users', createSystemUserHandler);
router.patch('/users/:id', updateUserHandler);
router.patch('/users/:id/status', setUserStatusHandler);
router.patch('/users/:id/verify', verifyUserHandler);
router.patch('/users/:id/reset-pin', resetPinHandler);
router.delete('/users/:id', deleteUserHandler);
router.get('/stats', getStatsHandler);
router.get('/experts', listExpertsHandler);
router.patch('/farmers/:id/expert', assignExpertHandler);
router.get('/kyc', kycQueueHandler);
router.get('/users/:id/kyc', getKycHandler);
router.patch('/users/:id/kyc', decideKycHandler);
router.post('/audit-log', createAuditLogHandler);
router.get('/audit-log', listAuditLogsHandler);

router.get('/roles', listRolesHandler);
router.post('/roles', createRoleHandler);
router.post('/roles/:id/permissions', attachPermissionToRoleHandler);
router.delete('/roles/:id/permissions/:permissionId', detachPermissionFromRoleHandler);
router.get('/permissions', listPermissionsHandler);
router.post('/permissions', createPermissionHandler);
router.get('/users/:id/roles', getUserRolesHandler);
router.post('/users/:id/roles', assignRoleToUserHandler);
router.delete('/users/:id/roles/:roleId', unassignRoleFromUserHandler);

export { router as internalAdminRouter };
