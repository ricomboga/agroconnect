from __future__ import annotations

from fastapi import APIRouter

from src.cache.redis_client import WeatherCache
from src.schemas.weather import ForecastResponse
from src.services.forecast_service import get_or_fetch
from src.services.owm_client import OWMClient

router = APIRouter()

_cache: WeatherCache | None = None
_owm: OWMClient | None = None


def set_forecast_deps(cache: WeatherCache, owm: OWMClient) -> None:
    global _cache, _owm
    _cache = cache
    _owm = owm


@router.get("/weather/forecast", response_model=ForecastResponse)
async def get_forecast(lat: float, lng: float) -> ForecastResponse:
    assert _cache is not None and _owm is not None
    result, is_stale = await get_or_fetch(lat, lng, _cache, _owm)
    result.stale = is_stale
    return result
