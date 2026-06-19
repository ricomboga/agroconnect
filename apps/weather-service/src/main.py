from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import structlog
import uvicorn
from fastapi import FastAPI

from src.cache.redis_client import WeatherCache
from src.config import settings
from src.events.producer import WeatherProducer
from src.routers.alerts import router as alerts_router, set_alerts_deps
from src.routers.forecast import router as forecast_router, set_forecast_deps
from src.routers.seasonal import router as seasonal_router, set_county_data
from src.services.owm_client import OWMClient

structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    ),
)

log = structlog.get_logger(__name__)

_DATA_PATH = Path(__file__).parent / "data" / "county_seasons.json"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    cache = WeatherCache(settings.REDIS_URL)
    owm = OWMClient(settings.OPENWEATHER_API_KEY, settings.OWM_TIMEOUT_S)
    producer = WeatherProducer()

    set_forecast_deps(cache, owm)
    set_alerts_deps(cache, owm, producer)

    raw_counties: dict = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    county_index = {k.lower(): v for k, v in raw_counties.items()}
    set_county_data(county_index)

    await producer.start()
    log.info("weather-service started", port=settings.REST_PORT)

    yield  # ── running ──────────────────────────────────────────────────────

    log.info("shutting down")
    await producer.stop()
    await owm.close()
    await cache.close()


app = FastAPI(title="weather-service", version="0.1.0", lifespan=lifespan)
app.include_router(forecast_router, prefix="/api/v1")
app.include_router(alerts_router, prefix="/api/v1")
app.include_router(seasonal_router, prefix="/api/v1")


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=settings.REST_PORT,
        log_level=settings.LOG_LEVEL,
    )
