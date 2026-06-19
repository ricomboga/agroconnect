from __future__ import annotations

import structlog
from fastapi import APIRouter

from src.cache.redis_client import WeatherCache
from src.events.producer import WeatherProducer
from src.schemas.weather import AlertsResponse
from src.services.alert_service import derive_alerts
from src.services.forecast_service import get_or_fetch
from src.services.owm_client import OWMClient

router = APIRouter()
log = structlog.get_logger(__name__)

_cache: WeatherCache | None = None
_owm: OWMClient | None = None
_producer: WeatherProducer | None = None


def set_alerts_deps(
    cache: WeatherCache, owm: OWMClient, producer: WeatherProducer
) -> None:
    global _cache, _owm, _producer
    _cache = cache
    _owm = owm
    _producer = producer


@router.get("/weather/alerts", response_model=AlertsResponse)
async def get_alerts(lat: float, lng: float) -> AlertsResponse:
    assert _cache is not None and _owm is not None and _producer is not None
    forecast, _ = await get_or_fetch(lat, lng, _cache, _owm)
    alerts = derive_alerts(forecast)

    if alerts:
        try:
            await _producer.publish_alerts(lat, lng, alerts)
        except Exception as exc:
            log.error("failed to publish weather alerts", error=str(exc))

    return AlertsResponse(alerts=alerts)
