import { apiFetch } from './client';
import { useAuthStore } from '../stores/authStore';

export type PriceTrend = 'rising' | 'falling' | 'stable';

export interface PricePrediction {
  crop: string;
  current_price_kes: number;
  predicted_price_kes: number;
  days_ahead: number;
  confidence_low: number;
  confidence_high: number;
  trend: PriceTrend;
}

export interface YieldPrediction {
  crop: string;
  estimated_yield_kg: number;
  based_on_seasons: number;
  farm_area_acres: number;
}

export interface MarketSignal {
  crop: string;
  signal: PriceTrend;
  change_pct: number;
}

export interface MarketSignalsResponse {
  signals: MarketSignal[];
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const predictApi = {
  // Server only has forecasts for 10 staple crops (maize, beans, wheat,
  // rice, potatoes, tomatoes, sorghum, millet, cassava, groundnuts) —
  // 404s for anything else, so callers should handle that as "unavailable".
  priceForecast: (crop: string, daysAhead = 30) =>
    apiFetch<PricePrediction>(`/predict/prices${buildQs({ crop, days_ahead: daysAhead })}`),

  marketSignals: () => apiFetch<MarketSignalsResponse>('/predict/market-signals'),

  // predict-service reads the caller's JWT from an `authorization` query
  // param (not the Authorization header) to forward on to farm-service, so
  // it has to be attached explicitly here rather than relying on apiFetch's
  // usual header.
  yieldEstimate: (farmId: string) => {
    const token = useAuthStore.getState().token;
    return apiFetch<YieldPrediction>(
      `/predict/yield${buildQs({ farmId, authorization: token ? `Bearer ${token}` : undefined })}`,
    );
  },
};
