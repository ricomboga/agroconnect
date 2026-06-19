from __future__ import annotations

import asyncio

import pytest

from src.services.farm_client import calculate_yield
from src.routers.yield_predict import get_yield_prediction, set_yield_deps


# ---------------------------------------------------------------------------
# calculate_yield unit tests (pure, no I/O)
# ---------------------------------------------------------------------------

def test_calculate_yield_happy_path(sample_harvests):
    result = calculate_yield(sample_harvests)
    assert result["crop"] == "maize"
    assert result["based_on_seasons"] == 3
    assert result["estimated_yield_kg"] == pytest.approx(1800.0, abs=1.0)
    assert result["farm_area_acres"] == pytest.approx(4.0, abs=0.01)


def test_calculate_yield_empty_returns_empty():
    assert calculate_yield([]) == {}


def test_calculate_yield_no_area_returns_empty():
    harvests = [{"crop": "maize", "quantity_kg": 1000, "area_acres": 0}]
    assert calculate_yield(harvests) == {}


def test_calculate_yield_picks_most_common_crop():
    harvests = [
        {"crop": "maize", "quantity_kg": 500, "area_acres": 1.0},
        {"crop": "beans", "quantity_kg": 300, "area_acres": 1.0},
        {"crop": "beans", "quantity_kg": 400, "area_acres": 1.0},
    ]
    result = calculate_yield(harvests)
    assert result["crop"] == "beans"


# ---------------------------------------------------------------------------
# get_yield_prediction integration tests (mock farm client)
# ---------------------------------------------------------------------------

def test_yield_prediction_returns_model(mock_farm_client, sample_harvests):
    set_yield_deps(mock_farm_client)

    async def _run():
        return await get_yield_prediction(farmId="farm-123")

    result = asyncio.run(_run())
    mock_farm_client.get_harvests.assert_awaited_once_with("farm-123", "")
    mock_farm_client.get_activities.assert_awaited_once_with("farm-123", "")
    assert result.crop == "maize"
    assert result.based_on_seasons == 3


def test_yield_prediction_no_harvests_raises_404(mock_farm_client):
    from unittest.mock import AsyncMock
    from fastapi import HTTPException

    mock_farm_client.get_harvests = AsyncMock(return_value=[])
    set_yield_deps(mock_farm_client)

    async def _run():
        return await get_yield_prediction(farmId="empty-farm")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())
    assert exc_info.value.status_code == 404


def test_yield_prediction_farm_service_down_raises_503(mock_farm_client):
    from unittest.mock import AsyncMock
    from fastapi import HTTPException

    mock_farm_client.get_harvests = AsyncMock(side_effect=ConnectionError("refused"))
    set_yield_deps(mock_farm_client)

    async def _run():
        return await get_yield_prediction(farmId="farm-xyz")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())
    assert exc_info.value.status_code == 503


def test_yield_prediction_activities_down_raises_503(mock_farm_client):
    from unittest.mock import AsyncMock
    from fastapi import HTTPException

    mock_farm_client.get_activities = AsyncMock(side_effect=ConnectionError("refused"))
    set_yield_deps(mock_farm_client)

    async def _run():
        return await get_yield_prediction(farmId="farm-xyz")

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_run())
    assert exc_info.value.status_code == 503
