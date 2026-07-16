import axios from 'axios';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';

const BASE_URL = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:3008';
const SERVICE_TOKEN = process.env['INTERNAL_SERVICE_SECRET'] ?? '';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

export interface UserProfile {
  fullName: string;
  phone: string;
  idNumber: string | null;
  county: string | null;
  subCounty: string | null;
}

export async function getUserProfiles(userIds: string[]): Promise<Record<string, UserProfile>> {
  if (userIds.length === 0) return {};
  try {
    const res = await client.get<{ data: Record<string, UserProfile> }>('/internal/admin/users/batch', {
      params: { ids: userIds.join(',') },
      headers: { 'x-service-token': SERVICE_TOKEN },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'auth-service call failed while fetching user profiles');
    throw createError('auth-service unavailable while fetching user profiles', 502, 'AUTH_SERVICE_ERROR', 'error.auth_service_unavailable');
  }
}
