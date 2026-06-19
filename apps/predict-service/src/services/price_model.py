from __future__ import annotations

import csv
from datetime import date
from pathlib import Path
from typing import Dict, List, Tuple

_DATA_PATH = Path(__file__).parent.parent / "data" / "kenya_amis_prices.csv"

TOP_10_CROPS = frozenset({
    "maize", "beans", "wheat", "rice", "potatoes",
    "tomatoes", "sorghum", "millet", "cassava", "groundnuts",
})

_TREND_THRESHOLD_KES_PER_MONTH = 0.5


def load_prices(crop: str) -> List[Tuple[date, float]]:
    """Return chronologically sorted (date, price) pairs for the given crop."""
    records: List[Tuple[date, float]] = []
    with open(_DATA_PATH, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["crop"].lower() == crop.lower():
                records.append((date.fromisoformat(row["date"]), float(row["price_kes_per_kg"])))
    return sorted(records)


def _regression(x: List[float], y: List[float]) -> Tuple[float, float, float]:
    """Return (slope, intercept, residual_se) via ordinary least squares."""
    n = len(x)
    sx, sy = sum(x), sum(y)
    sxy = sum(xi * yi for xi, yi in zip(x, y))
    sx2 = sum(xi ** 2 for xi in x)
    denom = n * sx2 - sx ** 2
    slope = (n * sxy - sx * sy) / denom if denom else 0.0
    intercept = (sy - slope * sx) / n
    y_hat = [slope * xi + intercept for xi in x]
    sse = sum((yi - yhi) ** 2 for yi, yhi in zip(y, y_hat))
    se = (sse / max(n - 2, 1)) ** 0.5
    return slope, intercept, se


def _prediction_interval(
    x_pred: float, x: List[float], slope: float, intercept: float, se: float
) -> Tuple[float, float]:
    """Return (low, high) approximate 95 % prediction interval (±2 σ)."""
    n = len(x)
    x_mean = sum(x) / n
    sxx = sum((xi - x_mean) ** 2 for xi in x)
    se_pred = se * (1 + 1 / n + (x_pred - x_mean) ** 2 / max(sxx, 1e-9)) ** 0.5
    predicted = slope * x_pred + intercept
    return max(0.0, predicted - 2 * se_pred), predicted + 2 * se_pred


def predict_price(crop: str, days_ahead: int) -> Dict:
    """
    Fit linear regression on the last 6 months of AMIS data and extrapolate.

    # PHASE_3: replace linear regression with Prophet model
    """
    all_prices = load_prices(crop)
    if not all_prices:
        return {}

    recent = all_prices[-6:]
    x = list(range(len(recent)))
    y = [p for _, p in recent]

    slope, intercept, se = _regression(x, y)

    current_price = y[-1]
    # extrapolate: last known point is at x = len(x)-1; add days_ahead/30 months
    x_future = (len(x) - 1) + days_ahead / 30.0
    predicted = max(0.0, slope * x_future + intercept)
    conf_low, conf_high = _prediction_interval(x_future, x, slope, intercept, se)

    if slope > _TREND_THRESHOLD_KES_PER_MONTH:
        trend = "rising"
    elif slope < -_TREND_THRESHOLD_KES_PER_MONTH:
        trend = "falling"
    else:
        trend = "stable"

    return {
        "crop": crop,
        "current_price_kes": round(current_price, 2),
        "predicted_price_kes": round(predicted, 2),
        "days_ahead": days_ahead,
        "confidence_low": round(conf_low, 2),
        "confidence_high": round(conf_high, 2),
        "trend": trend,
    }


def market_signals() -> List[Dict]:
    """Compare each crop's latest price to the prior month to derive a signal."""
    signals: List[Dict] = []
    for crop in sorted(TOP_10_CROPS):
        prices = load_prices(crop)
        if len(prices) < 2:
            continue
        current = prices[-1][1]
        prev = prices[-2][1]
        change_pct = (current - prev) / prev * 100.0 if prev else 0.0
        if change_pct > 3.0:
            signal = "rising"
        elif change_pct < -3.0:
            signal = "falling"
        else:
            signal = "stable"
        signals.append({"crop": crop, "signal": signal, "change_pct": round(change_pct, 2)})
    return signals
