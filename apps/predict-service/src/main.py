from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

import structlog
from fastapi import FastAPI

from src.config import settings
from src.events.consumer import PredictConsumer
from src.routers.market_signals import router as market_signals_router
from src.routers.prices import router as prices_router
from src.routers.yield_predict import router as yield_router
from src.routers.yield_predict import set_yield_deps
from src.services.farm_client import FarmServiceClient

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    farm_client = FarmServiceClient()
    set_yield_deps(farm_client)

    consumer = PredictConsumer()
    await consumer.start()

    log.info("predict-service started", port=settings.REST_PORT)
    yield

    await consumer.stop()
    await farm_client.close()
    log.info("predict-service stopped")


app = FastAPI(title="predict-service", version="0.1.0", lifespan=lifespan)
app.include_router(prices_router, prefix="/api/v1")
app.include_router(yield_router, prefix="/api/v1")
app.include_router(market_signals_router, prefix="/api/v1")
