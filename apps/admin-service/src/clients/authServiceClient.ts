import axios, { AxiosError } from 'axios';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';
import type { ListUsersQuery } from '../schemas/listUsersQuery.schema.js';

const BASE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3008';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function serviceToken(): string {
  return process.env['INTERNAL_SERVICE_SECRET'] ?? '';
}

function handleError(err: unknown, context: string): never {
  if (err instanceof AxiosError && err.response) {
    const status = err.response.status;
    if (status === 404) {
      throw createError('User not found', 404, 'USER_NOT_FOUND', 'error.user_not_found');
    }
    if (status === 409) {
      throw createError('Phone already registered', 409, 'PHONE_TAKEN', 'error.phone_taken');
    }
  }
  logger.warn({ err, context }, 'auth-service call failed');
  throw createError(
    `auth-service unavailable (${context})`,
    502,
    'AUTH_SERVICE_ERROR',
    'error.auth_service_unavailable',
  );
}

export type AccountStatus = 'pending_verification' | 'verified' | 'active' | 'inactive' | 'disabled' | 'deleted';

export interface UserRow {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: string;
  county: string | null;
  language: string;
  status: AccountStatus;
  isVerified: boolean;
  isActive: boolean;
  isSuperAdmin?: boolean;
  kycStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  is_super_admin?: boolean;
  staff_role?: string;
  partner_bank_id?: string | null;
  created_by_user_id?: string | null;
  verified_by_user_id?: string | null;
  supervisor_id?: string | null;
}

export type UserDetail = UserRow;

export interface CreateUserPayload {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: string;
  county?: string;
  language?: string;
  isSuperAdmin?: boolean;
  staffRole?: string;
  supervisorId?: string;
  createdByUserId: string;
}

export interface CreateSystemUserPayload {
  phone: string;
  email?: string;
  password: string;
  fullName: string;
  role: 'admin' | 'govt_officer';
  staffRole: 'admin' | 'county_admin' | 'moderator';
  isSuperAdmin?: boolean;
  county?: string;
  language?: string;
  createdByUserId: string;
  roleIds?: string[];
}

export interface UsersPage {
  data: UserRow[];
  meta: { total: number; page: number; page_size: number };
}

export async function listUsers(query: ListUsersQuery): Promise<UsersPage> {
  try {
    const params = new URLSearchParams();
    if (query.role) params.set('role', query.role);
    if (query.county) params.set('county', query.county);
    if (query.kyc_status) params.set('kyc_status', query.kyc_status);
    if (query.is_active !== undefined) params.set('status', query.is_active ? 'active' : 'inactive');
    params.set('page', String(query.page));
    params.set('page_size', String(query.page_size));

    const res = await client.get<UsersPage>(`/internal/admin/users?${params.toString()}`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    handleError(err, 'listUsers');
  }
}

export async function getUser(id: string): Promise<UserDetail> {
  try {
    const res = await client.get<{ data: UserDetail }>(`/internal/admin/users/${id}`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'getUser');
  }
}

export async function createUser(payload: CreateUserPayload): Promise<UserDetail> {
  try {
    const res = await client.post<{ data: UserDetail }>('/internal/admin/users', payload, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'createUser');
  }
}

export async function createSystemUser(payload: CreateSystemUserPayload): Promise<UserDetail> {
  try {
    const res = await client.post<{ data: UserDetail }>('/internal/admin/system-users', payload, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'createSystemUser');
  }
}

export async function setUserStatus(id: string, status: AccountStatus): Promise<void> {
  try {
    await client.patch(
      `/internal/admin/users/${id}/status`,
      { status },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'setUserStatus');
  }
}

export async function verifyUser(id: string, verifierId: string): Promise<void> {
  try {
    await client.patch(
      `/internal/admin/users/${id}/verify`,
      { verifierId },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    if (err instanceof AxiosError && err.response) {
      const code = (err.response.data as { error_code?: string } | undefined)?.error_code;
      if (code === 'SELF_VERIFICATION_FORBIDDEN') {
        throw createError(
          'The admin who created this account cannot verify it',
          403,
          'SELF_VERIFICATION_FORBIDDEN',
          'error.user.self_verification_forbidden',
        );
      }
      if (code === 'SUPERVISOR_APPROVAL_REQUIRED') {
        throw createError(
          "Only the creating field agent's supervisor can verify this account",
          403,
          'SUPERVISOR_APPROVAL_REQUIRED',
          'error.user.supervisor_approval_required',
        );
      }
    }
    handleError(err, 'verifyUser');
  }
}

export interface RoleRow {
  id: string;
  name: string;
  description: string | null;
}

export interface PermissionRow {
  id: string;
  name: string;
  description: string | null;
}

export async function listRoles(): Promise<RoleRow[]> {
  try {
    const res = await client.get<{ data: RoleRow[] }>('/internal/admin/roles', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'listRoles');
  }
}

export async function createRole(name: string, description?: string): Promise<RoleRow> {
  try {
    const res = await client.post<{ data: RoleRow }>(
      '/internal/admin/roles',
      { name, description },
      { headers: { 'x-service-token': serviceToken() } },
    );
    return res.data.data;
  } catch (err) {
    handleError(err, 'createRole');
  }
}

export async function listPermissions(): Promise<PermissionRow[]> {
  try {
    const res = await client.get<{ data: PermissionRow[] }>('/internal/admin/permissions', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'listPermissions');
  }
}

export async function createPermission(name: string, description?: string): Promise<PermissionRow> {
  try {
    const res = await client.post<{ data: PermissionRow }>(
      '/internal/admin/permissions',
      { name, description },
      { headers: { 'x-service-token': serviceToken() } },
    );
    return res.data.data;
  } catch (err) {
    handleError(err, 'createPermission');
  }
}

export async function attachPermissionToRole(roleId: string, permissionId: string): Promise<void> {
  try {
    await client.post(
      `/internal/admin/roles/${roleId}/permissions`,
      { permissionId },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'attachPermissionToRole');
  }
}

export async function assignRoleToUser(userId: string, roleId: string, assignedByUserId: string): Promise<void> {
  try {
    await client.post(
      `/internal/admin/users/${userId}/roles`,
      { roleId, assignedByUserId },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'assignRoleToUser');
  }
}

export async function unassignRoleFromUser(userId: string, roleId: string): Promise<void> {
  try {
    await client.delete(`/internal/admin/users/${userId}/roles/${roleId}`, {
      headers: { 'x-service-token': serviceToken() },
    });
  } catch (err) {
    handleError(err, 'unassignRoleFromUser');
  }
}

export interface UserRolesResponse {
  roles: Array<{ role_id: string; role_name: string; permissions: string[]; assigned_at: string }>;
  permissions: string[];
}

export async function getUserRoles(userId: string): Promise<UserRolesResponse> {
  try {
    const res = await client.get<{ data: UserRolesResponse }>(`/internal/admin/users/${userId}/roles`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'getUserRoles');
  }
}

export interface AuthStats {
  total_farmers: number;
  pending_kyc: number;
  kyc_breakdown: Array<{ status: string; count: number }>;
  weekly_registrations: Array<{ date: string; count: number }>;
}

export async function getStats(): Promise<AuthStats> {
  try {
    const res = await client.get<AuthStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service stats unavailable');
    return { total_farmers: 0, pending_kyc: 0, kyc_breakdown: [], weekly_registrations: [] };
  }
}

export interface BatchUserRow {
  fullName: string;
  phone: string;
}

export async function batchGetUsers(ids: string[]): Promise<Record<string, BatchUserRow>> {
  if (ids.length === 0) return {};
  try {
    const res = await client.get<{ data: Record<string, BatchUserRow> }>(
      `/internal/admin/users/batch?ids=${ids.join(',')}`,
      { headers: { 'x-service-token': serviceToken() } },
    );
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service batchGetUsers unavailable');
    return {};
  }
}

export interface KycQueueRow {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  county: string;
  kyc_status: string;
  submitted_at: string;
}

export async function getKycQueue(filter: { role?: string; county?: string }): Promise<KycQueueRow[]> {
  try {
    const params = new URLSearchParams();
    if (filter.role) params.set('role', filter.role);
    if (filter.county) params.set('county', filter.county);
    const res = await client.get<{ data: KycQueueRow[] }>(`/internal/admin/kyc?${params.toString()}`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'getKycQueue');
  }
}

export async function getKyc(userId: string) {
  try {
    const res = await client.get(`/internal/admin/users/${userId}/kyc`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'getKyc');
  }
}

export interface KycDecisionPayload {
  decision: 'approved' | 'rejected' | 'more_info';
  reason: string;
  documentRequested?: string;
  actor: string;
}

export async function decideKyc(userId: string, payload: KycDecisionPayload) {
  try {
    const res = await client.patch(`/internal/admin/users/${userId}/kyc`, payload, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    handleError(err, 'decideKyc');
  }
}

export interface CreateAuditLogPayload {
  actor: string;
  action: string;
  category: string;
  refId?: string;
  note?: string;
}

export async function createAuditLog(payload: CreateAuditLogPayload): Promise<void> {
  try {
    await client.post('/internal/admin/audit-log', payload, {
      headers: { 'x-service-token': serviceToken() },
    });
  } catch (err) {
    logger.warn({ err }, 'auth-service createAuditLog failed — action still applied, log entry lost');
  }
}

export interface AuditLogRow {
  id: string;
  actor: string;
  action: string;
  category: string;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export async function listAuditLogs(page: number, pageSize: number): Promise<{
  data: AuditLogRow[];
  meta: { total: number; page: number; page_size: number };
}> {
  try {
    const res = await client.get(`/internal/admin/audit-log?page=${page}&page_size=${pageSize}`, {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service listAuditLogs unavailable');
    return { data: [], meta: { total: 0, page, page_size: pageSize } };
  }
}
