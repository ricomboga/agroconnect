import axios, { AxiosError } from 'axios';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';

const BASE_URL = process.env['COMMUNITY_SERVICE_URL'] ?? 'http://localhost:3005';
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
  if (err instanceof AxiosError && err.response?.status === 404) {
    throw createError('Post not found', 404, 'POST_NOT_FOUND', 'error.post_not_found');
  }
  logger.warn({ err, context }, 'community-service call failed');
  throw createError(
    `community-service unavailable (${context})`,
    502,
    'COMMUNITY_SERVICE_ERROR',
    'error.community_service_unavailable',
  );
}

export interface FlaggedPost {
  id: string;
  authorId: string;
  category: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
}

export interface FlaggedPostsPage {
  data: FlaggedPost[];
  meta: { total: number; page: number; page_size: number };
}

export async function listFlaggedPosts(page: number, pageSize: number): Promise<FlaggedPostsPage> {
  try {
    const res = await client.get<FlaggedPostsPage>(
      `/internal/admin/moderation?page=${page}&page_size=${pageSize}`,
      { headers: { 'x-service-token': serviceToken() } },
    );
    return res.data;
  } catch (err) {
    handleError(err, 'listFlaggedPosts');
  }
}

export async function setPostStatus(id: string, status: 'active' | 'deleted'): Promise<void> {
  try {
    await client.patch(
      `/internal/admin/moderation/${id}`,
      { status },
      { headers: { 'x-service-token': serviceToken() } },
    );
  } catch (err) {
    handleError(err, 'setPostStatus');
  }
}

export interface ExpertDirectoryRow {
  id: string;
  userId: string | null;
  name: string;
  providerType: string;
  organisation: string | null;
  licenceNumber: string | null;
  maxFarmers: number | null;
  countiesServed: string[];
  subCountiesServed: string[];
  rating: number;
  reviewCount: number;
}

export async function getExperts(): Promise<ExpertDirectoryRow[]> {
  try {
    const res = await client.get<{ data: ExpertDirectoryRow[] }>('/api/v1/community/experts', {
      params: { page_size: 500 },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'community-service experts unavailable');
    return [];
  }
}
