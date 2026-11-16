"""
Domain Schemas and Data Models for Geocoding.
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class GeocodeResult:
    """A resolved geographic location with latitude, longitude, and metadata."""

    lat: float
    lon: float
    display_name: str
    place_id: str | None = None
    bounding_box: list[float] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "lat": self.lat,
            "lon": self.lon,
            "display_name": self.display_name,
            "place_id": self.place_id,
            "bounding_box": self.bounding_box,
        }
