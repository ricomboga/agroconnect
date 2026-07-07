import axios from 'axios';
import { logger } from '../logger.js';

const BASE_URL = process.env['FINANCE_SERVICE_URL'] ?? 'http://localhost:3003';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function serviceToken(): string {
  return process.env['INTERNAL_SERVICE_SECRET'] ?? '';
}

export interface FinanceStats {
  loans_disbursed_kes: number;
}

export async function getStats(): Promise<FinanceStats> {
  try {
    const res = await client.get<FinanceStats>('/internal/admin/stats', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'finance-service stats unavailable');
    return { loans_disbursed_kes: 0 };
  }
}

export interface InstitutionLoanTotal {
  institutionId: string;
  institutionName: string;
  totalDisbursedKes: number;
}

export async function getLoansByInstitution(): Promise<InstitutionLoanTotal[]> {
  try {
    const res = await client.get<{ data: InstitutionLoanTotal[] }>('/internal/admin/stats/loans-by-institution', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'finance-service loans-by-institution unavailable');
    return [];
  }
}
