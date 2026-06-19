from __future__ import annotations

import json
from unittest.mock import AsyncMock

import pytest

from src.routers.alerts import get_alerts, set_alerts_deps
from src.services.alert_service import derive_alerts
from tests.conftest import make_forecast


def _as_cache_dict(forecast) -> dict:
    return json.loads(forecast.json())


# ── Unit tests for alert derivation logic ─────────────────────────────────────

def test_no_alerts_when_calm() -> None:
    forecast = make_forecast(rain_chance=0.5, wind_kph=30.0)
    assert derive_alerts(forecast) == []


def test_rain_alert_at_81_percent() -> None:
    forecast = make_forecast(rain_chance=0.81)
    alerts = derive_alerts(forecast)
    assert len(alerts) == 1
    assert alerts[0].type == "heavy_rain"
    assert alerts[0].severity == "warning"
    assert "81%" in alerts[0].description


def test_wind_alert_at_51_kph() -> None:
    forecast = make_forecast(wind_kph=51.0)
    alerts = derive_alerts(forecast)
    assert len(alerts) == 1
    assert alerts[0].type == "high_wind"
    assert "51" in alerts[0].description


def test_both_alerts_triggered() -> None:
    forecast = make_forecast(rain_chance=0.85, wind_kph=60.0)
    alerts = derive_alerts(forecast)
    types = {a.type for a in alerts}
    assert types == {"heavy_rain", "high_wind"}


def test_threshold_is_exclusive_at_80_percent() -> None:
    forecast = make_forecast(rain_chance=0.80)
    assert derive_alerts(forecast) == []


# ── Integration tests for the alerts router ───────────────────────────────────

async def test_alerts_router_publishes_kafka_when_alerts_found(
    mock_cache: AsyncMock, mock_owm: AsyncMock, mock_producer: AsyncMock
) -> None:
    forecast = make_forecast(rain_chance=0.90)
    mock_cache.get.return_value = _as_cache_dict(forecast)
    set_alerts_deps(mock_cache, mock_owm, mock_producer)

    result = await get_alerts(lat=-1.2921, lng=36.8219)

    assert len(result.alerts) == 1
    mock_producer.publish_alerts.assert_called_once()


async def test_alerts_router_no_kafka_when_clear(
    mock_cache: AsyncMock, mock_owm: AsyncMock, mock_producer: AsyncMock
) -> None:
    forecast = make_forecast(rain_chance=0.2, wind_kph=10.0)
    mock_cache.get.return_value = _as_cache_dict(forecast)
    set_alerts_deps(mock_cache, mock_owm, mock_producer)

    result = await get_alerts(lat=-1.2921, lng=36.8219)

    assert result.alerts == []
    mock_producer.publish_alerts.assert_not_called()
