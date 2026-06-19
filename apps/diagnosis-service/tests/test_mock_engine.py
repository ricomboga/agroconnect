from __future__ import annotations

import pytest

from src.inference.mock_engine import MockInferenceEngine
from src.utils.disease_taxonomy import (
    DISEASE_TAXONOMY,
    TAXONOMY_BY_CODE,
    LIVESTOCK_PREFIXES,
)

_PLANT_CODES = {d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "plant"}
_ANIMAL_CODES = {d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "animal"}


@pytest.mark.asyncio
async def test_returns_valid_taxonomy_code() -> None:
    engine = MockInferenceEngine()
    result = await engine.run(["s3://bucket/img.jpg"], "plant", "maize")
    assert result.disease["code"] in TAXONOMY_BY_CODE


@pytest.mark.asyncio
async def test_confidence_in_range() -> None:
    engine = MockInferenceEngine()
    for _ in range(100):
        result = await engine.run(["s3://bucket/img.jpg"], "plant", "maize")
        assert 0.75 <= result.confidence <= 0.97, f"confidence out of range: {result.confidence}"


@pytest.mark.asyncio
async def test_returns_exactly_two_prescriptions() -> None:
    engine = MockInferenceEngine()
    result = await engine.run(["s3://bucket/img.jpg"], "plant", "maize")
    assert len(result.prescriptions) == 2


@pytest.mark.asyncio
async def test_prescription_steps_are_sequential() -> None:
    engine = MockInferenceEngine()
    result = await engine.run(["s3://bucket/img.jpg"], "plant", "maize")
    steps = [p["step"] for p in result.prescriptions]
    assert steps == [1, 2]


@pytest.mark.asyncio
async def test_plant_subject_returns_crop_disease() -> None:
    engine = MockInferenceEngine()
    for _ in range(50):
        result = await engine.run(["s3://bucket/img.jpg"], "plant", "maize")
        prefix = result.disease["code"].split("-")[0]
        assert prefix not in LIVESTOCK_PREFIXES, (
            f"Expected crop disease code, got livestock: {result.disease['code']}"
        )


@pytest.mark.asyncio
async def test_animal_subject_returns_livestock_condition() -> None:
    engine = MockInferenceEngine()
    for _ in range(50):
        result = await engine.run(["s3://bucket/img.jpg"], "animal", "cattle")
        prefix = result.disease["code"].split("-")[0]
        assert prefix in LIVESTOCK_PREFIXES, (
            f"Expected livestock condition code, got crop: {result.disease['code']}"
        )


@pytest.mark.asyncio
async def test_model_version_is_mock_sentinel() -> None:
    engine = MockInferenceEngine()
    result = await engine.run([], "plant", "maize")
    assert result.model_version == "mock-v0"


@pytest.mark.asyncio
async def test_empty_image_urls_does_not_raise() -> None:
    """Mock engine ignores image content, so empty list must not error."""
    engine = MockInferenceEngine()
    result = await engine.run([], "animal", "poultry")
    assert result.disease["code"] in TAXONOMY_BY_CODE


@pytest.mark.asyncio
async def test_unknown_subject_type_falls_back_to_full_taxonomy() -> None:
    engine = MockInferenceEngine()
    result = await engine.run([], "unknown", "unknown")
    assert result.disease["code"] in TAXONOMY_BY_CODE
