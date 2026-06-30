from __future__ import annotations

import json
from datetime import datetime, timezone

import structlog
from aiokafka import AIOKafkaProducer

from src.config import settings
from src.inference.mock_engine import InferenceResult
from src.models.diagnosis import DiagnosisCompletedEvent, DiagnosisSubmittedEvent

log = structlog.get_logger(__name__)


class DiagnosisProducer:
    def __init__(self) -> None:
        self._producer: AIOKafkaProducer | None = None  # type: ignore[type-arg]

    async def start(self) -> None:
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v, default=str).encode(),
        )
        await self._producer.start()
        log.info("kafka producer started")

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()

    async def publish_submitted(self, event: DiagnosisSubmittedEvent) -> None:
        assert self._producer is not None, "producer not started"
        await self._producer.send_and_wait(
            "diagnosis.submitted",
            value=event.model_dump(mode="json"),
            key=event.diagnosis_id.encode(),
        )
        log.info("diagnosis.submitted published", diagnosis_id=event.diagnosis_id)

    async def publish_completed(
        self,
        diagnosis_id: str,
        farm_id: str,
        farmer_id: str,
        subject_type: str,
        subject_name: str,
        result: InferenceResult,
    ) -> None:
        assert self._producer is not None, "producer not started"
        event = DiagnosisCompletedEvent(
            diagnosis_id=diagnosis_id,
            farm_id=farm_id,
            farmer_id=farmer_id,
            subject_type=subject_type,
            subject_name=subject_name,
            disease_code=result.disease["code"],
            disease_name=result.disease["name"],
            confidence=result.confidence,
            severity=result.severity,
            status="completed",
            occurred_at=datetime.now(timezone.utc),
        )
        await self._producer.send_and_wait(
            "diagnosis.completed",
            value=event.model_dump(mode="json"),
            key=diagnosis_id.encode(),
        )
        log.info(
            "diagnosis.completed published",
            diagnosis_id=diagnosis_id,
            disease_code=result.disease["code"],
        )
