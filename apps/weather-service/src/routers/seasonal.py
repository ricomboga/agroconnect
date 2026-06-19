from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from src.schemas.weather import SeasonInfo, SeasonalResponse

router = APIRouter()

_county_index: dict[str, Any] | None = None


def set_county_data(data: dict[str, Any]) -> None:
    global _county_index
    _county_index = data


@router.get("/weather/seasonal", response_model=SeasonalResponse)
async def get_seasonal(county: str) -> SeasonalResponse:
    assert _county_index is not None
    entry = _county_index.get(county.lower())
    if not entry:
        raise HTTPException(status_code=404, detail=f"County '{county}' not found")
    return SeasonalResponse(
        county=entry["county"],
        long_rains=SeasonInfo(**entry["long_rains"]),
        short_rains=SeasonInfo(**entry["short_rains"]),
        outlook=entry["outlook"],
    )
