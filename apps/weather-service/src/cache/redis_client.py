from __future__ import annotations

import json

import redis.asyncio as aioredis

_PRIMARY_TTL = 10800   # 3 hours
_BACKUP_TTL = 86400    # 24 hours — serves stale responses when OWM is down


class WeatherCache:
    def __init__(self, url: str) -> None:
        self._client: aioredis.Redis = aioredis.from_url(url, decode_responses=True)  # type: ignore[type-arg]

    def _key(self, lat: float, lng: float) -> str:
        return f"weather:{round(lat, 1)}:{round(lng, 1)}"

    def _backup_key(self, lat: float, lng: float) -> str:
        return f"weather:{round(lat, 1)}:{round(lng, 1)}:backup"

    async def get(self, lat: float, lng: float) -> dict | None:
        raw = await self._client.get(self._key(lat, lng))
        return json.loads(raw) if raw else None  # type: ignore[arg-type]

    async def get_backup(self, lat: float, lng: float) -> dict | None:
        raw = await self._client.get(self._backup_key(lat, lng))
        return json.loads(raw) if raw else None  # type: ignore[arg-type]

    async def set(self, lat: float, lng: float, data: dict) -> None:
        payload = json.dumps(data)
        await self._client.set(self._key(lat, lng), payload, ex=_PRIMARY_TTL)
        await self._client.set(self._backup_key(lat, lng), payload, ex=_BACKUP_TTL)

    async def close(self) -> None:
        await self._client.aclose()  # type: ignore[attr-defined]
