from __future__ import annotations

import structlog
from fastapi import HTTPException

import httpx

from src.cache.redis_client import WeatherCache
from src.schemas.weather import ForecastResponse
from src.services.owm_client import OWMClient, forecast_to_cache_dict

log = structlog.get_logger(__name__)


async def get_or_fetch(
    lat: float, lng: float, cache: WeatherCache, owm: OWMClient
) -> tuple[ForecastResponse, bool]:
    """Return (forecast, is_stale). Raises HTTP 503 if OWM is down and no backup exists."""
    cached = await cache.get(lat, lng)
    if cached:
        log.debug("forecast cache hit", lat=round(lat, 1), lng=round(lng, 1))
        return ForecastResponse(**cached), False

    try:
        result = await owm.fetch(lat, lng)
        await cache.set(lat, lng, forecast_to_cache_dict(result))
        return result, False
    except (httpx.HTTPError, httpx.TimeoutException) as exc:
        log.warning("OWM fetch failed", error=str(exc), lat=lat, lng=lng)
        backup = await cache.get_backup(lat, lng)
        if backup:
            log.info("returning stale forecast", lat=round(lat, 1), lng=round(lng, 1))
            return ForecastResponse(**backup), True
        raise HTTPException(status_code=503, detail="Weather service temporarily unavailable")
