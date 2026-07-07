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
  farms_health_below_50: number;
}

export async function getStats(): Promise<FarmStats> {
  try {
    const res = await client.get<FarmStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'farm-service stats unavailable');
    return { total_farms: 0, diagnoses_this_month: 0, farms_health_below_50: 0 };
  }
}

export interface FarmRow {
  id: string;
  name: string;
  ownerId: string;
  county: string;
  areaAcres: string;
  createdAt: string;
  plots: unknown[];
  overdueCount: number;
  workerCount: number;
  activitiesThisMonth: number;
  healthScore: number;
}

export interface FarmsPage {
  data: FarmRow[];
  meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface CountyFarmerCount {
  county: string;
  farmerCount: number;
}

export async function getFarmersByCounty(): Promise<CountyFarmerCount[]> {
  try {
    const res = await client.get<{ data: CountyFarmerCount[] }>('/internal/admin/stats/farmers-by-county', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'farm-service farmers-by-county unavailable');
    return [];
  }
}

export interface CountyLivestockTotal {
  county: string;
  animalType: string;
  totalCount: number;
}

export async function getLivestockStats(filters: {
  county?: string;
  animalType?: string;
}): Promise<CountyLivestockTotal[]> {
  try {
    const res = await client.get<{ data: CountyLivestockTotal[] }>('/internal/admin/stats/livestock', {
      params: { county: filters.county, animal_type: filters.animalType },
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'farm-service livestock-stats unavailable');
    return [];
  }
}

export async function listFarms(params: {
  search?: string;
  county?: string;
  page: number;
  page_size: number;
  token: string;
}): Promise<FarmsPage> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.county) query.set('county', params.county);
  query.set('page', String(params.page));
  query.set('page_size', String(params.page_size));

  const res = await client.get<FarmsPage>(`/api/v1/farms?${query.toString()}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  });
  return res.data;
}
