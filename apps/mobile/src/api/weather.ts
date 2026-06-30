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

// Backend response shapes (weather-service uses snake_case, wraps in its own structure)
interface _BackendDailyForecast {
  date: string;
  temp_min_c: number;
  temp_max_c: number;
  humidity: number;
  rain_chance: number; // 0.0–1.0 probability
  wind_kph: number;
  description: string; // OWM text, e.g. "scattered clouds"
}

interface _BackendForecastResponse {
  today: {
    temp_c: number;
    humidity: number;
    rain_chance: number;
    description: string;
  };
  forecast: _BackendDailyForecast[];
  stale: boolean;
  cached_at: string | null;
}

function _toCondition(description: string): WeatherCondition {
  const d = description.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return 'stormy';
  if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) return 'rainy';
  if (d.includes('overcast') || d.includes('fog') || d.includes('mist') || d.includes('haze')) return 'cloudy';
  if (d.includes('cloud')) return 'partly_cloudy';
  return 'clear';
}

export const weatherApi = {
  forecast: async (lat: number, lng: number): Promise<{ data: WeatherDay[] }> => {
    const raw = await apiFetch<_BackendForecastResponse>(
      `/weather/forecast?lat=${lat}&lng=${lng}`,
    );
    return {
      data: raw.forecast.map((day) => ({
        date: day.date,
        condition: _toCondition(day.description),
        tempHighC: day.temp_max_c,
        tempLowC: day.temp_min_c,
        rainChancePct: Math.round(day.rain_chance * 100),
        humidityPct: day.humidity,
      })),
    };
  },
  alerts: () =>
    apiFetch<{ data: WeatherAlert[] }>('/weather/alerts'),
  seasonal: () =>
    apiFetch<{ data: SeasonalOutlook }>('/weather/seasonal'),
  history: (days: 30 | 90 = 30) =>
    apiFetch<{ data: WeatherHistory[] }>(`/weather/history?days=${days}`),
};
