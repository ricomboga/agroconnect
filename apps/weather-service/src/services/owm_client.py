from __future__ import annotations

import json
from datetime import date, datetime, timezone

import httpx

from src.schemas.weather import DailyForecast, ForecastResponse, TodayWeather

_OWM_URL = "https://api.openweathermap.org/data/3.0/onecall"


class OWMClient:
    def __init__(self, api_key: str, timeout: int = 5) -> None:
        self._api_key = api_key
        self._http = httpx.AsyncClient(timeout=timeout)

    async def fetch(self, lat: float, lng: float) -> ForecastResponse:
        resp = await self._http.get(
            _OWM_URL,
            params={
                "lat": lat,
                "lon": lng,
                "appid": self._api_key,
                "units": "metric",
                "exclude": "minutely,hourly,alerts",
            },
        )
        resp.raise_for_status()
        return _parse(resp.json())

    async def close(self) -> None:
        await self._http.aclose()


def _parse(raw: dict) -> ForecastResponse:
    current = raw["current"]
    daily: list[dict] = raw.get("daily", [])

    today_pop = daily[0].get("pop", 0.0) if daily else 0.0

    today = TodayWeather(
        temp_c=current["temp"],
        humidity=current["humidity"],
        rain_chance=today_pop,
        description=current["weather"][0]["description"],
    )

    forecast = [
        DailyForecast(
            date=date.fromtimestamp(day["dt"]),
            temp_min_c=day["temp"]["min"],
            temp_max_c=day["temp"]["max"],
            humidity=day["humidity"],
            rain_chance=day.get("pop", 0.0),
            wind_kph=round(day.get("wind_speed", 0.0) * 3.6, 1),
            description=day["weather"][0]["description"],
        )
        for day in daily[:7]
    ]

    return ForecastResponse(
        today=today,
        forecast=forecast,
        stale=False,
        cached_at=datetime.now(timezone.utc).isoformat(),
    )


def forecast_to_cache_dict(forecast: ForecastResponse) -> dict:
    """Serialize to a JSON-safe dict (dates as ISO strings) for Redis storage."""
    return json.loads(forecast.json())
