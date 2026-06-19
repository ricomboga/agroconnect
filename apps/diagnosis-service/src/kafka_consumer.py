"""
Kafka consumer for the diagnosis-service.

Topic consumed:  diagnosis.submitted
Topic produced:  diagnosis.completed
Consumer group:  diagnosis-service-consumer  (settings.KAFKA_CONSUMER_GROUP)

Flow
────
  1. Receive DiagnosisSubmittedEvent from diagnosis.submitted.
  2. Call inference_service.run_inference (synchronous mock; swap in real model later).
  3. Get prescriptions for the returned disease code.
  4. Upsert the MongoDB document (farm-service may have already created a pending record;
     if so, we update it; otherwise we insert with all required fields).
  5. Publish DiagnosisCompletedEvent to diagnosis.completed.

Error invariant
───────────────
  The consume loop body is wrapped in a blanket try/except. Any failure — malformed
  message, inference error, DB write error, Kafka publish error — is logged and the
  loop continues with the next message. Unhandled exceptions are never raised out of
  the loop; the consumer remains alive.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Any

import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import ValidationError

from src.config import settings
from src.inference_service import run_inference
from src.models.diagnosis import DiagnosisCompletedEvent, DiagnosisSubmittedEvent
from src.prescription_service import get_prescriptions

log = structlog.get_logger(__name__)

_AI_MODEL_VERSION = "mock-v0"


class DiagnosisKafkaConsumer:
    """
    Owns both the AIOKafkaConsumer (diagnosis.submitted) and the
    AIOKafkaProducer (diagnosis.completed) so it is fully self-contained.

    mongo_col: AsyncIOMotorCollection — the "diagnoses" collection.
    """

    def __init__(self, mongo_col: Any) -> None:
        self._col = mongo_col
        self._consumer: AIOKafkaConsumer | None = None  # type: ignore[type-arg]
        self._producer: AIOKafkaProducer | None = None  # type: ignore[type-arg]

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            "diagnosis.submitted",
            bootstrap_servers=settings.KAFKA_BROKERS,
            group_id=settings.KAFKA_CONSUMER_GROUP,
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="earliest",
            enable_auto_commit=True,
        )
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        await self._consumer.start()
        await self._producer.start()
        asyncio.create_task(self._consume_loop(), name="diagnosis-kafka-consumer")
        log.info(
            "kafka consumer started",
            topic="diagnosis.submitted",
            group=settings.KAFKA_CONSUMER_GROUP,
        )

    async def stop(self) -> None:
        if self._consumer:
            await self._consumer.stop()
        if self._producer:
            await self._producer.stop()
        log.info("kafka consumer stopped")

    # ------------------------------------------------------------------
    # Consume loop — must never raise
    # ------------------------------------------------------------------

    async def _consume_loop(self) -> None:
        assert self._consumer is not None
        async for msg in self._consumer:
            try:
                await self._process_message(msg)
            except Exception:
                log.exception(
                    "unhandled error in consume loop",
                    topic=msg.topic,
                    partition=msg.partition,
                    offset=msg.offset,
                )
                # continue — the loop must stay alive

    async def _process_message(self, msg: Any) -> None:
        # ── Step 1: Deserialise event ─────────────────────────────────
        try:
            event = DiagnosisSubmittedEvent.model_validate(msg.value)
        except ValidationError:
            log.exception("malformed diagnosis.submitted event", offset=msg.offset)
            return

        log.info(
            "diagnosis.submitted received",
            diagnosis_id=event.diagnosis_id,
            subject_type=event.subject_type,
            subject_name=event.subject_name,
        )

        start_ns = time.monotonic_ns()
        now = datetime.now(timezone.utc)

        # Resolve to a bson ObjectId if possible; fall back to a new one.
        try:
            oid = ObjectId(event.diagnosis_id)
        except InvalidId:
            log.warning(
                "diagnosis_id is not a valid ObjectId, generating new one",
                received_id=event.diagnosis_id,
            )
            oid = ObjectId()
            event = event.model_copy(update={"diagnosis_id": str(oid)})

        # ── Step 2: Run inference ─────────────────────────────────────
        try:
            # REPLACE_WITH_EFFICIENTNET: fetch image_bytes from event.image_urls here.
            result = run_inference([], event.subject_type, event.subject_name)
            elapsed_ms = (time.monotonic_ns() - start_ns) // 1_000_000
            prescriptions = get_prescriptions(result.disease_code)
        except Exception:
            log.exception("inference failed", diagnosis_id=event.diagnosis_id)
            await self._save_failed(oid, event, now)
            await self._publish_failed(event, now)
            return

        # ── Step 3: Upsert completed document ─────────────────────────
        try:
            await self._save_completed(oid, event, result, prescriptions, elapsed_ms, now)
        except Exception:
            log.exception("mongodb write failed", diagnosis_id=event.diagnosis_id)
            # Best-effort: still publish completed so downstream knows the result.

        # ── Step 4: Publish diagnosis.completed ───────────────────────
        try:
            await self._publish_completed(event, result, now)
        except Exception:
            log.exception("failed to publish diagnosis.completed", diagnosis_id=event.diagnosis_id)

        log.info(
            "diagnosis processed",
            diagnosis_id=event.diagnosis_id,
            disease_code=result.disease_code,
            confidence=result.confidence,
            elapsed_ms=elapsed_ms,
        )

    # ------------------------------------------------------------------
    # MongoDB helpers
    # ------------------------------------------------------------------

    async def _save_completed(
        self,
        oid: ObjectId,
        event: DiagnosisSubmittedEvent,
        result: Any,
        prescriptions: list[dict[str, Any]],
        elapsed_ms: int,
        now: datetime,
    ) -> None:
        update = {
            "$set": {
                "farm_id": event.farm_id,
                "farmer_id": event.farmer_id,
                "subject_type": event.subject_type,
                "subject_name": event.subject_name,
                "image_urls": event.image_urls,
                "ai_model_version": _AI_MODEL_VERSION,
                "diagnosis": {
                    "disease_name": result.disease_name,
                    "disease_code": result.disease_code,
                    "confidence": result.confidence,
                    "severity": result.severity,
                    "description": result.description,
                    "affected_area": None,
                },
                "alternative_diagnoses": [],
                "prescriptions": prescriptions,
                "status": "completed",
                "processing_time_ms": elapsed_ms,
                "updated_at": now,
            },
            "$setOnInsert": {
                "farmer_feedback": None,
                "created_at": now,
            },
        }
        await self._col.update_one({"_id": oid}, update, upsert=True)

    async def _save_failed(
        self, oid: ObjectId, event: DiagnosisSubmittedEvent, now: datetime
    ) -> None:
        update = {
            "$set": {
                "farm_id": event.farm_id,
                "farmer_id": event.farmer_id,
                "subject_type": event.subject_type,
                "subject_name": event.subject_name,
                "image_urls": event.image_urls,
                "ai_model_version": _AI_MODEL_VERSION,
                "diagnosis": None,
                "alternative_diagnoses": [],
                "prescriptions": [],
                "status": "failed",
                "processing_time_ms": None,
                "updated_at": now,
            },
            "$setOnInsert": {
                "farmer_feedback": None,
                "created_at": now,
            },
        }
        try:
            await self._col.update_one({"_id": oid}, update, upsert=True)
        except Exception:
            log.exception("failed to write failure record to mongodb", diagnosis_id=str(oid))

    # ------------------------------------------------------------------
    # Kafka publish helpers
    # ------------------------------------------------------------------

    async def _publish_completed(
        self, event: DiagnosisSubmittedEvent, result: Any, _now: datetime
    ) -> None:
        assert self._producer is not None
        payload = DiagnosisCompletedEvent(
            diagnosis_id=event.diagnosis_id,
            farm_id=event.farm_id,
            farmer_id=event.farmer_id,
            disease_code=result.disease_code,
            disease_name=result.disease_name,
            confidence=result.confidence,
            severity=result.severity,
            status="completed",
        )
        await self._producer.send_and_wait(
            "diagnosis.completed",
            value=payload.model_dump(mode="json"),
            key=event.diagnosis_id.encode(),
        )
        log.info(
            "diagnosis.completed published",
            diagnosis_id=event.diagnosis_id,
            disease_code=result.disease_code,
        )

    async def _publish_failed(
        self, event: DiagnosisSubmittedEvent, _now: datetime
    ) -> None:
        assert self._producer is not None
        payload = DiagnosisCompletedEvent(
            diagnosis_id=event.diagnosis_id,
            farm_id=event.farm_id,
            farmer_id=event.farmer_id,
            disease_code="",
            disease_name="",
            confidence=0.0,
            severity="",
            status="failed",
        )
        try:
            await self._producer.send_and_wait(
                "diagnosis.completed",
                value=payload.model_dump(mode="json"),
                key=event.diagnosis_id.encode(),
            )
            log.info(
                "diagnosis.completed (failed) published",
                diagnosis_id=event.diagnosis_id,
            )
        except Exception:
            log.exception("could not publish failure event", diagnosis_id=event.diagnosis_id)
