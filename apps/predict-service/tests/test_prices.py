from __future__ import annotations

import pytest

from src.services.price_model import TOP_10_CROPS, predict_price, market_signals

VALID_TRENDS = {"rising", "falling", "stable"}


def test_maize_trend_is_rising():
    result = predict_price("maize", 30)
    assert result["trend"] == "rising"


def test_wheat_trend_is_falling():
    result = predict_price("wheat", 30)
    assert result["trend"] == "falling"


def test_beans_trend_is_stable():
    result = predict_price("beans", 30)
    assert result["trend"] == "stable"


@pytest.mark.parametrize("crop", sorted(TOP_10_CROPS))
def test_trend_always_valid(crop):
    result = predict_price(crop, 30)
    assert result["trend"] in VALID_TRENDS, f"{crop} trend={result['trend']!r} not in {VALID_TRENDS}"


def test_confidence_interval_brackets_predicted():
    result = predict_price("maize", 30)
    assert result["confidence_low"] <= result["predicted_price_kes"]
    assert result["predicted_price_kes"] <= result["confidence_high"]


def test_days_ahead_reflected_in_result():
    for days in (7, 30, 90):
        result = predict_price("maize", days)
        assert result["days_ahead"] == days


def test_unknown_crop_returns_empty():
    result = predict_price("unicorn_crop", 30)
    assert result == {}


def test_price_router_unknown_crop_raises_404():
    import asyncio
    from src.routers.prices import get_price_prediction
    from fastapi import HTTPException

    async def _run():
        return await get_price_prediction(crop="unicorn_crop", days_ahead=30)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())
    assert exc_info.value.status_code == 404


def test_price_router_invalid_days_ahead_raises_422():
    import asyncio
    from src.routers.prices import get_price_prediction
    from fastapi import HTTPException

    async def _run():
        return await get_price_prediction(crop="maize", days_ahead=0)

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())
    assert exc_info.value.status_code == 422


def test_maize_price_values():
    result = predict_price("maize", 30)
    assert result["current_price_kes"] == pytest.approx(62.0, abs=0.1)
    assert result["predicted_price_kes"] > result["current_price_kes"]
