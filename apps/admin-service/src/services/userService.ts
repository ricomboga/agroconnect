import * as authClient from '../clients/authServiceClient.js';
import * as auditService from './auditService.js';
import { assertCapability } from '../middleware/staffAccess.js';
import { createError } from '../middleware/errorHandler.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';
import type { CreateUserDto } from '../schemas/createUser.schema.js';

export interface Requester {
  actor: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
  county?: string;
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
  requireSuperAdmin(requester);
  const user = await authClient.createUser(dto);
  await auditService.record({
    actor: requester.actor,
    action: 'create_staff_user',
    category: 'user',
    refId: user.id,
    note: `Created ${dto.staffRole ?? 'admin'} account for ${dto.phone}`,
  });
  return user;
}

export async function setUserStatus(id: string, isActive: boolean, requester: Requester): Promise<void> {
  assertCapability(requester, 'manage_users');
  const target = await authClient.getUser(id);
  if (target.role === 'admin') requireSuperAdmin(requester);
  await authClient.setUserStatus(id, isActive);
}

export async function verifyUser(id: string, requester: Requester): Promise<void> {
  assertCapability(requester, 'manage_users');
  await authClient.verifyUser(id);
}
