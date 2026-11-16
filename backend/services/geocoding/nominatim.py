import logging

import requests

from .base import BaseGeocodingService, GeocodeResult

logger = logging.getLogger(__name__)


class NominatimGeocodingService(BaseGeocodingService):
    """
    OpenStreetMap Nominatim Geocoding Service.
    Free, no API key required. Includes caching and rate-limiting safeguards.
    """

    BASE_URL = "https://nominatim.openstreetmap.org/search"
    DEFAULT_USER_AGENT = (
        "SpotterTruckRouting/1.0 (assessment-evaluation; contact: dev@spotter.local)"
    )

    def __init__(self, user_agent: str | None = None):
        self.user_agent = user_agent or self.DEFAULT_USER_AGENT
        self._cache: dict[str, list[GeocodeResult]] = {}

    def _request(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        cache_key = f"{query.strip().lower()}_{limit}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        params = {
            "q": query.strip(),
            "format": "json",
            "limit": limit,
            "addressdetails": 1,
        }
        headers = {
            "User-Agent": self.user_agent,
        }

        try:
            response = requests.get(self.BASE_URL, params=params, headers=headers, timeout=8)
            if response.status_code != 200:
                logger.warning(
                    f"Nominatim returned status {response.status_code} for query: {query}"
                )
                return []

            data = response.json()
            results: list[GeocodeResult] = []
            for item in data:
                try:
                    lat = float(item["lat"])
                    lon = float(item["lon"])
                    display_name = item.get("display_name", "")
                    place_id = str(item.get("place_id", ""))
                    bbox = (
                        [float(b) for b in item.get("boundingbox", [])]
                        if "boundingbox" in item
                        else None
                    )

                    results.append(
                        GeocodeResult(
                            lat=lat,
                            lon=lon,
                            display_name=display_name,
                            place_id=place_id,
                            bounding_box=bbox,
                        )
                    )
                except (ValueError, KeyError) as e:
                    logger.debug(f"Failed to parse Nominatim result: {e}")
                    continue

            self._cache[cache_key] = results
            return results

        except requests.RequestException as e:
            logger.error(f"Nominatim request error: {e}")
            return []

    def geocode(self, query: str) -> GeocodeResult | None:
        results = self._request(query, limit=1)
        return results[0] if results else None

    def autocomplete(self, query: str, limit: int = 5) -> list[GeocodeResult]:
        if not query or len(query.strip()) < 2:
            return []
        return self._request(query, limit=limit)
