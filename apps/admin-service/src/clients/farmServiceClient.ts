import axios from 'axios';
import { logger } from '../logger.js';

const BASE_URL = process.env['FARM_SERVICE_URL'] ?? 'http://localhost:3001';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function serviceToken(): string {
  return process.env['INTERNAL_SERVICE_SECRET'] ?? '';
}

export interface FarmStats {
  total_farms: number;
  diagnoses_this_month: number;
}

export async function getStats(): Promise<FarmStats> {
  try {
    const res = await client.get<FarmStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'farm-service stats unavailable');
    return { total_farms: 0, diagnoses_this_month: 0 };
  }
}
