from __future__ import annotations

from typing import List

from pydantic import BaseModel


class PricePrediction(BaseModel):
    crop: str
    current_price_kes: float
    predicted_price_kes: float
    days_ahead: int
    confidence_low: float
    confidence_high: float
    trend: str  # "rising" | "falling" | "stable"


class YieldPrediction(BaseModel):
    crop: str
    estimated_yield_kg: float
    based_on_seasons: int
    farm_area_acres: float


class MarketSignal(BaseModel):
    crop: str
    signal: str  # "rising" | "falling" | "stable"
    change_pct: float


class MarketSignalsResponse(BaseModel):
    signals: List[MarketSignal]
