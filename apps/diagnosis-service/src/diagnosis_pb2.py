"""
Minimal Python stub for generated protobuf classes.

THIS FILE IS A PLACEHOLDER — run `make proto` (scripts/gen_proto.sh) to replace it
with the real protoc-generated output. The real file will be overwritten here.

Stub is intentionally kept structurally compatible so tests pass without the build step.
"""
from __future__ import annotations


class DiagnoseRequest:
    def __init__(
        self,
        farm_id: str = "",
        farmer_id: str = "",
        subject_type: str = "",
        subject_name: str = "",
        image_urls: list[str] | None = None,
        symptoms: str = "",
        duration_days: int = 0,
    ) -> None:
        self.farm_id = farm_id
        self.farmer_id = farmer_id
        self.subject_type = subject_type
        self.subject_name = subject_name
        self.image_urls = image_urls if image_urls is not None else []
        self.symptoms = symptoms
        self.duration_days = duration_days


class PrescriptionProto:
    def __init__(
        self,
        step_number: int = 0,
        action: str = "",
        product_name: str = "",
        product_type: str = "",
        dosage: str = "",
        frequency: str = "",
    ) -> None:
        self.step_number = step_number
        self.action = action
        self.product_name = product_name
        self.product_type = product_type
        self.dosage = dosage
        self.frequency = frequency


class DiagnoseResponse:
    def __init__(
        self,
        diagnosis_id: str = "",
        status: str = "",
        disease_name: str = "",
        disease_code: str = "",
        confidence: float = 0.0,
        severity: str = "",
        description: str = "",
        prescriptions: list[PrescriptionProto] | None = None,
        processing_time_ms: int = 0,
        ai_model_version: str = "",
    ) -> None:
        self.diagnosis_id = diagnosis_id
        self.status = status
        self.disease_name = disease_name
        self.disease_code = disease_code
        self.confidence = confidence
        self.severity = severity
        self.description = description
        self.prescriptions = list(prescriptions) if prescriptions is not None else []
        self.processing_time_ms = processing_time_ms
        self.ai_model_version = ai_model_version


class GetDiagnosisRequest:
    def __init__(self, diagnosis_id: str = "") -> None:
        self.diagnosis_id = diagnosis_id


class DiagnosisRecord:
    def __init__(
        self,
        id: str = "",
        status: str = "",
        farm_id: str = "",
        farmer_id: str = "",
        subject_type: str = "",
        subject_name: str = "",
        disease_name: str = "",
        disease_code: str = "",
        confidence: float = 0.0,
        severity: str = "",
        description: str = "",
        processing_time_ms: int = 0,
        ai_model_version: str = "",
        created_at: str = "",
    ) -> None:
        self.id = id
        self.status = status
        self.farm_id = farm_id
        self.farmer_id = farmer_id
        self.subject_type = subject_type
        self.subject_name = subject_name
        self.disease_name = disease_name
        self.disease_code = disease_code
        self.confidence = confidence
        self.severity = severity
        self.description = description
        self.processing_time_ms = processing_time_ms
        self.ai_model_version = ai_model_version
        self.created_at = created_at
        self.prescriptions: list[PrescriptionProto] = []  # appended by server code
