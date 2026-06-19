import { apiFetch } from './client';

export type QualityGrade = 'A' | 'B' | 'C';

export interface Harvest {
  id: string;
  farmId: string;
  plotId: string | null;
  crop: string;
  variety: string | null;
  quantityKg: number;
  qualityGrade: QualityGrade | null;
  harvestDate: string;
  storageLocation: string | null;
  soldQuantityKg: number;
  avgPriceKes: number | null;
  totalRevenueKes: number | null;
  notes: string | null;
  createdAt: string;
}

export interface CreateHarvestDto {
  crop: string;
  variety?: string;
  quantityKg: number;
  qualityGrade?: QualityGrade;
  harvestDate: string;
  storageLocation?: string;
  soldQuantityKg?: number;
  avgPriceKes?: number;
  totalRevenueKes?: number;
  notes?: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const harvestApi = {
  list: (farmId: string, params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<Harvest>>(`/farms/${farmId}/harvests${q ? `?${q}` : ''}`);
  },

  create: (farmId: string, dto: CreateHarvestDto) =>
    apiFetch<{ data: Harvest }>(`/farms/${farmId}/harvests`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
