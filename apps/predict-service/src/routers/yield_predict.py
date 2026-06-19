from __future__ import annotations

import asyncio

import structlog
from fastapi import APIRouter, HTTPException

from src.schemas.predict import YieldPrediction
from src.services.farm_client import FarmServiceClient, calculate_yield

router = APIRouter()
log = structlog.get_logger(__name__)

_farm_client: FarmServiceClient | None = None


def set_yield_deps(farm_client: FarmServiceClient) -> None:
    global _farm_client
    _farm_client = farm_client


@router.get("/predict/yield", response_model=YieldPrediction)
async def get_yield_prediction(farmId: str, authorization: str = "") -> YieldPrediction:
    assert _farm_client is not None, "yield deps not initialised"

    try:
        harvests, activities = await asyncio.gather(
            _farm_client.get_harvests(farmId, authorization),
            _farm_client.get_activities(farmId, authorization),
        )
    except Exception as exc:
        log.warning("farm-service unavailable", farm_id=farmId, error=str(exc))
        raise HTTPException(
            status_code=503, detail="Farm service temporarily unavailable"
        ) from exc

    result = calculate_yield(harvests, activities)
    if not result:
        raise HTTPException(
            status_code=404, detail=f"No harvest records found for farm {farmId!r}"
        )
    return YieldPrediction(**result)
