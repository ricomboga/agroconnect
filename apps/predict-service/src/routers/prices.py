from __future__ import annotations

from fastapi import APIRouter, HTTPException

from src.schemas.predict import PricePrediction
from src.services.price_model import TOP_10_CROPS, predict_price

router = APIRouter()


@router.get("/predict/prices", response_model=PricePrediction)
async def get_price_prediction(crop: str, days_ahead: int = 30) -> PricePrediction:
    if crop.lower() not in TOP_10_CROPS:
        raise HTTPException(status_code=404, detail=f"No price data for crop: {crop!r}")
    if days_ahead < 1 or days_ahead > 365:
        raise HTTPException(status_code=422, detail="days_ahead must be between 1 and 365")

    result = predict_price(crop.lower(), days_ahead)
    if not result:
        raise HTTPException(status_code=500, detail="Price prediction failed")
    return PricePrediction(**result)
