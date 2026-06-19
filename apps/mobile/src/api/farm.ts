import { apiFetch } from './client';

export interface FarmPlot {
  id: string;
  name: string;
  areaAcres: number;
  cropType: string | null;
}

export interface Farm {
  id: string;
  name: string;
  county: string;
  areaAcres: number;
  soilType: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
  status: 'active' | 'fallow' | 'rented_out' | 'sold';
  ownerId: string;
  plots: FarmPlot[];
  createdAt: string;
}

export interface FarmSummary {
  farmId: string;
  totalYieldKg: number;
  totalInputCostsKes: number;
  totalLabourCostsKes: number;
  totalCostsKes: number;
  totalRevenueKes: number;
  profitEstimateKes: number;
  dateRange?: { from: string; to: string };
}

export interface CreateFarmDto {
  name: string;
  county: string;
  areaAcres: number;
  soilType?: string;
  gpsLat?: number;
  gpsLng?: number;
  firstCrop?: string;
  plantingDate?: string;
}

export interface UpdateFarmDto {
  name?: string;
  county?: string;
  areaAcres?: number;
  soilType?: string;
  gpsLat?: number;
  gpsLng?: number;
  status?: Farm['status'];
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const farmApi = {
  list: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<Farm>>(`/farms${q ? `?${q}` : ''}`);
  },

  get: (farmId: string) =>
    apiFetch<{ data: Farm }>(`/farms/${farmId}`),

  create: (dto: CreateFarmDto) =>
    apiFetch<{ data: Farm }>('/farms', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),

  update: (farmId: string, dto: UpdateFarmDto) =>
    apiFetch<{ data: Farm }>(`/farms/${farmId}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    }),

  delete: (farmId: string) =>
    apiFetch<void>(`/farms/${farmId}`, { method: 'DELETE' }),

  summary: (farmId: string, params?: { fromDate?: string; toDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.fromDate) qs.set('from_date', params.fromDate);
    if (params?.toDate) qs.set('to_date', params.toDate);
    const q = qs.toString();
    return apiFetch<{ data: FarmSummary }>(`/farms/${farmId}/summary${q ? `?${q}` : ''}`);
  },
};
