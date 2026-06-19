from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

import structlog

from src.config import settings
from src.schemas.weather import WeatherAlert

if TYPE_CHECKING:
    from aiokafka import AIOKafkaProducer

log = structlog.get_logger(__name__)

_TOPIC = "weather.alert.issued"


class WeatherProducer:
    def __init__(self) -> None:
        self._producer: "AIOKafkaProducer | None" = None

    async def start(self) -> None:
        from aiokafka import AIOKafkaProducer  # imported late so tests can mock sys.modules

        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BROKERS,
            value_serializer=lambda v: json.dumps(v).encode(),
        )
        await self._producer.start()
        log.info("kafka producer started", topic=_TOPIC)

    async def stop(self) -> None:
        if self._producer:
            await self._producer.stop()

    async def publish_alerts(
        self, lat: float, lng: float, alerts: List[WeatherAlert]
    ) -> None:
        assert self._producer is not None
        event = {
            "event": _TOPIC,
            "lat": round(lat, 1),
            "lng": round(lng, 1),
            "alerts": [
                {"type": a.type, "severity": a.severity, "date": a.date.isoformat()}
                for a in alerts
            ],
            "issued_at": datetime.now(timezone.utc).isoformat(),
        }
        key = f"{round(lat, 1)}:{round(lng, 1)}".encode()
        await self._producer.send_and_wait(_TOPIC, value=event, key=key)
        log.info("weather alerts published", lat=round(lat, 1), lng=round(lng, 1), count=len(alerts))
