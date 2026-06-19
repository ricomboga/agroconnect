import { apiFetch } from './client';

export type InputType =
  | 'seed' | 'fertiliser' | 'pesticide' | 'herbicide'
  | 'fuel' | 'equipment' | 'other';

export interface Input {
  id: string;
  farmId: string;
  type: InputType;
  productName: string;
  quantity: number;
  unit: string;
  unitCostKes: number;
  totalCostKes: number;
  appliedDate: string;
  notes: string | null;
  createdAt: string;
}

export interface CreateInputDto {
  type: InputType;
  productName: string;
  quantity: number;
  unit: string;
  unitCostKes: number;
  totalCostKes: number;
  appliedDate: string;
  notes?: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const inputApi = {
  list: (
    farmId: string,
    params?: { season?: number; type?: InputType; page?: number; pageSize?: number },
  ) => {
    const qs = new URLSearchParams();
    if (params?.season) qs.set('season', String(params.season));
    if (params?.type) qs.set('type', params.type);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('page_size', String(params.pageSize));
    const q = qs.toString();
    return apiFetch<ListResponse<Input>>(`/farms/${farmId}/inputs${q ? `?${q}` : ''}`);
  },

  create: (farmId: string, dto: CreateInputDto) =>
    apiFetch<{ data: Input }>(`/farms/${farmId}/inputs`, {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
};
