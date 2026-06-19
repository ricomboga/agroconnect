from __future__ import annotations

from fastapi import APIRouter

from src.schemas.predict import MarketSignal, MarketSignalsResponse
from src.services.price_model import market_signals

router = APIRouter()


@router.get("/predict/market-signals", response_model=MarketSignalsResponse)
async def get_market_signals() -> MarketSignalsResponse:
    raw = market_signals()
    return MarketSignalsResponse(signals=[MarketSignal(**s) for s in raw])
