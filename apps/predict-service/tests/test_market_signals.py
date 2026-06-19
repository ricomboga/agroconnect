from __future__ import annotations

import pytest

from src.services.price_model import TOP_10_CROPS, market_signals

VALID_SIGNALS = {"rising", "falling", "stable"}


def test_market_signals_returns_all_10_crops():
    signals = market_signals()
    assert len(signals) == 10


def test_market_signals_all_crops_present():
    signals = market_signals()
    returned_crops = {s["crop"] for s in signals}
    assert returned_crops == TOP_10_CROPS


def test_market_signals_all_valid():
    signals = market_signals()
    for s in signals:
        assert s["signal"] in VALID_SIGNALS, (
            f"{s['crop']} signal={s['signal']!r} not in {VALID_SIGNALS}"
        )


def test_market_signals_change_pct_is_float():
    signals = market_signals()
    for s in signals:
        assert isinstance(s["change_pct"], float)


def test_market_signals_endpoint():
    import asyncio
    from src.routers.market_signals import get_market_signals

    async def _run():
        return await get_market_signals()

    result = asyncio.run(_run())
    assert len(result.signals) == 10
    for sig in result.signals:
        assert sig.signal in VALID_SIGNALS
