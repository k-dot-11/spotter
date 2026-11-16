"""
Trip Analysis Orchestrator.
Coordinates Geocoding, Routing, Weather Sampling, Risk Evaluation,
Route Recommendation, and Corridor Heatmap Aggregation.
"""

import logging
from datetime import UTC, datetime
from typing import Any

from services.geocoding import BaseGeocodingService, NominatimGeocodingService
from services.risk import (
    aggregate_route_risk,
    evaluate_checkpoint_risk,
    rank_and_recommend_routes,
)
from services.routing import BaseRoutingService, OSRMRoutingService, RawRoute
from services.weather import (
    OpenMeteoWeatherService,
    compile_corridor_heatmap_timeline,
)

logger = logging.getLogger(__name__)


def parse_location_input(
    loc_str: str,
    geocoder: BaseGeocodingService,
) -> tuple[float, float, str] | None:
    """
    Parses a location string.
    Supports:
    - Coordinates string: "41.8781, -87.6298"
    - City/address query: "Chicago, IL" (resolved via geocoder)
    Returns (lat, lon, display_name) or None.
    """
    if not loc_str or not loc_str.strip():
        return None

    cleaned = loc_str.strip()
    if "," in cleaned:
        parts = [p.strip() for p in cleaned.split(",")]
        if len(parts) == 2:
            try:
                lat = float(parts[0])
                lon = float(parts[1])
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return (lat, lon, f"({lat:.4f}, {lon:.4f})")
            except ValueError:
                pass

    # Fallback to geocoding
    geo_res = geocoder.geocode(cleaned)
    if geo_res:
        return (geo_res.lat, geo_res.lon, geo_res.display_name)

    return None


class TripOrchestrator:
    """
    Unified Trip Analysis Pipeline.
    """

    def __init__(
        self,
        geocoding_service: BaseGeocodingService | None = None,
        routing_service: BaseRoutingService | None = None,
        weather_service: OpenMeteoWeatherService | None = None,
    ):
        self.geocoder = geocoding_service or NominatimGeocodingService()
        self.router = routing_service or OSRMRoutingService()
        self.weather = weather_service or OpenMeteoWeatherService()

    def analyze_trip(
        self,
        origin_input: str,
        destination_input: str,
        departure_time: datetime,
        weight_lbs: float,
        interval_miles: float = 25.0,
    ) -> dict[str, Any]:
        """
        Executes the full end-to-end trip analysis:
        1. Resolve Origin and Destination
        2. Generate 3 Route Options via Routing Engine
        3. Fetch Batched Hourly Weather for all checkpoints
        4. Evaluate Checkpoint Risk with Truck Weight Rules
        5. Aggregate and Rank Routes via 4-Tier Preference
        6. Assemble 0–48h Corridor Heatmap Matrix
        """
        # Ensure UTC timezone
        if departure_time.tzinfo is None:
            dep_utc = departure_time.replace(tzinfo=UTC)
        else:
            dep_utc = departure_time.astimezone(UTC)

        # 1. Resolve coordinates
        orig_parsed = parse_location_input(origin_input, self.geocoder)
        if not orig_parsed:
            raise ValueError(f"Unable to resolve origin location: '{origin_input}'")

        dest_parsed = parse_location_input(destination_input, self.geocoder)
        if not dest_parsed:
            raise ValueError(f"Unable to resolve destination location: '{destination_input}'")

        lat1, lon1, orig_name = orig_parsed
        lat2, lon2, dest_name = dest_parsed

        # 2. Generate 3 routes with sampled checkpoints
        raw_routes: list[RawRoute] = self.router.get_routes(
            origin=(lat1, lon1),
            destination=(lat2, lon2),
            departure_time=dep_utc,
            interval_miles=interval_miles,
            target_count=3,
        )

        if not raw_routes:
            raise RuntimeError("Routing service failed to find viable driving routes.")

        # 3. Collect all unique coordinates across all routes for batch weather query
        all_coords: list[tuple[float, float]] = []
        for r in raw_routes:
            for cp in r.checkpoints:
                all_coords.append((cp.lat, cp.lon))

        forecast_map = self.weather.fetch_batch_forecasts(all_coords, forecast_days=3)

        # 4. Evaluate weather risk at each checkpoint
        evaluated_routes = []
        for r in raw_routes:
            evaluated_cps = []
            for cp in r.checkpoints:
                key = (round(cp.lat, 4), round(cp.lon, 4))
                loc_forecast = forecast_map.get(key)

                sample = None
                if loc_forecast:
                    sample = OpenMeteoWeatherService.get_weather_at_timestamp(loc_forecast, cp.eta)

                if sample:
                    wind = sample.wind_mph
                    rain = sample.rain_in_per_hr
                    snow = sample.snow_in_per_hr
                else:
                    wind, rain, snow = 0.0, 0.0, 0.0

                risk_eval = evaluate_checkpoint_risk(
                    wind_mph=wind,
                    rain_in_per_hr=rain,
                    snow_in_per_hr=snow,
                    weight_lbs=weight_lbs,
                )

                evaluated_cps.append(
                    {
                        **cp.to_dict(),
                        "weather": {
                            "wind_mph": round(wind, 1),
                            "rain_in_per_hr": round(rain, 2),
                            "snow_in_per_hr": round(snow, 2),
                        },
                        "risk": risk_eval.to_dict(),
                        "risk_score": risk_eval.risk_score,
                    }
                )

            summary = aggregate_route_risk(
                route_id=r.route_id,
                route_name=r.name,
                total_distance_miles=r.distance_miles,
                duration_seconds=r.duration_seconds,
                evaluated_checkpoints=evaluated_cps,
            )
            # Attach geometry for map polylines
            summary_dict = summary.to_dict()
            summary_dict["geometry_coordinates"] = r.geometry_coordinates
            evaluated_routes.append(summary)

        # 5. Rank and recommend routes according to 4-tier rubric
        ranked_summaries = rank_and_recommend_routes(evaluated_routes)

        # Map back to dicts with geometry preserved
        geometry_map = {r.route_id: r.geometry_coordinates for r in raw_routes}
        routes_output = []
        recommended_route_id = None

        for summary in ranked_summaries:
            s_dict = summary.to_dict()
            s_dict["geometry_coordinates"] = geometry_map.get(summary.route_id, [])
            if summary.is_recommended:
                recommended_route_id = summary.route_id
            routes_output.append(s_dict)

        # 6. Assemble 0–48h Corridor Heatmap Timeline
        corridor_heatmap = compile_corridor_heatmap_timeline(
            corridor_coordinates=all_coords,
            forecast_map=forecast_map,
            departure_time=dep_utc,
            weight_lbs=weight_lbs,
            max_forecast_hours=48,
        )

        return {
            "origin": {
                "lat": lat1,
                "lon": lon1,
                "name": orig_name,
            },
            "destination": {
                "lat": lat2,
                "lon": lon2,
                "name": dest_name,
            },
            "departure_time": dep_utc.isoformat(),
            "weight_lbs": weight_lbs,
            "sampling_interval_miles": interval_miles,
            "recommended_route_id": recommended_route_id,
            "routes": routes_output,
            "corridor_heatmap": corridor_heatmap.to_dict(),
        }
