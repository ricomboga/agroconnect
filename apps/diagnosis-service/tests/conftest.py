from __future__ import annotations

import sys
import os

# Add src/ to path so that hand-written modules and generated proto stubs are importable.
# Generated stubs (diagnosis_pb2.py, diagnosis_pb2_grpc.py) land in src/ via `make proto`.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

import pytest
from unittest.mock import AsyncMock


class FakeGrpcContext:
    """Minimal stand-in for grpc.aio.ServicerContext used in unit tests."""

    def __init__(self) -> None:
        self._aborted = False
        self._code: object = None
        self._details: str = ""

    async def abort(self, code: object, details: str) -> None:
        self._aborted = True
        self._code = code
        self._details = details
        # Mirror real gRPC behaviour: abort raises so the handler stops executing.
        raise RuntimeError(f"gRPC aborted: {code} — {details}")

    @property
    def aborted(self) -> bool:
        return self._aborted


@pytest.fixture()
def fake_context() -> FakeGrpcContext:
    return FakeGrpcContext()


@pytest.fixture()
def mock_repo() -> AsyncMock:
    repo = AsyncMock()
    repo.create_pending.return_value = "507f1f77bcf86cd799439011"
    return repo


@pytest.fixture()
def mock_producer() -> AsyncMock:
    return AsyncMock()
