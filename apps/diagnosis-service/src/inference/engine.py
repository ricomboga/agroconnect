from __future__ import annotations

from typing import Union

from src.config import settings
from src.inference.mock_engine import InferenceResult, MockInferenceEngine  # noqa: F401
from src.inference.real_engine import RealInferenceEngine

InferenceEngine = Union[MockInferenceEngine, RealInferenceEngine]


def get_engine() -> InferenceEngine:
    if settings.USE_MOCK_INFERENCE:
        return MockInferenceEngine()  # [MOCK]
    return RealInferenceEngine()       # [REAL]
