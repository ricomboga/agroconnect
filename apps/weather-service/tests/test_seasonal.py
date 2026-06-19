from __future__ import annotations

import json
from pathlib import Path

import pytest

from src.routers.seasonal import get_seasonal, set_county_data

_DATA_PATH = Path(__file__).parent.parent / "src" / "data" / "county_seasons.json"


@pytest.fixture(autouse=True)
def load_county_data() -> None:
    raw: dict = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    set_county_data({k.lower(): v for k, v in raw.items()})


async def test_known_county_returns_data() -> None:
    result = await get_seasonal(county="Nairobi")
    assert result.county == "Nairobi"
    assert result.long_rains.start == "March"
    assert result.long_rains.end == "May"
    assert result.short_rains.start == "October"


async def test_case_insensitive_lookup() -> None:
    result_lower = await get_seasonal(county="nairobi")
    result_mixed = await get_seasonal(county="NAIROBI")
    assert result_lower.county == result_mixed.county == "Nairobi"


async def test_unknown_county_raises_404() -> None:
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await get_seasonal(county="Atlantis")
    assert exc_info.value.status_code == 404


async def test_coastal_county_has_april_start() -> None:
    result = await get_seasonal(county="Mombasa")
    assert result.long_rains.start == "April"


async def test_all_47_counties_present() -> None:
    raw: dict = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    assert len(raw) == 47, f"Expected 47 counties, got {len(raw)}"
