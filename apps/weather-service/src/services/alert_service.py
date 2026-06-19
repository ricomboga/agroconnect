from __future__ import annotations

from src.schemas.weather import ForecastResponse, WeatherAlert

_RAIN_THRESHOLD = 0.80
_WIND_THRESHOLD_KPH = 50.0


def derive_alerts(forecast: ForecastResponse) -> list[WeatherAlert]:
    alerts: list[WeatherAlert] = []
    for day in forecast.forecast:
        if day.rain_chance > _RAIN_THRESHOLD:
            alerts.append(
                WeatherAlert(
                    type="heavy_rain",
                    severity="warning",
                    description=f"High chance of heavy rain ({int(day.rain_chance * 100)}%)",
                    date=day.date,
                )
            )
        if day.wind_kph > _WIND_THRESHOLD_KPH:
            alerts.append(
                WeatherAlert(
                    type="high_wind",
                    severity="warning",
                    description=f"Strong winds expected ({day.wind_kph:.0f} km/h)",
                    date=day.date,
                )
            )
    return alerts
