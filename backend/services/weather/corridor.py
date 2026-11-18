"""
Corridor Heatmap Aggregator.
Compiles 0–48 hour forecast timelines for corridor coordinates,
allowing zero-latency scrubbing on the frontend slider.
"""

from datetime import UTC, datetime, timedelta

from services.risk.evaluator import evaluate_checkpoint_risk

from .open_meteo import OpenMeteoWeatherService
from .schemas import (
    CorridorHeatmapPoint,
    CorridorHeatmapTimeline,
    LocationHourlyForecast,
)


def compile_corridor_heatmap_timeline(
    corridor_coordinates: list[tuple[float, float]],  # List of (lat, lon)
    forecast_map: dict[tuple[float, float], LocationHourlyForecast],
    departure_time: datetime,
    weight_lbs: float,
    max_forecast_hours: int = 48,
) -> CorridorHeatmapTimeline:
    """
    Builds the 0–48h matrix of weather and risk levels across the travel corridor.
    Pre-evaluated with the truck's cargo weight for accurate risk visualization.
    """
    if departure_time.tzinfo is None:
        start_utc = departure_time.replace(tzinfo=UTC)
    else:
        start_utc = departure_time.astimezone(UTC)

    heatmap_points: list[CorridorHeatmapPoint] = []

    for lat, lon in corridor_coordinates:
        key = (round(lat, 4), round(lon, 4))
        forecast = forecast_map.get(key)
        if not forecast or not forecast.samples:
            continue

        risk_timeline: list[int] = []
        wind_timeline: list[float] = []
        precip_timeline: list[float] = []
        rain_timeline: list[float] = []
        snow_timeline: list[float] = []

        for h in range(max_forecast_hours + 1):
            target_t = start_utc + timedelta(hours=h)
            sample = OpenMeteoWeatherService.get_weather_at_timestamp(forecast, target_t)

            if sample:
                wind = sample.wind_mph
                rain = sample.rain_in_per_hr
                snow = sample.snow_in_per_hr
            else:
                wind, rain, snow = 0.0, 0.0, 0.0

            # Evaluate risk at this point for this hour with truck load rules applied
            risk_result = evaluate_checkpoint_risk(
                wind_mph=wind,
                rain_in_per_hr=rain,
                snow_in_per_hr=snow,
                weight_lbs=weight_lbs,
            )

            risk_timeline.append(risk_result.risk_score)
            wind_timeline.append(wind)
            precip_timeline.append(rain + snow)
            rain_timeline.append(rain)
            snow_timeline.append(snow)

        heatmap_points.append(
            CorridorHeatmapPoint(
                lat=lat,
                lon=lon,
                risk_timeline=risk_timeline,
                wind_timeline=wind_timeline,
                precip_timeline=precip_timeline,
                rain_timeline=rain_timeline,
                snow_timeline=snow_timeline,
            )
        )

    return CorridorHeatmapTimeline(
        start_time_iso=start_utc.isoformat(),
        max_forecast_hours=max_forecast_hours,
        points=heatmap_points,
    )
