import { apiFetch } from './client';

export type PriceTrend = 'up' | 'down' | 'stable';

export interface PriceAlert {
  id: string;
  crop: string;
  targetPriceKes: number;
  currentPriceKes: number | null;
  trend: PriceTrend;
  enabled: boolean;
  createdAt: string;
}

export interface CreatePriceAlertDto {
  crop: string;
  targetPriceKes: number;
}

export const priceAlertsApi = {
  list: () => apiFetch<{ data: PriceAlert[] }>('/market/prices/alerts'),
  create: (dto: CreatePriceAlertDto) =>
    apiFetch<{ data: PriceAlert }>('/market/prices/alerts', {
      method: 'POST',
      body: JSON.stringify(dto),
    }),
  toggle: (id: string, enabled: boolean) =>
    apiFetch<{ data: PriceAlert }>(`/market/prices/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }),
  delete: (id: string) =>
    apiFetch<void>(`/market/prices/alerts/${id}`, { method: 'DELETE' }),
};
