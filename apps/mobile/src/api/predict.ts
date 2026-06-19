import { apiFetch } from './client';

export interface PriceForecast {
  crop: string;
  currentPriceKes: number;
  forecastPriceKes: number;
  changePercent: number;
  trend: 'rising' | 'falling' | 'stable';
  daysAhead: number;
  confidence: number;
}

export interface YieldEstimate {
  farmId: string;
  crop: string;
  estimatedYieldKg: number;
  estimatedRevenueKes: number;
  harvestWindowStart: string;
  harvestWindowEnd: string;
  confidence: number;
}

export interface HarvestTiming {
  farmId: string;
  plotId: string | null;
  crop: string;
  optimalHarvestDate: string;
  windowStartDate: string;
  windowEndDate: string;
  rationale: string;
}

export interface MarketSignal {
  crop: string;
  supplyIndex: number;
  demandIndex: number;
  signal: 'sell_now' | 'hold' | 'buy_now';
  rationale: string;
}

export const predictApi = {
  prices: (crop: string, daysAhead: 30 | 60 | 90 = 30) =>
    apiFetch<{ data: PriceForecast[] }>(`/predict/prices?crop=${encodeURIComponent(crop)}&days_ahead=${daysAhead}`),

  yield: () =>
    apiFetch<{ data: YieldEstimate[] }>('/predict/yield'),

  harvestTiming: () =>
    apiFetch<{ data: HarvestTiming[] }>('/predict/harvest-timing'),

  marketSignals: () =>
    apiFetch<{ data: MarketSignal[] }>('/predict/market-signals'),
};
