from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class Prescription(BaseModel):
    step: int
    action: str
    product_name: str | None = None
    product_type: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    agrovet_product_id: str | None = None


class DiagnosisResult(BaseModel):
    disease_name: str
    disease_code: str
    confidence: float
    severity: str
    description: str
    affected_area: str | None = None


class AlternativeDiagnosis(BaseModel):
    disease_name: str
    confidence: float
    description: str


class FarmerFeedback(BaseModel):
    rating: int = Field(ge=1, le=5)
    outcome: Literal["resolved", "improved", "no_change", "worsened"]
    notes: str | None = None
    submitted_at: datetime


class DiagnosisDocument(BaseModel):
    id: str
    farm_id: str
    farmer_id: str
    subject_type: Literal["plant", "animal"]
    subject_name: str
    image_urls: list[str]
    ai_model_version: str
    diagnosis: DiagnosisResult | None = None
    alternative_diagnoses: list[AlternativeDiagnosis] = []
    prescriptions: list[Prescription] = []
    farmer_feedback: FarmerFeedback | None = None
    status: Literal["pending", "completed", "failed"]
    processing_time_ms: int | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Kafka event shapes
# ---------------------------------------------------------------------------

class DiagnosisSubmittedEvent(BaseModel):
    diagnosis_id: str
    farm_id: str
    farmer_id: str
    subject_type: Literal["plant", "animal"]
    subject_name: str
    image_urls: list[str]
    symptoms: str | None = None
    duration_days: int | None = None


class DiagnosisCompletedEvent(BaseModel):
    diagnosis_id: str
    farm_id: str
    farmer_id: str
    disease_code: str
    disease_name: str
    confidence: float
    severity: str
    status: Literal["completed", "failed"]


# ---------------------------------------------------------------------------
# REST request bodies
# ---------------------------------------------------------------------------

class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    outcome: Literal["resolved", "improved", "no_change", "worsened"]
    notes: str | None = None
