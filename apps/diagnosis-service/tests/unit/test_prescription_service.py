"""
Unit tests for src/prescription_service.py.

Validates that every disease code in the taxonomy has prescriptions,
that all codes in the prescription table are valid taxonomy codes,
and that every step has the required fields.
"""

from __future__ import annotations

import pytest

from src.prescription_service import PRESCRIPTIONS, PrescriptionStep, get_prescriptions
from src.utils.disease_taxonomy import DISEASE_TAXONOMY, TAXONOMY_BY_CODE

ALL_CODES = [d["code"] for d in DISEASE_TAXONOMY]
REQUIRED_STEP_FIELDS = {"step_number", "action", "product_name", "product_type", "dosage", "frequency"}


# ---------------------------------------------------------------------------
# Coverage: every taxonomy code must have prescriptions
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", ALL_CODES)
def test_every_taxonomy_code_has_prescriptions(code: str) -> None:
    steps = get_prescriptions(code)
    assert len(steps) >= 1, f"No prescriptions defined for {code}"


# ---------------------------------------------------------------------------
# No invented codes
# ---------------------------------------------------------------------------

def test_no_codes_outside_taxonomy() -> None:
    unknown = set(PRESCRIPTIONS) - set(TAXONOMY_BY_CODE)
    assert unknown == set(), (
        f"Prescription codes not in disease taxonomy: {unknown}"
    )


# ---------------------------------------------------------------------------
# Step counts
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", ALL_CODES)
def test_prescription_has_two_to_three_steps(code: str) -> None:
    steps = get_prescriptions(code)
    assert 2 <= len(steps) <= 3, (
        f"{code} has {len(steps)} steps; expected 2–3"
    )


# ---------------------------------------------------------------------------
# Step field completeness
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("code", ALL_CODES)
def test_all_steps_have_required_fields(code: str) -> None:
    for i, step in enumerate(get_prescriptions(code), start=1):
        missing = REQUIRED_STEP_FIELDS - set(step.keys())
        assert not missing, (
            f"{code} step {i} is missing fields: {missing}"
        )


@pytest.mark.parametrize("code", ALL_CODES)
def test_step_numbers_are_sequential(code: str) -> None:
    steps = get_prescriptions(code)
    numbers = [s["step_number"] for s in steps]
    assert numbers == list(range(1, len(steps) + 1)), (
        f"{code} step_numbers are not sequential: {numbers}"
    )


@pytest.mark.parametrize("code", ALL_CODES)
def test_action_is_nonempty_string(code: str) -> None:
    for step in get_prescriptions(code):
        assert isinstance(step["action"], str) and step["action"].strip(), (
            f"{code} has a blank 'action' field"
        )


@pytest.mark.parametrize("code", ALL_CODES)
def test_product_type_is_nonempty_string(code: str) -> None:
    for step in get_prescriptions(code):
        assert isinstance(step["product_type"], str) and step["product_type"].strip(), (
            f"{code} has a blank 'product_type' field"
        )


# ---------------------------------------------------------------------------
# Unknown code returns empty list
# ---------------------------------------------------------------------------

def test_unknown_code_returns_empty_list() -> None:
    assert get_prescriptions("INVALID-CODE") == []


def test_empty_string_returns_empty_list() -> None:
    assert get_prescriptions("") == []


# ---------------------------------------------------------------------------
# Livestock codes have prescriptions
# ---------------------------------------------------------------------------

LIVESTOCK_CODES = [d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "animal"]
CROP_CODES      = [d["code"] for d in DISEASE_TAXONOMY if d["subject_type"] == "plant"]


def test_all_ten_livestock_codes_covered() -> None:
    assert len(LIVESTOCK_CODES) == 10
    for code in LIVESTOCK_CODES:
        assert get_prescriptions(code), f"No prescriptions for livestock code {code}"


def test_all_thirty_crop_codes_covered() -> None:
    assert len(CROP_CODES) == 30
    for code in CROP_CODES:
        assert get_prescriptions(code), f"No prescriptions for crop code {code}"


# ---------------------------------------------------------------------------
# Total count
# ---------------------------------------------------------------------------

def test_prescription_table_covers_all_forty_codes() -> None:
    assert len(PRESCRIPTIONS) == 40, (
        f"Expected 40 codes in PRESCRIPTIONS, found {len(PRESCRIPTIONS)}"
    )
