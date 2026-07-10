import axios from 'axios';
import { logger } from '../logger.js';

const BASE_URL = process.env['GOVT_SERVICE_URL'] ?? 'http://localhost:3006';
const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

function serviceToken(): string {
  return process.env['INTERNAL_SERVICE_SECRET'] ?? '';
}

export interface OfficerProfileDirectoryRow {
  id: string;
  fullName: string;
  phone: string;
  ministry: string;
  position: string;
  staffId: string;
  assignedCounty: string;
  assignedSubCounty: string | null;
}

export async function getOfficerProfiles(): Promise<OfficerProfileDirectoryRow[]> {
  try {
    const res = await client.get<{ data: OfficerProfileDirectoryRow[] }>('/api/v1/govt/officer-profiles', {
      headers: { 'x-service-token': serviceToken() },
    });
    return res.data.data;
  } catch (err) {
    logger.warn({ err }, 'govt-service officer-profiles unavailable');
    return [];
  }
}

export interface ProgramRow {
  id: string;
  name: string;
  type: string | null;
  providerAgency: string;
  totalBudgetKes: string | null;
  maxBeneficiaries: number | null;
  deadline: string | null;
  isActive: boolean;
  status: 'draft' | 'upcoming' | 'open' | 'closed';
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  budget_allocated_pct: number | null;
}

export interface ProgramsPage {
  data: ProgramRow[];
  meta: { total: number; page: number; page_size: number; ministries: string[] };
}

export async function listProgramsAdmin(
  filters: { status?: string; ministry?: string },
  page: number,
  pageSize: number,
  token: string,
): Promise<ProgramsPage> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.ministry) params.set('ministry', filters.ministry);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const res = await client.get<ProgramsPage>(`/api/v1/govt/subsidies/admin?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export interface ApplicationRow {
  id: string;
  farmerId: string;
  farmId: string;
  programId: string;
  status: string;
  county: string | null;
  certNumber: string | null;
  submittedAt: string;
}

export interface ApplicationsPage {
  data: ApplicationRow[];
  meta: { total: number; page: number; page_size: number };
}

export async function listApplications(
  programId: string,
  filters: { county?: string; status?: string },
  page: number,
  pageSize: number,
  token: string,
): Promise<ApplicationsPage> {
  const params = new URLSearchParams();
  params.set('programId', programId);
  if (filters.county) params.set('county', filters.county);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const res = await client.get<ApplicationsPage>(`/api/v1/govt/subsidies/applications?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export interface BulkApprovePayload {
  ids: string[];
  collectionPoint?: string;
  collectionDate?: string;
  approvedItem?: string;
}

export async function bulkApproveApplications(payload: BulkApprovePayload, token: string) {
  try {
    const res = await client.patch(
      '/api/v1/govt/subsidies/applications/bulk',
      { ...payload, decision: 'approved' },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return res.data;
  } catch (err) {
    logger.warn({ err }, 'govt-service bulkApproveApplications failed');
    throw err;
  }
}
