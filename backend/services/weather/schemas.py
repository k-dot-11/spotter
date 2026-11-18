"""
Domain Schemas and Data Models for Weather Sampling and Corridor Heatmaps.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class HourlyWeatherSample:
    """Weather metrics for a specific location at a specific hour."""

    time_iso: str
    wind_mph: float
    rain_in_per_hr: float
    snow_in_per_hr: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "time_iso": self.time_iso,
            "wind_mph": round(self.wind_mph, 1),
            "rain_in_per_hr": round(self.rain_in_per_hr, 2),
            "snow_in_per_hr": round(self.snow_in_per_hr, 2),
        }


@dataclass
class LocationHourlyForecast:
    """Complete multi-hour forecast timeline for a specific GPS coordinate."""

    lat: float
    lon: float
    samples: list[HourlyWeatherSample] = field(default_factory=list)


@dataclass
class CorridorHeatmapPoint:
    """
    A geographic point along the travel corridor with pre-computed 0–48h timelines.
    Enables instant 60fps scrubbing on the frontend slider.
    """

    lat: float
    lon: float
    risk_timeline: list[int] = field(default_factory=list)  # Risk level scores 1..5 for h=0..48
    wind_timeline: list[float] = field(default_factory=list)  # Wind mph for h=0..48
    precip_timeline: list[float] = field(default_factory=list)  # Total Rain+Snow in/hr for h=0..48
    rain_timeline: list[float] = field(default_factory=list)  # Rain in/hr for h=0..48
    snow_timeline: list[float] = field(default_factory=list)  # Snow in/hr for h=0..48

    def to_dict(self) -> dict[str, Any]:
        return {
            "lat": round(self.lat, 4),
            "lon": round(self.lon, 4),
            "risk_timeline": self.risk_timeline,
            "wind_timeline": [round(w, 1) for w in self.wind_timeline],
            "precip_timeline": [round(p, 2) for p in self.precip_timeline],
            "rain_timeline": [round(r, 2) for r in self.rain_timeline],
            "snow_timeline": [round(s, 2) for s in self.snow_timeline],
        }


@dataclass
class CorridorHeatmapTimeline:
    """Pre-computed corridor heatmap spanning 0 to 48 forecast hours."""

    start_time_iso: str
    max_forecast_hours: int
    points: list[CorridorHeatmapPoint] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "start_time_iso": self.start_time_iso,
            "max_forecast_hours": self.max_forecast_hours,
            "points": [p.to_dict() for p in self.points],
        }
