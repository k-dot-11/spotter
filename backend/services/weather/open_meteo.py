"""
Open-Meteo Weather Service.
Fetches hourly weather forecasts in batched coordinate requests with native imperial units.
"""

import logging
from datetime import UTC, datetime

import requests

from .schemas import (
    HourlyWeatherSample,
    LocationHourlyForecast,
)

logger = logging.getLogger(__name__)


class OpenMeteoWeatherService:
    """
    Client for Open-Meteo Free Weather API.
    Zero API key required. Handles batching, unit conversion, and hourly forecast alignment.
    """

    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    MAX_BATCH_SIZE = 50  # Number of coordinate pairs per single HTTP request

    def __init__(self, base_url: str = BASE_URL, timeout_seconds: int = 12):
        self.base_url = base_url
        self.timeout_seconds = timeout_seconds

    def fetch_batch_forecasts(
        self,
        coordinates: list[tuple[float, float]],  # List of (lat, lon)
        forecast_days: int = 3,
    ) -> dict[tuple[float, float], LocationHourlyForecast]:
        """
        Fetches hourly forecasts for a list of (lat, lon) coordinates in batched HTTP requests.
        Returns a dict mapping (rounded_lat, rounded_lon) -> LocationHourlyForecast.
        """
        if not coordinates:
            return {}

        # Deduplicate coordinates by 4 decimal places (~11 meters) to reduce payload
        unique_coords: list[tuple[float, float]] = []
        seen = set()
        for lat, lon in coordinates:
            key = (round(lat, 4), round(lon, 4))
            if key not in seen:
                seen.add(key)
                unique_coords.append((lat, lon))

        forecast_map: dict[tuple[float, float], LocationHourlyForecast] = {}

        # Chunk into batches
        for i in range(0, len(unique_coords), self.MAX_BATCH_SIZE):
            chunk = unique_coords[i : i + self.MAX_BATCH_SIZE]
            lat_str = ",".join(f"{lat:.4f}" for lat, _ in chunk)
            lon_str = ",".join(f"{lon:.4f}" for _, lon in chunk)

            params = {
                "latitude": lat_str,
                "longitude": lon_str,
                "hourly": "wind_speed_10m,rain,snowfall",
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "forecast_days": forecast_days,
                "timezone": "UTC",
            }

            try:
                response = requests.get(
                    self.BASE_URL,
                    params=params,
                    timeout=self.timeout_seconds,
                )
                if response.status_code != 200:
                    logger.error(f"Open-Meteo error {response.status_code}: {response.text}")
                    continue

                raw_data = response.json()
                items = raw_data if isinstance(raw_data, list) else [raw_data]

                for idx, item in enumerate(items):
                    if idx < len(chunk):
                        orig_lat, orig_lon = chunk[idx]
                    else:
                        orig_lat = float(item.get("latitude", 0.0))
                        orig_lon = float(item.get("longitude", 0.0))

                    hourly = item.get("hourly", {})
                    times = hourly.get("time", [])
                    winds = hourly.get("wind_speed_10m", [])
                    rains = hourly.get("rain", [])
                    snows = hourly.get("snowfall", [])

                    samples: list[HourlyWeatherSample] = []
                    for t_idx, time_str in enumerate(times):
                        w = (
                            float(winds[t_idx])
                            if t_idx < len(winds) and winds[t_idx] is not None
                            else 0.0
                        )
                        r = (
                            float(rains[t_idx])
                            if t_idx < len(rains) and rains[t_idx] is not None
                            else 0.0
                        )
                        s = (
                            float(snows[t_idx])
                            if t_idx < len(snows) and snows[t_idx] is not None
                            else 0.0
                        )
                        samples.append(
                            HourlyWeatherSample(
                                time_iso=time_str,
                                wind_mph=w,
                                rain_in_per_hr=r,
                                snow_in_per_hr=s,
                            )
                        )

                    key = (round(orig_lat, 4), round(orig_lon, 4))
                    forecast_map[key] = LocationHourlyForecast(
                        lat=orig_lat,
                        lon=orig_lon,
                        samples=samples,
                    )

            except requests.RequestException as e:
                logger.error(f"Failed to query Open-Meteo: {e}")

        return forecast_map

    @staticmethod
    def get_weather_at_timestamp(
        forecast: LocationHourlyForecast,
        target_time: datetime,
    ) -> HourlyWeatherSample | None:
        """
        Finds the closest hourly weather sample for a given timestamp.
        """
        if not forecast or not forecast.samples:
            return None

        # Ensure UTC comparison
        if target_time.tzinfo is None:
            target_utc = target_time.replace(tzinfo=UTC)
        else:
            target_utc = target_time.astimezone(UTC)

        target_iso_prefix = target_utc.strftime("%Y-%m-%dT%H")

        # 1. Exact hour match
        for s in forecast.samples:
            if s.time_iso.startswith(target_iso_prefix):
                return s

        # 2. Nearest hour fallback if exact prefix not matched
        best_sample = forecast.samples[0]
        min_diff = float("inf")

        for s in forecast.samples:
            try:
                sample_dt = datetime.fromisoformat(s.time_iso).replace(tzinfo=UTC)
                diff = abs((sample_dt - target_utc).total_seconds())
                if diff < min_diff:
                    min_diff = diff
                    best_sample = s
            except ValueError:
                continue

        return best_sample
