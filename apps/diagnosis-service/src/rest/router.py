from __future__ import annotations

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, HTTPException

from src.models.diagnosis import (
    DiagnosisDocument,
    DiagnosisListResponse,
    DiseaseListResponse,
    FarmerFeedback,
    FeedbackRequest,
    SubmitDiagnosisRequest,
    SubmitDiagnosisResponse,
    DiagnosisSubmittedEvent,
)
from src.repositories.diagnosis_repository import DiagnosisRepository
from src.events.producer import DiagnosisProducer
from src.utils.disease_taxonomy import DISEASE_TAXONOMY, TAXONOMY_BY_CODE, DiseaseEntry

log = structlog.get_logger(__name__)

router = APIRouter()

_repo: DiagnosisRepository | None = None
_producer: DiagnosisProducer | None = None


def set_repository(repo: DiagnosisRepository) -> None:
    global _repo
    _repo = repo


def set_producer(producer: DiagnosisProducer) -> None:
    global _producer
    _producer = producer


def _get_repo() -> DiagnosisRepository:
    assert _repo is not None, "DiagnosisRepository not initialised"
    return _repo


def _get_producer() -> DiagnosisProducer:
    assert _producer is not None, "DiagnosisProducer not initialised"
    return _producer


# ---------------------------------------------------------------------------
# Diagnosis endpoints
# ---------------------------------------------------------------------------

@router.get("/diagnoses/{diagnosis_id}", response_model=DiagnosisDocument)
async def get_diagnosis(diagnosis_id: str) -> DiagnosisDocument:
    doc = await _get_repo().find_by_id(diagnosis_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Diagnosis not found")
    return doc


@router.get("/diagnoses/farm/{farm_id}", response_model=DiagnosisListResponse)
async def list_farm_diagnoses(
    farm_id: str,
    skip: int = 0,
    limit: int = 20,
) -> DiagnosisListResponse:
    items, total = await asyncio.gather(
        _get_repo().find_by_farm(farm_id, skip=skip, limit=min(limit, 100)),
        _get_repo().count_by_farm(farm_id),
    )
    return DiagnosisListResponse(data=items, total=total)


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
# Internal endpoint — called by farm-service (not exposed through gateway)
# ---------------------------------------------------------------------------

@router.post("/internal/diagnoses/submit", response_model=SubmitDiagnosisResponse, status_code=201)
async def submit_diagnosis_internal(body: SubmitDiagnosisRequest) -> SubmitDiagnosisResponse:
    diagnosis_id = await _get_repo().create_pending(
        farm_id=body.farm_id,
        farmer_id=body.farmer_id,
        subject_type=body.subject_type,
        subject_name=body.subject_name,
        image_urls=body.image_urls,
    )
    event = DiagnosisSubmittedEvent(
        diagnosis_id=diagnosis_id,
        farm_id=body.farm_id,
        farmer_id=body.farmer_id,
        subject_type=body.subject_type,
        subject_name=body.subject_name,
        image_urls=body.image_urls,
        symptoms=body.symptoms,
        duration_days=body.duration_days,
    )
    await _get_producer().publish_submitted(event)
    log.info(
        "diagnosis queued via REST internal",
        diagnosis_id=diagnosis_id,
        farm_id=body.farm_id,
        subject_type=body.subject_type,
    )
    return SubmitDiagnosisResponse(id=diagnosis_id, status="pending")


# ---------------------------------------------------------------------------
# Disease library endpoints (static taxonomy — no DB read)
# ---------------------------------------------------------------------------

@router.get("/diseases", response_model=DiseaseListResponse)
async def list_diseases() -> DiseaseListResponse:
    items = list(DISEASE_TAXONOMY)
    return DiseaseListResponse(data=items, total=len(items))


@router.get("/diseases/{disease_code}", response_model=DiseaseEntry)
async def get_disease(disease_code: str) -> DiseaseEntry:
    entry = TAXONOMY_BY_CODE.get(disease_code)
    if entry is None:
        raise HTTPException(status_code=404, detail="Disease code not found")
    return entry


import asyncio  # noqa: E402 — imported here to keep top-level imports clean
