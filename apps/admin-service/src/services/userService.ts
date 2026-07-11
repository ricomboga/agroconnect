import type { KenyaCounty } from '@agroconnect/shared/constants/counties';
import * as authClient from '../clients/authServiceClient.js';
import type { AccountStatus, CreateSystemUserPayload } from '../clients/authServiceClient.js';
import * as auditService from './auditService.js';
import { assertCapability } from '../middleware/staffAccess.js';
import { createError } from '../middleware/errorHandler.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';
import type { CreateUserDto } from '../schemas/createUser.schema.js';
import type { CreateSystemUserDto } from '../schemas/createSystemUser.schema.js';

export interface Requester {
  actor: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
  county?: KenyaCounty;
}

function requireSuperAdmin(requester: Requester): void {
  if (!requester.isSuperAdmin) {
    throw createError('Only a super admin can perform this action', 403, 'FORBIDDEN', 'error.auth.forbidden');
  }
}

export async function listUsers(query: ListUsersQuery, requester: Requester) {
  assertCapability(requester, 'manage_users');
  const scopedQuery =
    requester.staffRole === 'county_admin' && !requester.isSuperAdmin
      ? { ...query, county: requester.county }
      : query;
  return authClient.listUsers(scopedQuery);
}

export async function createUser(dto: CreateUserDto, requester: Requester) {
  assertCapability(requester, 'manage_users');
  if (dto.role === 'admin') requireSuperAdmin(requester);
  const user = await authClient.createUser({ ...dto, createdByUserId: requester.actor });
  await auditService.record({
    actor: requester.actor,
    action: 'create_user',
    category: 'user',
    refId: user.id,
    note: `Created ${dto.staffRole ?? dto.role} account for ${dto.phone}`,
  });
  return user;
}

// Dedicated path for provisioning admin/system (staff) accounts. Only a super admin
// may mint new staff accounts. Any roleIds passed in are assigned immediately.
export async function createSystemUser(dto: CreateSystemUserDto, requester: Requester) {
  requireSuperAdmin(requester);
  const payload: CreateSystemUserPayload = { ...dto, createdByUserId: requester.actor };
  const user = await authClient.createSystemUser(payload);
  await auditService.record({
    actor: requester.actor,
    action: 'create_system_user',
    category: 'user',
    refId: user.id,
    note: `Created ${dto.staffRole} system account for ${dto.phone}`,
  });
  return user;
}

export async function setUserStatus(id: string, status: AccountStatus, requester: Requester): Promise<void> {
  assertCapability(requester, 'manage_users');
  const target = await authClient.getUser(id);
  if (target.role === 'admin') requireSuperAdmin(requester);
  await authClient.setUserStatus(id, status);
  await auditService.record({
    actor: requester.actor,
    action: 'set_user_status',
    category: 'user',
    refId: id,
    note: `Set status to ${status}`,
  });
}

export async function verifyUser(id: string, requester: Requester): Promise<void> {
  assertCapability(requester, 'manage_users');
  await authClient.verifyUser(id, requester.actor);
  await auditService.record({
    actor: requester.actor,
    action: 'verify_user',
    category: 'user',
    refId: id,
    note: 'Verified account (maker-checker)',
  });
}

// --- Roles & permissions -------------------------------------------------

export async function listRoles(requester: Requester) {
  assertCapability(requester, 'manage_users');
  return authClient.listRoles();
}

export async function createRole(name: string, description: string | undefined, requester: Requester) {
  requireSuperAdmin(requester);
  return authClient.createRole(name, description);
}

export async function listPermissions(requester: Requester) {
  assertCapability(requester, 'manage_users');
  return authClient.listPermissions();
}

export async function createPermission(name: string, description: string | undefined, requester: Requester) {
  requireSuperAdmin(requester);
  return authClient.createPermission(name, description);
}

export async function attachPermissionToRole(roleId: string, permissionId: string, requester: Requester) {
  requireSuperAdmin(requester);
  await authClient.attachPermissionToRole(roleId, permissionId);
}

export async function assignRoleToUser(userId: string, roleId: string, requester: Requester) {
  assertCapability(requester, 'manage_users');
  await authClient.assignRoleToUser(userId, roleId, requester.actor);
  await auditService.record({
    actor: requester.actor,
    action: 'assign_role',
    category: 'user',
    refId: userId,
    note: `Assigned role ${roleId}`,
  });
}

export async function unassignRoleFromUser(userId: string, roleId: string, requester: Requester) {
  assertCapability(requester, 'manage_users');
  await authClient.unassignRoleFromUser(userId, roleId);
  await auditService.record({
    actor: requester.actor,
    action: 'unassign_role',
    category: 'user',
    refId: userId,
    note: `Unassigned role ${roleId}`,
  });
}

export async function getUserRoles(userId: string, requester: Requester) {
  assertCapability(requester, 'manage_users');
  return authClient.getUserRoles(userId);
}
