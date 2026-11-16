from abc import ABC, abstractmethod

from .schemas import GeocodeResult


class BaseGeocodingService(ABC):
    @abstractmethod
    def geocode(self, query: str) -> GeocodeResult | None:
        """Geocodes a single location string into coordinates."""
        pass

    @abstractmethod
    def autocomplete(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        """Returns autocomplete suggestions for typeahead search."""
        pass
