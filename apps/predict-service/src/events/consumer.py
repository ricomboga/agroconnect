from __future__ import annotations

import asyncio
import json

import structlog
from aiokafka import AIOKafkaConsumer

from src.config import settings

log = structlog.get_logger(__name__)

TOPICS = ("farm.harvest.recorded", "market.listing.created")
GROUP_ID = "predict-service-consumer"


class PredictConsumer:
    def __init__(self) -> None:
        self._consumer: AIOKafkaConsumer | None = None  # type: ignore[type-arg]

    async def start(self) -> None:
        self._consumer = AIOKafkaConsumer(
            *TOPICS,
            bootstrap_servers=settings.KAFKA_BROKERS,
            group_id=GROUP_ID,
            value_deserializer=lambda v: json.loads(v.decode()),
            auto_offset_reset="earliest",
        )
        await self._consumer.start()
        asyncio.create_task(self._consume_loop(), name="predict-consumer")
        log.info("kafka consumer started", topics=TOPICS)

    async def stop(self) -> None:
        if self._consumer:
            await self._consumer.stop()

    async def _consume_loop(self) -> None:
        assert self._consumer is not None
        async for msg in self._consumer:
            try:
                await self._dispatch(msg.topic, msg.value)
            except Exception:
                log.exception("unhandled error processing message", topic=msg.topic, offset=msg.offset)

    async def _dispatch(self, topic: str, payload: object) -> None:
        if topic == "farm.harvest.recorded":
            await self._handle_harvest_recorded(payload)
        elif topic == "market.listing.created":
            await self._handle_listing_created(payload)

    async def _handle_harvest_recorded(self, payload: object) -> None:
        if not isinstance(payload, dict):
            return
        farm_id = payload.get("farmId")
        crop = payload.get("crop")
        quantity_kg = payload.get("quantityKg")
        log.info(
            "harvest recorded — updating yield model inputs",
            farm_id=farm_id,
            crop=crop,
            quantity_kg=quantity_kg,
        )
        # Future: write to predict_db harvest_signals table for model retraining

    async def _handle_listing_created(self, payload: object) -> None:
        if not isinstance(payload, dict):
            return
        listing_id = payload.get("listingId")
        crop = payload.get("crop")
        quantity_kg = payload.get("quantityKg")
        asking_price = payload.get("askingPriceKes")
        county = payload.get("locationCounty")
        log.info(
            "listing created — updating market signal inputs",
            listing_id=listing_id,
            crop=crop,
            quantity_kg=quantity_kg,
            asking_price=asking_price,
            county=county,
        )
        # Future: write to predict_db market_signals table for price model retraining
