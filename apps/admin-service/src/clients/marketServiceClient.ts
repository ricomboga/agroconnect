import axios from 'axios';
import { logger } from '../logger.js';

const BASE_URL = process.env['MARKET_SERVICE_URL'] ?? 'http://localhost:3004';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function serviceToken(): string {
  return process.env['INTERNAL_SERVICE_SECRET'] ?? '';
}

export interface MarketStats {
  active_listings: number;
}

export async function getStats(): Promise<MarketStats> {
  try {
    const res = await client.get<MarketStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'market-service stats unavailable');
    return { active_listings: 0 };
  }
}

export interface SupplierDirectoryRow {
  id: string;
  userId: string;
  businessName: string;
  businessRegNumber: string | null;
  deliveryRadiusKm: string | null;
  county: string;
  subCounty: string | null;
  categories: string[];
  phone: string;
}

export async function getSupplierProfiles(): Promise<SupplierDirectoryRow[]> {
  try {
    const res = await client.get<{ data: SupplierDirectoryRow[] }>('/api/v1/market/supplier-profiles', {
      params: { page_size: 500 },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'market-service supplier-profiles unavailable');
    return [];
  }
}
