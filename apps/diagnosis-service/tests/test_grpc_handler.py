from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock

import pytest

# Requires generated proto stubs — run `make proto` first.
diagnosis_pb2 = pytest.importorskip(
    "diagnosis_pb2",
    reason="Generated proto stubs not found. Run `make proto` to generate them.",
)

from src.grpc.server import DiagnosisServicer
from src.models.diagnosis import DiagnosisDocument, DiagnosisResult
from tests.conftest import FakeGrpcContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _completed_doc(diagnosis_id: str = "507f1f77bcf86cd799439011") -> DiagnosisDocument:
    return DiagnosisDocument(
        id=diagnosis_id,
        farm_id="farm-uuid-001",
        farmer_id="farmer-uuid-001",
        subject_type="plant",
        subject_name="maize",
        image_urls=["s3://agroconnect-media-prod/diag/img1.jpg"],
        ai_model_version="mock-v0",
        diagnosis=DiagnosisResult(
            disease_name="Grey Leaf Spot",
            disease_code="MAI-GLS-001",
            confidence=0.91,
            severity="moderate",
            description="Grey Leaf Spot — caused by Fungal (Cercospora).",
        ),
        prescriptions=[],
        status="completed",
        processing_time_ms=120,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _pending_doc(diagnosis_id: str = "507f1f77bcf86cd799439011") -> DiagnosisDocument:
    return DiagnosisDocument(
        id=diagnosis_id,
        farm_id="farm-uuid-001",
        farmer_id="farmer-uuid-001",
        subject_type="plant",
        subject_name="maize",
        image_urls=[],
        ai_model_version="",
        status="pending",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def _make_diagnose_request(**overrides: object) -> object:
    defaults = dict(
        farm_id="farm-uuid-001",
        farmer_id="farmer-uuid-001",
        subject_type="plant",
        subject_name="maize",
        image_urls=["s3://agroconnect-media-prod/diag/img1.jpg"],
    )
    defaults.update(overrides)
    return diagnosis_pb2.DiagnoseRequest(**defaults)


# ---------------------------------------------------------------------------
# Diagnose RPC
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_diagnose_creates_pending_doc(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    servicer = DiagnosisServicer(mock_repo, mock_producer)
    response = await servicer.Diagnose(_make_diagnose_request(), fake_context)

    mock_repo.create_pending.assert_called_once_with(
        farm_id="farm-uuid-001",
        farmer_id="farmer-uuid-001",
        subject_type="plant",
        subject_name="maize",
        image_urls=["s3://agroconnect-media-prod/diag/img1.jpg"],
    )
    assert response.diagnosis_id == "507f1f77bcf86cd799439011"
    assert response.status == "pending"


@pytest.mark.asyncio
async def test_diagnose_publishes_submitted_event(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    servicer = DiagnosisServicer(mock_repo, mock_producer)
    await servicer.Diagnose(_make_diagnose_request(), fake_context)

    mock_producer.publish_submitted.assert_called_once()
    call_args = mock_producer.publish_submitted.call_args[0][0]
    assert call_args.diagnosis_id == "507f1f77bcf86cd799439011"
    assert call_args.farm_id == "farm-uuid-001"


@pytest.mark.asyncio
async def test_diagnose_passes_symptoms_to_event(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    servicer = DiagnosisServicer(mock_repo, mock_producer)
    await servicer.Diagnose(
        _make_diagnose_request(symptoms="yellowing leaves", duration_days=5),
        fake_context,
    )
    event = mock_producer.publish_submitted.call_args[0][0]
    assert event.symptoms == "yellowing leaves"
    assert event.duration_days == 5


# ---------------------------------------------------------------------------
# GetDiagnosis RPC
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_diagnosis_returns_completed_record(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    mock_repo.find_by_id.return_value = _completed_doc()
    servicer = DiagnosisServicer(mock_repo, mock_producer)

    request = diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="507f1f77bcf86cd799439011")
    record = await servicer.GetDiagnosis(request, fake_context)

    assert record.id == "507f1f77bcf86cd799439011"
    assert record.status == "completed"
    assert record.disease_code == "MAI-GLS-001"
    assert record.disease_name == "Grey Leaf Spot"
    assert abs(record.confidence - 0.91) < 1e-6


@pytest.mark.asyncio
async def test_get_diagnosis_not_found_aborts_with_not_found(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    mock_repo.find_by_id.return_value = None
    servicer = DiagnosisServicer(mock_repo, mock_producer)

    request = diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="000000000000000000000000")
    with pytest.raises(RuntimeError, match="gRPC aborted"):
        await servicer.GetDiagnosis(request, fake_context)

    import grpc
    assert fake_context.aborted is True
    assert fake_context._code == grpc.StatusCode.NOT_FOUND


@pytest.mark.asyncio
async def test_get_diagnosis_returns_pending_status(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    mock_repo.find_by_id.return_value = _pending_doc()
    servicer = DiagnosisServicer(mock_repo, mock_producer)

    request = diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="507f1f77bcf86cd799439011")
    record = await servicer.GetDiagnosis(request, fake_context)

    assert record.status == "pending"
    assert record.disease_code == ""
    assert record.confidence == 0.0


@pytest.mark.asyncio
async def test_get_diagnosis_calls_repo_with_correct_id(
    mock_repo: AsyncMock, mock_producer: AsyncMock, fake_context: FakeGrpcContext
) -> None:
    mock_repo.find_by_id.return_value = _completed_doc()
    servicer = DiagnosisServicer(mock_repo, mock_producer)

    request = diagnosis_pb2.GetDiagnosisRequest(diagnosis_id="507f1f77bcf86cd799439011")
    await servicer.GetDiagnosis(request, fake_context)

    mock_repo.find_by_id.assert_called_once_with("507f1f77bcf86cd799439011")
