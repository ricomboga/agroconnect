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

export interface UserRow {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: string;
  county: string | null;
  language: string;
  isVerified: boolean;
  isActive: boolean;
  isSuperAdmin?: boolean;
  kycStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
  is_super_admin?: boolean;
  staff_role?: string;
  partner_bank_id?: string | null;
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
    if (query.is_active !== undefined) params.set('is_active', String(query.is_active));
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

export async function setUserStatus(id: string, isActive: boolean): Promise<void> {
  try {
    await client.patch(
      `/internal/admin/users/${id}/status`,
      { is_active: isActive },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'setUserStatus');
  }
}

export async function verifyUser(id: string): Promise<void> {
  try {
    await client.patch(
      `/internal/admin/users/${id}/verify`,
      {},
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'verifyUser');
  }
}

export interface AuthStats {
  total_farmers: number;
  pending_kyc: number;
}

export async function getStats(): Promise<AuthStats> {
  try {
    const res = await client.get<AuthStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service stats unavailable');
    return { total_farmers: 0, pending_kyc: 0 };
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
