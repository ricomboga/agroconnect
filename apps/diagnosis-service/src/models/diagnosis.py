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
    severity: Literal["mild", "moderate", "severe", "critical"]
    description: str
    affected_area: str | None = None


class AlternativeDiagnosis(BaseModel):
    disease_name: str
    confidence: float
    description: str


class SubjectInfo(BaseModel):
    type: Literal["plant", "animal"]
    name: str


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
    # Convenience nested object for REST consumers
    subject: SubjectInfo | None = None
    image_urls: list[str]
    ai_model_version: str
    diagnosis: DiagnosisResult | None = None
    alternative_diagnoses: list[AlternativeDiagnosis] = []
    prescriptions: list[Prescription] = []
    farmer_feedback: FarmerFeedback | None = None
    status: Literal["pending", "processing", "completed", "failed"]
    processing_time_ms: int | None = None
    created_at: datetime
    updated_at: datetime

    def model_post_init(self, __context: object) -> None:
        if self.subject is None:
            object.__setattr__(self, "subject", SubjectInfo(type=self.subject_type, name=self.subject_name))


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
    subject_type: str
    subject_name: str
    disease_code: str
    disease_name: str
    confidence: float
    severity: str
    status: Literal["completed", "failed"]
    occurred_at: datetime


# ---------------------------------------------------------------------------
# REST request / response bodies
# ---------------------------------------------------------------------------

class FeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    outcome: Literal["resolved", "improved", "no_change", "worsened"]
    notes: str | None = None


class SubmitDiagnosisRequest(BaseModel):
    farm_id: str
    farmer_id: str
    subject_type: Literal["plant", "animal"]
    subject_name: str
    image_urls: list[str] = Field(min_length=0, max_length=5)
    symptoms: str | None = None
    duration_days: int | None = None


class SubmitDiagnosisResponse(BaseModel):
    id: str
    status: str


class DiagnosisListResponse(BaseModel):
    data: list[DiagnosisDocument]
    total: int


class DiseaseListResponse(BaseModel):
    data: list  # list[DiseaseEntry] — imported at router level to avoid circular
    total: int
