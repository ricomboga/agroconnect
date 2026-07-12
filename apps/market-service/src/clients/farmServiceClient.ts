import axios, { AxiosError } from 'axios';
import { createError } from '../middleware/errorHandler.js';
import { logger } from '../logger.js';

const BASE_URL = process.env['FARM_SERVICE_URL'] ?? 'http://localhost:3001';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

interface FarmPlot {
  currentCrop: string | null;
}

interface FarmDetail {
  id: string;
  plots: FarmPlot[];
}

// Forwards the farmer's own access token — farm-service already enforces that
// the farm belongs to this user, so a 404 here means "not yours or doesn't exist".
export async function getFarmCrops(farmId: string, accessToken: string): Promise<string[]> {
  try {
    const res = await client.get<{ data: FarmDetail }>(`/api/v1/farms/${farmId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return Array.from(
      new Set(res.data.data.plots.map((p) => p.currentCrop).filter((c): c is string => !!c)),
    );
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      throw createError('Farm not found', 404, 'FARM_NOT_FOUND', 'error.market.farm_not_found');
    }
    logger.warn({ err, farmId }, 'farm-service call failed while validating listing crop');
    throw createError(
      'Could not verify farm crops — farm-service unavailable',
      502,
      'FARM_SERVICE_ERROR',
      'error.market.farm_service_unavailable',
    );
  }
}
