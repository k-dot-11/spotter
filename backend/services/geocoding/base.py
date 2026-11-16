from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class GeocodeResult:
    lat: float
    lon: float
    display_name: str
    place_id: str | None = None
    bounding_box: list[float] | None = None

    def to_dict(self):
        return {
            "lat": self.lat,
            "lon": self.lon,
            "display_name": self.display_name,
            "place_id": self.place_id,
            "bounding_box": self.bounding_box,
        }


class BaseGeocodingService(ABC):
    @abstractmethod
    def geocode(self, query: str) -> GeocodeResult | None:
        """Geocodes a single location string into coordinates."""
        pass

    @abstractmethod
    def autocomplete(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        """Returns autocomplete suggestions for typeahead search."""
        pass
