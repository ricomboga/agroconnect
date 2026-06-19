import axios, { AxiosError } from 'axios';
import { createError } from '../middleware/errorHandler.js';
import type { HarvestData, InputData, ActivityData } from '../scoring/computeScore.js';
import { logger } from '../logger.js';

const BASE_URL = process.env['FARM_SERVICE_URL'] ?? 'http://localhost:3001';
const TIMEOUT_MS = 5000;

export class CreditScoringError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CreditScoringError';
  }
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function isRetryable(err: unknown): boolean {
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED') return true;
    const status = err.response?.status;
    return status !== undefined && status >= 500;
  }
  return false;
}

function toScoringError(err: unknown, context: string): CreditScoringError {
  if (isRetryable(err)) {
    logger.warn({ err, context }, 'farm-service call failed (timeout or 5xx)');
    return new CreditScoringError(
      `farm-service unavailable while fetching ${context}`,
      err,
    );
  }
  throw createError(
    `Unexpected error fetching ${context}`,
    502,
    'FARM_SERVICE_ERROR',
    'error.farm_service_unavailable',
  );
}

interface FarmSummary {
  id: string;
}

interface PagedResponse<T> {
  data: T[];
}

async function getFarms(accessToken: string): Promise<FarmSummary[]> {
  try {
    const res = await client.get<PagedResponse<FarmSummary>>('/api/v1/farms?page_size=100', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.data.data;
  } catch (err) {
    throw toScoringError(err, 'farms');
  }
}

export async function getFarmerHarvests(
  farmerId: string,
  accessToken: string,
): Promise<HarvestData[]> {
  const farms = await getFarms(accessToken);
  logger.debug({ farmerId, farmCount: farms.length }, 'fetching harvests for farmer');

  const pages = await Promise.all(
    farms.map((f) =>
      client
        .get<PagedResponse<HarvestData>>(`/api/v1/farms/${f.id}/harvests?page_size=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then((r) => r.data.data)
        .catch((err) => {
          throw toScoringError(err, `harvests[farm=${f.id}]`);
        }),
    ),
  );

  return pages.flat();
}

export async function getFarmerInputs(
  farmerId: string,
  accessToken: string,
): Promise<InputData[]> {
  const farms = await getFarms(accessToken);
  logger.debug({ farmerId, farmCount: farms.length }, 'fetching inputs for farmer');

  const pages = await Promise.all(
    farms.map((f) =>
      client
        .get<PagedResponse<InputData>>(`/api/v1/farms/${f.id}/inputs?page_size=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then((r) => r.data.data)
        .catch((err) => {
          throw toScoringError(err, `inputs[farm=${f.id}]`);
        }),
    ),
  );

  return pages.flat();
}

export async function getFarmerActivities(
  farmerId: string,
  accessToken: string,
): Promise<ActivityData[]> {
  const farms = await getFarms(accessToken);
  logger.debug({ farmerId, farmCount: farms.length }, 'fetching activities for farmer');

  const pages = await Promise.all(
    farms.map((f) =>
      client
        .get<PagedResponse<ActivityData>>(`/api/v1/farms/${f.id}/activities?page_size=100`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then((r) => r.data.data)
        .catch((err) => {
          throw toScoringError(err, `activities[farm=${f.id}]`);
        }),
    ),
  );

  return pages.flat();
}
