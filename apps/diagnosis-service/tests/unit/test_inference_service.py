"""
Unit tests for src/inference_service.py.

These tests run with no external services (no DB, no Kafka, no real model).
"""

from __future__ import annotations

import pytest

from src.inference_service import (
    VALID_ANIMAL_CODES,
    VALID_PLANT_CODES,
    run_inference,
)
from src.models.diagnosis import DiagnosisResult
from src.utils.disease_taxonomy import TAXONOMY_BY_CODE, LIVESTOCK_PREFIXES


# ---------------------------------------------------------------------------
# Return type
# ---------------------------------------------------------------------------

def test_returns_diagnosis_result_instance() -> None:
    result = run_inference([], "plant", "maize")
    assert isinstance(result, DiagnosisResult)


def test_result_has_all_required_fields() -> None:
    result = run_inference([], "plant", "maize")
    assert result.disease_name
    assert result.disease_code
    assert result.confidence
    assert result.severity
    assert result.description


# ---------------------------------------------------------------------------
# Disease code validity
# ---------------------------------------------------------------------------

def test_returned_code_is_in_taxonomy() -> None:
    for _ in range(50):
        result = run_inference([], "plant", "maize")
        assert result.disease_code in TAXONOMY_BY_CODE, (
            f"Unknown disease code returned: {result.disease_code}"
        )


def test_no_invented_codes_for_animals() -> None:
    for _ in range(50):
        result = run_inference([], "animal", "cattle")
        assert result.disease_code in TAXONOMY_BY_CODE


# ---------------------------------------------------------------------------
# Subject-type filtering
# ---------------------------------------------------------------------------

def test_plant_subject_returns_only_crop_codes() -> None:
    for _ in range(80):
        result = run_inference([b"fake"], "plant", "maize")
        prefix = result.disease_code.split("-")[0]
        assert prefix not in LIVESTOCK_PREFIXES, (
            f"Plant diagnosis returned a livestock code: {result.disease_code}"
        )


def test_animal_subject_returns_only_livestock_codes() -> None:
    for _ in range(80):
        result = run_inference([b"fake"], "animal", "cattle")
        prefix = result.disease_code.split("-")[0]
        assert prefix in LIVESTOCK_PREFIXES, (
            f"Animal diagnosis returned a crop code: {result.disease_code}"
        )


def test_plant_code_is_in_valid_plant_codes() -> None:
    for _ in range(50):
        result = run_inference([], "plant", "tomato")
        assert result.disease_code in VALID_PLANT_CODES


def test_animal_code_is_in_valid_animal_codes() -> None:
    for _ in range(50):
        result = run_inference([], "animal", "poultry")
        assert result.disease_code in VALID_ANIMAL_CODES


# ---------------------------------------------------------------------------
# Confidence range
# ---------------------------------------------------------------------------

def test_confidence_within_valid_range() -> None:
    for _ in range(100):
        result = run_inference([], "plant", "maize")
        assert 0.75 <= result.confidence <= 0.97, (
            f"Confidence {result.confidence} outside [0.75, 0.97]"
        )


def test_confidence_is_rounded_to_four_decimal_places() -> None:
    result = run_inference([], "plant", "maize")
    assert round(result.confidence, 4) == result.confidence


# ---------------------------------------------------------------------------
# Taxonomy constants are complete
# ---------------------------------------------------------------------------

def test_valid_plant_codes_nonempty() -> None:
    assert len(VALID_PLANT_CODES) == 30


def test_valid_animal_codes_nonempty() -> None:
    assert len(VALID_ANIMAL_CODES) == 10


def test_valid_plant_codes_all_in_taxonomy() -> None:
    for code in VALID_PLANT_CODES:
        assert code in TAXONOMY_BY_CODE


def test_valid_animal_codes_all_in_taxonomy() -> None:
    for code in VALID_ANIMAL_CODES:
        assert code in TAXONOMY_BY_CODE


# ---------------------------------------------------------------------------
# Image bytes input
# ---------------------------------------------------------------------------

def test_empty_image_list_does_not_raise() -> None:
    result = run_inference([], "plant", "maize")
    assert result.disease_code in TAXONOMY_BY_CODE


def test_multiple_image_bytes_accepted() -> None:
    images = [b"bytes1", b"bytes2", b"bytes3"]
    result = run_inference(images, "plant", "maize")
    assert isinstance(result, DiagnosisResult)


# ---------------------------------------------------------------------------
# Description format
# ---------------------------------------------------------------------------

def test_description_contains_disease_name() -> None:
    result = run_inference([], "plant", "maize")
    assert result.disease_name in result.description


def test_disease_name_matches_taxonomy() -> None:
    result = run_inference([], "plant", "maize")
    expected_name = TAXONOMY_BY_CODE[result.disease_code]["name"]
    assert result.disease_name == expected_name
