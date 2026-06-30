from __future__ import annotations

import asyncio
import json
import time

import structlog
from aiokafka import AIOKafkaConsumer
from pydantic import ValidationError

from src.config import settings
from src.events.producer import DiagnosisProducer
from src.inference.engine import get_engine
from src.models.diagnosis import DiagnosisSubmittedEvent
from src.repositories.diagnosis_repository import DiagnosisRepository

log = structlog.get_logger(__name__)


class DiagnosisConsumer:
    def __init__(self, repo: DiagnosisRepository, producer: DiagnosisProducer) -> None:
        self._repo = repo
        self._producer = producer
        self._consumer: AIOKafkaConsumer | None = None  # type: ignore[type-arg]

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            "diagnosis.submitted",
            bootstrap_servers=settings.KAFKA_BROKERS,
            group_id=settings.KAFKA_CONSUMER_GROUP,
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="earliest",
        )
        await self._consumer.start()
        asyncio.create_task(self._consume_loop(), name="diagnosis-consumer")
        log.info("kafka consumer started", topic="diagnosis.submitted")

    async def stop(self) -> None:
        if self._consumer:
            await self._consumer.stop()

    async def _consume_loop(self) -> None:
        assert self._consumer is not None
        async for msg in self._consumer:
            try:
                event = DiagnosisSubmittedEvent.model_validate(msg.value)
            except ValidationError:
                log.exception("malformed diagnosis.submitted event", offset=msg.offset)
                continue
            try:
                await self._handle(event)
            except Exception:
                log.exception(
                    "unhandled error processing diagnosis.submitted",
                    diagnosis_id=event.diagnosis_id,
                    offset=msg.offset,
                )

    async def _handle(self, event: DiagnosisSubmittedEvent) -> None:
        log.info("inference started", diagnosis_id=event.diagnosis_id)
        await self._repo.update_processing(event.diagnosis_id)
        engine = get_engine()
        start_ns = time.monotonic_ns()
        try:
            result = await engine.run(
                event.image_urls, event.subject_type, event.subject_name
            )
            elapsed_ms = (time.monotonic_ns() - start_ns) // 1_000_000

            await self._repo.update_completed(event.diagnosis_id, result, elapsed_ms)
            await self._producer.publish_completed(
                diagnosis_id=event.diagnosis_id,
                farm_id=event.farm_id,
                farmer_id=event.farmer_id,
                subject_type=event.subject_type,
                subject_name=event.subject_name,
                result=result,
            )
            log.info(
                "inference complete",
                diagnosis_id=event.diagnosis_id,
                disease_code=result.disease["code"],
                confidence=result.confidence,
                elapsed_ms=elapsed_ms,
            )
        except Exception:
            log.exception("inference failed", diagnosis_id=event.diagnosis_id)
            await self._repo.update_failed(event.diagnosis_id)
