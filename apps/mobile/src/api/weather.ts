import { apiFetch } from './client';

export type WeatherCondition = 'clear' | 'partly_cloudy' | 'cloudy' | 'rainy' | 'stormy';

export interface WeatherDay {
  date: string;
  condition: WeatherCondition;
  tempHighC: number;
  tempLowC: number;
  rainChancePct: number;
  humidityPct: number;
}

export interface WeatherAlert {
  id: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  validFrom: string;
  validUntil: string;
}

export interface SeasonalOutlook {
  county: string;
  season: string;
  rainfallOutlook: string;
  temperatureOutlook: string;
  farmingAdvisory: string;
}

export interface WeatherHistory {
  date: string;
  tempHighC: number;
  tempLowC: number;
  rainfallMm: number;
  condition: WeatherCondition;
}

export const weatherApi = {
  forecast: (lat: number, lng: number) =>
    apiFetch<{ data: WeatherDay[] }>(`/weather/forecast?lat=${lat}&lng=${lng}`),
  alerts: () =>
    apiFetch<{ data: WeatherAlert[] }>('/weather/alerts'),
  seasonal: () =>
    apiFetch<{ data: SeasonalOutlook }>('/weather/seasonal'),
  history: (days: 30 | 90 = 30) =>
    apiFetch<{ data: WeatherHistory[] }>(`/weather/history?days=${days}`),
};
