from __future__ import annotations

import json
from unittest.mock import AsyncMock

import httpx
import pytest

from src.routers.forecast import get_forecast, set_forecast_deps
from tests.conftest import make_forecast


def _as_cache_dict(forecast) -> dict:
    return json.loads(forecast.json())


async def test_cache_hit_skips_owm(mock_cache: AsyncMock, mock_owm: AsyncMock) -> None:
    forecast = make_forecast()
    mock_cache.get.return_value = _as_cache_dict(forecast)
    set_forecast_deps(mock_cache, mock_owm)

    result = await get_forecast(lat=-1.2921, lng=36.8219)

    mock_owm.fetch.assert_not_called()
    assert result.stale is False
    assert result.today.temp_c == 20.0


async def test_owm_success_writes_both_cache_keys(mock_cache: AsyncMock, mock_owm: AsyncMock) -> None:
    mock_cache.get.return_value = None
    forecast = make_forecast()
    mock_owm.fetch.return_value = forecast
    set_forecast_deps(mock_cache, mock_owm)

    result = await get_forecast(lat=-1.2921, lng=36.8219)

    mock_owm.fetch.assert_called_once_with(-1.2921, 36.8219)
    mock_cache.set.assert_called_once()
    assert result.stale is False


async def test_owm_down_returns_stale_backup(mock_cache: AsyncMock, mock_owm: AsyncMock) -> None:
    mock_cache.get.return_value = None
    mock_owm.fetch.side_effect = httpx.ConnectError("connection refused")
    mock_cache.get_backup.return_value = _as_cache_dict(make_forecast(stale=True))
    set_forecast_deps(mock_cache, mock_owm)

    result = await get_forecast(lat=-1.2921, lng=36.8219)

    assert result.stale is True


async def test_owm_down_no_cache_raises_503(mock_cache: AsyncMock, mock_owm: AsyncMock) -> None:
    mock_cache.get.return_value = None
    mock_cache.get_backup.return_value = None
    mock_owm.fetch.side_effect = httpx.ConnectError("connection refused")
    set_forecast_deps(mock_cache, mock_owm)

    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await get_forecast(lat=-1.2921, lng=36.8219)
    assert exc_info.value.status_code == 503


async def test_cache_key_rounds_coordinates(mock_cache: AsyncMock, mock_owm: AsyncMock) -> None:
    mock_owm.fetch.return_value = make_forecast()
    mock_cache.get.return_value = None
    set_forecast_deps(mock_cache, mock_owm)

    await get_forecast(lat=-1.2921, lng=36.8219)

    mock_owm.fetch.assert_called_once_with(-1.2921, 36.8219)
    mock_cache.set.assert_called_once()
