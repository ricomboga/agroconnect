from __future__ import annotations

import diagnosis_pb2  # type: ignore[import]

from src.models.diagnosis import DiagnosisDocument


def doc_to_grpc_record(doc: DiagnosisDocument) -> diagnosis_pb2.DiagnosisRecord:
    record = diagnosis_pb2.DiagnosisRecord(
        id=doc.id,
        status=doc.status,
        farm_id=doc.farm_id,
        farmer_id=doc.farmer_id,
        subject_type=doc.subject_type,
        subject_name=doc.subject_name,
        processing_time_ms=doc.processing_time_ms or 0,
        ai_model_version=doc.ai_model_version,
        created_at=doc.created_at.isoformat(),
    )

    if doc.diagnosis:
        record.disease_name = doc.diagnosis.disease_name
        record.disease_code = doc.diagnosis.disease_code
        record.confidence = doc.diagnosis.confidence
        record.severity = doc.diagnosis.severity
        record.description = doc.diagnosis.description

    for p in doc.prescriptions:
        record.prescriptions.append(
            diagnosis_pb2.PrescriptionProto(
                step=p.step if hasattr(p, "step") else p["step"],
                action=p.action if hasattr(p, "action") else p["action"],
                product_name=_str(p, "product_name"),
                dosage=_str(p, "dosage"),
                frequency=_str(p, "frequency"),
            )
        )

    return record


def _str(obj: object, key: str) -> str:
    val = getattr(obj, key, None) if hasattr(obj, key) else (obj.get(key) if isinstance(obj, dict) else None)  # type: ignore[union-attr]
    return val or ""
