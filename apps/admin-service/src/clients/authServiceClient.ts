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
  kycStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
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
}

export async function getStats(): Promise<AuthStats> {
  try {
    const res = await client.get<AuthStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service stats unavailable');
    return { total_farmers: 0 };
  }
}
