"""
Inject stubs for packages that have no cp315-win_amd64 wheels (pydantic-core,
aiokafka) or that crash on Python 3.15 (FastAPI + pydantic v1 metaclass).
Must run before any src.* import.
"""
from __future__ import annotations

import sys
import types
from unittest.mock import AsyncMock, MagicMock

import pytest

# ---------------------------------------------------------------------------
# 1. pydantic stub
# ---------------------------------------------------------------------------
from tests._pydantic_stub import BaseModel, BaseSettings  # noqa: E402

_pydantic_mod = types.ModuleType("pydantic")
_pydantic_mod.BaseModel = BaseModel  # type: ignore[attr-defined]
_pydantic_mod.BaseSettings = BaseSettings  # type: ignore[attr-defined]
_pydantic_mod.validator = lambda *a, **kw: (lambda f: f)  # type: ignore[attr-defined]
_pydantic_mod.Field = lambda *a, **kw: None  # type: ignore[attr-defined]
sys.modules.setdefault("pydantic", _pydantic_mod)

_pydantic_settings_mod = types.ModuleType("pydantic_settings")
_pydantic_settings_mod.BaseSettings = BaseSettings  # type: ignore[attr-defined]
sys.modules.setdefault("pydantic_settings", _pydantic_settings_mod)

# ---------------------------------------------------------------------------
# 2. fastapi stub
# ---------------------------------------------------------------------------


class _HTTPException(Exception):
    def __init__(self, status_code: int, detail: str = "") -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)


class _APIRouter:
    def __init__(self, *a, **kw) -> None:
        self.routes: list = []

    def get(self, path, **kw):
        def decorator(fn):
            self.routes.append(("GET", path, fn))
            return fn

        return decorator

    def post(self, path, **kw):
        def decorator(fn):
            self.routes.append(("POST", path, fn))
            return fn

        return decorator


class _FastAPI:
    def __init__(self, *a, **kw) -> None:
        pass

    def include_router(self, *a, **kw) -> None:
        pass


_fastapi_mod = types.ModuleType("fastapi")
_fastapi_mod.FastAPI = _FastAPI  # type: ignore[attr-defined]
_fastapi_mod.APIRouter = _APIRouter  # type: ignore[attr-defined]
_fastapi_mod.HTTPException = _HTTPException  # type: ignore[attr-defined]
_fastapi_mod.Query = lambda *a, **kw: None  # type: ignore[attr-defined]
_fastapi_mod.Header = lambda *a, **kw: None  # type: ignore[attr-defined]
_fastapi_mod.Depends = lambda *a, **kw: None  # type: ignore[attr-defined]
sys.modules.setdefault("fastapi", _fastapi_mod)

# ---------------------------------------------------------------------------
# 3. aiokafka stub
# ---------------------------------------------------------------------------
_aiokafka_mod = types.ModuleType("aiokafka")
_aiokafka_mod.AIOKafkaProducer = MagicMock  # type: ignore[attr-defined]
sys.modules.setdefault("aiokafka", _aiokafka_mod)

# ---------------------------------------------------------------------------
# 4. structlog stub (pure Python — should install fine, but guard anyway)
# ---------------------------------------------------------------------------
try:
    import structlog  # noqa: F401
except ImportError:
    _structlog_mod = types.ModuleType("structlog")

    class _Logger:
        def info(self, *a, **kw) -> None: ...
        def warning(self, *a, **kw) -> None: ...
        def error(self, *a, **kw) -> None: ...
        def debug(self, *a, **kw) -> None: ...

    _structlog_mod.get_logger = lambda *a, **kw: _Logger()  # type: ignore[attr-defined]
    sys.modules["structlog"] = _structlog_mod


# ---------------------------------------------------------------------------
# 5. Fixtures
# ---------------------------------------------------------------------------
@pytest.fixture()
def sample_harvests():
    return [
        {"crop": "maize", "quantity_kg": 2000, "area_acres": 4.0},
        {"crop": "maize", "quantity_kg": 1600, "area_acres": 4.0},
        {"crop": "maize", "quantity_kg": 1800, "area_acres": 4.0},
    ]


@pytest.fixture()
def sample_activities():
    return [
        {"type": "planting", "crop": "maize", "scheduledDate": "2026-03-01", "status": "completed"},
    ]


@pytest.fixture()
def mock_farm_client(sample_harvests, sample_activities):
    client = MagicMock()
    client.get_harvests = AsyncMock(return_value=sample_harvests)
    client.get_activities = AsyncMock(return_value=sample_activities)
    client.close = AsyncMock()
    return client
