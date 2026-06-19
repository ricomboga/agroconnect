"""
Integration tests for src/grpc_server.py — DiagnosisServicer.

MongoDB is mocked (AsyncMock); no real DB, Kafka, or gRPC server required.
Proto stubs are loaded from src/ (minimal Python stubs — replaced by `make proto`).
"""
from __future__ import annotations

import pytest
from bson import ObjectId
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

# Guard: skip entire file if proto stubs are absent.
# With the stub files in src/, this skip should never trigger locally.
pytest.importorskip(
    "diagnosis_pb2",
    reason="Proto stubs not found. Run `make proto` or check src/diagnosis_pb2.py.",
)

import diagnosis_pb2  # noqa: E402 — import after importorskip guard
from src.grpc_server import DiagnosisServicer  # shadow fix runs here, corrects sys.modules['grpc']
from src.inference_service import VALID_ANIMAL_CODES, VALID_PLANT_CODES
from src.utils.disease_taxonomy import TAXONOMY_BY_CODE
from tests.conftest import FakeGrpcContext

# Import grpc AFTER DiagnosisServicer so its grpcio-shadow fix has already corrected
# sys.modules['grpc'] to the real installed grpcio package.
import grpc  # noqa: E402


# ---------------------------------------------------------------------------
# Test helpers
# ---------------------------------------------------------------------------

def _make_mongo_db() -> tuple[MagicMock, AsyncMock]:
    """Return (mock_db, mock_col) where mock_db['diagnoses'] → mock_col."""
    col: AsyncMock = AsyncMock()
    col.insert_one.return_value = AsyncMock()
    col.find_one.return_value = None
    db = MagicMock()
    db.__getitem__ = MagicMock(return_value=col)
    return db, col


def _make_diagnose_request(**overrides: object) -> diagnosis_pb2.DiagnoseRequest:
    defaults: dict[str, object] = dict(
        farm_id="farm-001",
        farmer_id="farmer-001",
        subject_type="plant",
        subject_name="maize",
        image_urls=["s3://agroconnect-media-prod/diag/img1.jpg"],
        symptoms="yellowing leaves",
        duration_days=3,
    )
    defaults.update(overrides)
    return diagnosis_pb2.DiagnoseRequest(**defaults)


def _stored_completed_doc(oid: ObjectId) -> dict:
    return {
        "_id": oid,
        "status": "completed",
        "farm_id": "farm-001",
        "farmer_id": "farmer-001",
        "subject_type": "plant",
        "subject_name": "maize",
        "ai_model_version": "mock-v0",
        "diagnosis": {
            "disease_name": "Grey Leaf Spot",
            "disease_code": "MAI-GLS-001",
            "confidence": 0.91,
            "severity": "moderate",
            "description": "Grey Leaf Spot — caused by Fungal (Cercospora).",
            "affected_area": None,
        },
        "prescriptions": [
            {
                "step_number": 1,
                "action": "Apply fungicide",
                "product_name": "Ridomil Gold",
                "product_type": "fungicide",
                "dosage": "2 g/L water",
                "frequency": "Every 14 days",
            }
        ],
        "processing_time_ms": 120,
        "created_at": datetime.now(timezone.utc),
    }


# ---------------------------------------------------------------------------
# Diagnose — happy path: response fields
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnose_returns_completed_status(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert response.status == "completed"


@pytest.mark.asyncio
async def test_diagnose_returns_valid_disease_code(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert response.disease_code in TAXONOMY_BY_CODE, (
        f"Returned code {response.disease_code!r} is not in taxonomy"
    )


@pytest.mark.asyncio
async def test_diagnose_plant_subject_returns_crop_code(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(
        _make_diagnose_request(subject_type="plant"), fake_context
    )
    assert response.disease_code in VALID_PLANT_CODES


@pytest.mark.asyncio
async def test_diagnose_animal_subject_returns_livestock_code(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(
        _make_diagnose_request(subject_type="animal", subject_name="cattle"), fake_context
    )
    assert response.disease_code in VALID_ANIMAL_CODES


@pytest.mark.asyncio
async def test_diagnose_disease_name_matches_taxonomy(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    expected_name = TAXONOMY_BY_CODE[response.disease_code]["name"]
    assert response.disease_name == expected_name


@pytest.mark.asyncio
async def test_diagnose_confidence_in_mock_range(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert 0.75 <= response.confidence <= 0.97, (
        f"Confidence {response.confidence} outside [0.75, 0.97]"
    )


@pytest.mark.asyncio
async def test_diagnose_returns_mock_ai_model_version(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert response.ai_model_version == "mock-v0"


@pytest.mark.asyncio
async def test_diagnose_returns_at_least_one_prescription(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert len(response.prescriptions) >= 1
    first = response.prescriptions[0]
    assert first.step_number == 1
    assert first.action


@pytest.mark.asyncio
async def test_diagnose_returns_nonempty_description(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert response.description
    assert response.disease_name in response.description


# ---------------------------------------------------------------------------
# Diagnose — MongoDB persistence
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnose_inserts_one_document(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    col.insert_one.assert_called_once()


@pytest.mark.asyncio
async def test_diagnose_document_status_is_completed(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    doc = col.insert_one.call_args[0][0]
    assert doc["status"] == "completed"


@pytest.mark.asyncio
async def test_diagnose_document_has_required_schema_fields(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    doc = col.insert_one.call_args[0][0]
    required = {
        "_id", "farm_id", "farmer_id", "subject_type", "subject_name",
        "image_urls", "ai_model_version", "diagnosis", "alternative_diagnoses",
        "prescriptions", "farmer_feedback", "status", "processing_time_ms",
        "created_at", "updated_at",
    }
    missing = required - doc.keys()
    assert not missing, f"Document missing fields: {missing}"


@pytest.mark.asyncio
async def test_diagnose_document_diagnosis_subdoc_structure(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    doc = col.insert_one.call_args[0][0]
    diag = doc["diagnosis"]
    assert diag["disease_code"] in TAXONOMY_BY_CODE
    assert diag["affected_area"] is None
    assert 0.75 <= diag["confidence"] <= 0.97


@pytest.mark.asyncio
async def test_diagnose_document_nullable_fields_are_none(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    doc = col.insert_one.call_args[0][0]
    assert doc["farmer_feedback"] is None
    assert doc["alternative_diagnoses"] == []


@pytest.mark.asyncio
async def test_diagnose_response_id_matches_inserted_document(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    response = await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    doc = col.insert_one.call_args[0][0]
    assert response.diagnosis_id == str(doc["_id"])


# ---------------------------------------------------------------------------
# Diagnose — Kafka producer (optional)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnose_without_producer_succeeds(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    response = await DiagnosisServicer(db, kafka_producer=None).Diagnose(
        _make_diagnose_request(), fake_context
    )
    assert response.status == "completed"


@pytest.mark.asyncio
async def test_diagnose_with_producer_calls_publish_completed(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    producer = AsyncMock()
    await DiagnosisServicer(db, kafka_producer=producer).Diagnose(
        _make_diagnose_request(), fake_context
    )
    producer.publish_completed.assert_called_once()


@pytest.mark.asyncio
async def test_diagnose_producer_failure_does_not_abort_rpc(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    producer = AsyncMock()
    producer.publish_completed.side_effect = RuntimeError("kafka down")
    response = await DiagnosisServicer(db, kafka_producer=producer).Diagnose(
        _make_diagnose_request(), fake_context
    )
    assert response.status == "completed"


# ---------------------------------------------------------------------------
# Diagnose — inference error path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnose_inference_error_aborts_with_internal(
    fake_context: FakeGrpcContext, monkeypatch: pytest.MonkeyPatch
) -> None:
    import src.grpc_server as mod

    def _raise(*_: object) -> None:
        raise RuntimeError("model crashed")

    monkeypatch.setattr(mod, "run_inference", _raise)
    db, _ = _make_mongo_db()
    with pytest.raises(RuntimeError):
        await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    assert fake_context.aborted is True
    assert fake_context._code == grpc.StatusCode.INTERNAL


@pytest.mark.asyncio
async def test_diagnose_inference_error_saves_failed_document(
    fake_context: FakeGrpcContext, monkeypatch: pytest.MonkeyPatch
) -> None:
    import src.grpc_server as mod

    def _raise(*_: object) -> None:
        raise RuntimeError("model crashed")

    monkeypatch.setattr(mod, "run_inference", _raise)
    db, col = _make_mongo_db()
    with pytest.raises(RuntimeError):
        await DiagnosisServicer(db).Diagnose(_make_diagnose_request(), fake_context)
    col.insert_one.assert_called_once()
    doc = col.insert_one.call_args[0][0]
    assert doc["status"] == "failed"
    assert doc["diagnosis"] is None


# ---------------------------------------------------------------------------
# GetDiagnosis — record retrieval
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_diagnosis_returns_correct_id_and_status(fake_context: FakeGrpcContext) -> None:
    oid = ObjectId()
    db, col = _make_mongo_db()
    col.find_one.return_value = _stored_completed_doc(oid)
    record = await DiagnosisServicer(db).GetDiagnosis(
        diagnosis_pb2.GetDiagnosisRequest(diagnosis_id=str(oid)), fake_context
    )
    assert record.id == str(oid)
    assert record.status == "completed"


@pytest.mark.asyncio
async def test_get_diagnosis_returns_disease_fields(fake_context: FakeGrpcContext) -> None:
    oid = ObjectId()
    db, col = _make_mongo_db()
    col.find_one.return_value = _stored_completed_doc(oid)
    record = await DiagnosisServicer(db).GetDiagnosis(
        diagnosis_pb2.GetDiagnosisRequest(diagnosis_id=str(oid)), fake_context
    )
    assert record.disease_code == "MAI-GLS-001"
    assert record.disease_name == "Grey Leaf Spot"
    assert abs(record.confidence - 0.91) < 1e-6
    assert record.severity == "moderate"


@pytest.mark.asyncio
async def test_get_diagnosis_returns_prescriptions(fake_context: FakeGrpcContext) -> None:
    oid = ObjectId()
    db, col = _make_mongo_db()
    col.find_one.return_value = _stored_completed_doc(oid)
    record = await DiagnosisServicer(db).GetDiagnosis(
        diagnosis_pb2.GetDiagnosisRequest(diagnosis_id=str(oid)), fake_context
    )
    assert len(record.prescriptions) == 1
    assert record.prescriptions[0].step_number == 1
    assert record.prescriptions[0].action == "Apply fungicide"


@pytest.mark.asyncio
async def test_get_diagnosis_returns_ai_model_version(fake_context: FakeGrpcContext) -> None:
    oid = ObjectId()
    db, col = _make_mongo_db()
    col.find_one.return_value = _stored_completed_doc(oid)
    record = await DiagnosisServicer(db).GetDiagnosis(
        diagnosis_pb2.GetDiagnosisRequest(diagnosis_id=str(oid)), fake_context
    )
    assert record.ai_model_version == "mock-v0"


# ---------------------------------------------------------------------------
# GetDiagnosis — error paths
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_diagnosis_not_found_aborts_with_not_found(fake_context: FakeGrpcContext) -> None:
    db, col = _make_mongo_db()
    col.find_one.return_value = None
    with pytest.raises(RuntimeError, match="gRPC aborted"):
        await DiagnosisServicer(db).GetDiagnosis(
            diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="507f1f77bcf86cd799439011"),
            fake_context,
        )
    assert fake_context.aborted is True
    assert fake_context._code == grpc.StatusCode.NOT_FOUND


@pytest.mark.asyncio
async def test_get_diagnosis_invalid_object_id_aborts(fake_context: FakeGrpcContext) -> None:
    db, _ = _make_mongo_db()
    with pytest.raises(RuntimeError, match="gRPC aborted"):
        await DiagnosisServicer(db).GetDiagnosis(
            diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="not-a-valid-oid"),
            fake_context,
        )
    assert fake_context.aborted is True
    assert fake_context._code == grpc.StatusCode.INVALID_ARGUMENT


# ---------------------------------------------------------------------------
# Round-trip: Diagnose → GetDiagnosis via shared in-memory store
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnose_then_get_diagnosis_round_trip(fake_context: FakeGrpcContext) -> None:
    """
    Verify that the document inserted during Diagnose is retrievable via GetDiagnosis
    using the same diagnosis_id — simulating the full read/write cycle.
    """
    db, col = _make_mongo_db()
    servicer = DiagnosisServicer(db)

    # Step 1: run Diagnose, capture the inserted document
    diag_response = await servicer.Diagnose(_make_diagnose_request(), fake_context)
    inserted_doc = col.insert_one.call_args[0][0]

    # Step 2: wire find_one to return the same document
    col.find_one.return_value = inserted_doc

    # Step 3: GetDiagnosis with the returned diagnosis_id
    record = await servicer.GetDiagnosis(
        diagnosis_pb2.GetDiagnosisRequest(diagnosis_id=diag_response.diagnosis_id),
        fake_context,
    )

    assert record.id == diag_response.diagnosis_id
    assert record.status == "completed"
    assert record.disease_code == diag_response.disease_code
    assert record.disease_name == diag_response.disease_name
    assert abs(record.confidence - diag_response.confidence) < 1e-6
