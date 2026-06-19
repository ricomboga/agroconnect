from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException

from src.models.diagnosis import (
    DiagnosisDocument,
    FarmerFeedback,
    FeedbackRequest,
)
from src.repositories.diagnosis_repository import DiagnosisRepository
from src.utils.disease_taxonomy import DISEASE_TAXONOMY, TAXONOMY_BY_CODE, DiseaseEntry

log = structlog.get_logger(__name__)

router = APIRouter()

# Repository injected at startup via set_repository(); avoids global state in tests.
_repo: DiagnosisRepository | None = None


def set_repository(repo: DiagnosisRepository) -> None:
    global _repo
    _repo = repo


def _get_repo() -> DiagnosisRepository:
    assert _repo is not None, "DiagnosisRepository not initialised"
    return _repo


# ---------------------------------------------------------------------------
# Diagnosis endpoints
# ---------------------------------------------------------------------------

@router.get("/diagnoses/{diagnosis_id}", response_model=DiagnosisDocument)
async def get_diagnosis(diagnosis_id: str) -> DiagnosisDocument:
    doc = await _get_repo().find_by_id(diagnosis_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return doc


@router.get("/diagnoses/farm/{farm_id}", response_model=list[DiagnosisDocument])
async def list_farm_diagnoses(
    farm_id: str,
    skip: int = 0,
    limit: int = 20,
) -> list[DiagnosisDocument]:
    return await _get_repo().find_by_farm(farm_id, skip=skip, limit=min(limit, 100))


@router.post("/diagnoses/{diagnosis_id}/feedback", status_code=204, response_model=None)
async def submit_feedback(diagnosis_id: str, body: FeedbackRequest) -> None:
    doc = await _get_repo().find_by_id(diagnosis_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    if doc.status != "completed":
        raise HTTPException(
            status_code=422, detail="Feedback can only be submitted on completed diagnoses"
        )
    feedback = FarmerFeedback(
        rating=body.rating,
        outcome=body.outcome,
        notes=body.notes,
        submitted_at=datetime.now(timezone.utc),
    )
    await _get_repo().update_feedback(diagnosis_id, feedback)


# ---------------------------------------------------------------------------
# Disease library endpoints (static taxonomy — no DB read)
# ---------------------------------------------------------------------------

@router.get("/diseases", response_model=list[DiseaseEntry])
async def list_diseases() -> list[DiseaseEntry]:
    return list(DISEASE_TAXONOMY)


@router.get("/diseases/{disease_code}", response_model=DiseaseEntry)
async def get_disease(disease_code: str) -> DiseaseEntry:
    entry = TAXONOMY_BY_CODE.get(disease_code)
    if entry is None:
        raise HTTPException(status_code=404, detail="Disease code not found")
    return entry
