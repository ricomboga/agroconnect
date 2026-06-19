"""
Test bootstrap: injects stubs for pydantic (no cp315 wheels) and aiokafka (needs
Cython/MSVC) before any src imports, so tests run on Python 3.15 without build tools.
Production code on Python 3.11 uses the real packages; stubs are test-only.
"""
from __future__ import annotations

import sys
import types
from datetime import date
from types import ModuleType
from unittest.mock import AsyncMock, MagicMock

# ── 1. Pydantic stub (Python 3.15 has no pre-built pydantic-core wheels) ──────
from tests._pydantic_stub import BaseModel, BaseSettings  # noqa: E402

_pydantic_stub = ModuleType("pydantic")
_pydantic_stub.BaseModel = BaseModel      # type: ignore[attr-defined]
_pydantic_stub.BaseSettings = BaseSettings  # type: ignore[attr-defined]
sys.modules.setdefault("pydantic", _pydantic_stub)

_pydantic_settings_stub = ModuleType("pydantic_settings")
_pydantic_settings_stub.BaseSettings = BaseSettings  # type: ignore[attr-defined]
_pydantic_settings_stub.SettingsConfigDict = dict  # type: ignore[attr-defined]
sys.modules.setdefault("pydantic_settings", _pydantic_settings_stub)

# ── 2. FastAPI stub (loads pydantic v1 OpenAPI models which crash on Python 3.15) ──
class _HTTPException(Exception):
    def __init__(self, status_code: int, detail: str = "") -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"HTTP {status_code}: {detail}")

_router_instance = MagicMock()
_router_instance.get = lambda *a, **kw: (lambda fn: fn)   # pass-through decorator

class _APIRouter:
    def __init__(self, *args, **kwargs):
        pass
    def get(self, *args, **kwargs):
        return lambda fn: fn
    def post(self, *args, **kwargs):
        return lambda fn: fn

_fastapi_stub = ModuleType("fastapi")
_fastapi_stub.HTTPException = _HTTPException  # type: ignore[attr-defined]
_fastapi_stub.APIRouter = _APIRouter          # type: ignore[attr-defined]
sys.modules.setdefault("fastapi", _fastapi_stub)

# ── 3. aiokafka stub (needs Cython, no Windows pre-built wheels) ──────────────
_aiokafka_stub = ModuleType("aiokafka")
_aiokafka_stub.AIOKafkaProducer = MagicMock  # type: ignore[attr-defined]
sys.modules.setdefault("aiokafka", _aiokafka_stub)

# ── Fixtures ──────────────────────────────────────────────────────────────────
import pytest  # noqa: E402

from src.schemas.weather import DailyForecast, ForecastResponse, TodayWeather  # noqa: E402


def make_forecast(
    rain_chance: float = 0.2,
    wind_kph: float = 10.0,
    stale: bool = False,
) -> ForecastResponse:
    return ForecastResponse(
        today=TodayWeather(
            temp_c=20.0,
            humidity=70,
            rain_chance=rain_chance,
            description="clear sky",
        ),
        forecast=[
            DailyForecast(
                date=date(2026, 6, 13),
                temp_min_c=15.0,
                temp_max_c=25.0,
                humidity=70,
                rain_chance=rain_chance,
                wind_kph=wind_kph,
                description="clear sky",
            )
        ],
        stale=stale,
        cached_at="2026-06-13T10:00:00+00:00",
    )


@pytest.fixture
def mock_cache() -> AsyncMock:
    cache = AsyncMock()
    cache.get.return_value = None
    cache.get_backup.return_value = None
    cache.set.return_value = None
    return cache


@pytest.fixture
def mock_owm() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def mock_producer() -> AsyncMock:
    return AsyncMock()
