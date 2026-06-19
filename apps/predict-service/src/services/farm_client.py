from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

import httpx
import structlog

from src.config import settings

log = structlog.get_logger(__name__)


class FarmServiceClient:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=settings.FARM_SERVICE_TIMEOUT_S)

    async def get_harvests(self, farm_id: str, authorization: str) -> List[Dict[str, Any]]:
        resp = await self._http.get(
            f"{settings.FARM_SERVICE_URL}/api/v1/farms/{farm_id}/harvests",
            headers={"Authorization": authorization},
        )
        resp.raise_for_status()
        body = resp.json()
        return body.get("data", body) if isinstance(body, dict) else body

    async def get_activities(self, farm_id: str, authorization: str) -> List[Dict[str, Any]]:
        resp = await self._http.get(
            f"{settings.FARM_SERVICE_URL}/api/v1/farms/{farm_id}/activities",
            headers={"Authorization": authorization},
        )
        resp.raise_for_status()
        body = resp.json()
        return body.get("data", body) if isinstance(body, dict) else body

    async def close(self) -> None:
        await self._http.aclose()


def calculate_yield(
    harvests: List[Dict[str, Any]],
    activities: List[Dict[str, Any]] | None = None,
) -> Dict:
    """Derive estimated yield from historical harvest records."""
    if not harvests:
        return {}

    crop_counts: Counter = Counter(
        h.get("crop", "").lower() for h in harvests if h.get("crop")
    )
    if not crop_counts:
        return {}

    primary_crop = crop_counts.most_common(1)[0][0]

    if activities:
        planting = [a for a in activities if a.get("type") == "planting"]
        if planting:
            # most recent planting activity determines current crop
            latest = max(planting, key=lambda a: a.get("scheduledDate", ""))
            primary_crop = (latest.get("crop") or primary_crop).lower()
    crop_harvests = [h for h in harvests if h.get("crop", "").lower() == primary_crop]

    yield_rates: List[float] = []
    areas: List[float] = []
    for h in crop_harvests:
        qty = float(h.get("quantity_kg", 0) or 0)
        area = float(
            h.get("area_acres", 0) or h.get("area_harvested_acres", 0) or 0
        )
        if area > 0 and qty > 0:
            yield_rates.append(qty / area)
            areas.append(area)

    if not yield_rates:
        return {}

    avg_yield_rate = sum(yield_rates) / len(yield_rates)
    avg_area = sum(areas) / len(areas)

    return {
        "crop": primary_crop,
        "estimated_yield_kg": round(avg_yield_rate * avg_area, 1),
        "based_on_seasons": len(crop_harvests),
        "farm_area_acres": round(avg_area, 2),
    }
