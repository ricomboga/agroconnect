from __future__ import annotations

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class TodayWeather(BaseModel):
    temp_c: float
    humidity: int
    rain_chance: float
    description: str


class DailyForecast(BaseModel):
    date: date
    temp_min_c: float
    temp_max_c: float
    humidity: int
    rain_chance: float
    wind_kph: float
    description: str


class ForecastResponse(BaseModel):
    today: TodayWeather
    forecast: List[DailyForecast]
    stale: bool = False
    cached_at: Optional[str] = None


class WeatherAlert(BaseModel):
    type: str
    severity: str
    description: str
    date: date


class AlertsResponse(BaseModel):
    alerts: List[WeatherAlert]


class SeasonInfo(BaseModel):
    start: str
    end: str
    description: str


class SeasonalResponse(BaseModel):
    county: str
    long_rains: SeasonInfo
    short_rains: SeasonInfo
    outlook: str
