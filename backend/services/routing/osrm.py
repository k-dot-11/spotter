import logging
from datetime import datetime

import requests

from .base import BaseRoutingService, RawRoute
from .sampler import sample_checkpoints_along_polyline

logger = logging.getLogger(__name__)

METERS_TO_MILES = 0.000621371


class OSRMRoutingService(BaseRoutingService):
    """
    Project OSRM Routing Engine.
    Free, zero API key required.
    Fetches routes and guarantees 3 options via corridor waypoint injection when needed.
    """

    BASE_URL = "http://router.project-osrm.org/route/v1/driving"
    DEFAULT_USER_AGENT = "SpotterTruckRouting/1.0"

    def __init__(self, base_url: str = BASE_URL, timeout_seconds: int = 15):
        self.base_url = base_url
        self.timeout_seconds = timeout_seconds

    def _query_osrm(self, coords_str: str, alternatives: bool = True) -> list[dict]:
        url = f"{self.base_url}/{coords_str}"
        params = {
            "overview": "full",
            "geometries": "geojson",
            "alternatives": "true" if alternatives else "false",
            "steps": "true",
            "annotations": "duration,distance",
        }
        headers = {"User-Agent": self.DEFAULT_USER_AGENT}

        try:
            response = requests.get(
                url, params=params, headers=headers, timeout=self.timeout_seconds
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "Ok":
                    return data.get("routes", [])
        except requests.RequestException as e:
            logger.error(f"OSRM request failed: {e}")

        return []

    def _create_raw_route(
        self,
        route_data: dict,
        route_index: int,
        departure_time: datetime,
        interval_miles: float,
    ) -> RawRoute:
        distance_meters = route_data.get("distance", 0.0)
        distance_miles = distance_meters * METERS_TO_MILES
        duration_seconds = float(route_data.get("duration", 0.0))

        geometry = route_data.get("geometry", {})
        raw_coords = geometry.get("coordinates", [])
        coordinates = [(c[0], c[1]) for c in raw_coords]

        # Extract primary road names from legs/steps if available
        legs = route_data.get("legs", [])
        step_names = []
        for leg in legs:
            for step in leg.get("steps", []):
                name = step.get("name")
                if name and name not in step_names and name != "":
                    step_names.append(name)

        summary = ", ".join(step_names[:2]) if step_names else f"Corridor {route_index + 1}"
        name = f"Option {route_index + 1}: {summary}"

        checkpoints = sample_checkpoints_along_polyline(
            coordinates=coordinates,
            total_distance_miles=distance_miles,
            total_duration_seconds=duration_seconds,
            departure_time=departure_time,
            interval_miles=interval_miles,
        )

        return RawRoute(
            route_id=f"route-{route_index + 1}",
            name=name,
            summary=summary,
            distance_miles=distance_miles,
            duration_seconds=duration_seconds,
            geometry_coordinates=coordinates,
            checkpoints=checkpoints,
        )

    def get_routes(
        self,
        origin: tuple[float, float],  # (lat, lon)
        destination: tuple[float, float],  # (lat, lon)
        departure_time: datetime,
        interval_miles: float = 25.0,
        target_count: int = 3,
    ) -> list[RawRoute]:
        lat1, lon1 = origin
        lat2, lon2 = destination

        direct_coords = f"{lon1:.6f},{lat1:.6f};{lon2:.6f},{lat2:.6f}"
        osrm_routes = self._query_osrm(direct_coords, alternatives=True)

        raw_routes: list[RawRoute] = []
        for idx, r in enumerate(osrm_routes[:target_count]):
            raw_routes.append(
                self._create_raw_route(
                    route_data=r,
                    route_index=idx,
                    departure_time=departure_time,
                    interval_miles=interval_miles,
                )
            )

        # If OSRM returned fewer than 3 routes, synthesize distinct corridor via intermediate waypoints
        if len(raw_routes) < target_count:
            mid_lat = (lat1 + lat2) / 2.0
            mid_lon = (lon1 + lon2) / 2.0
            dlat = lat2 - lat1
            dlon = lon2 - lon1

            # Perpendicular offsets for detour corridors
            offsets = [
                (-dlon * 0.15, dlat * 0.15),
                (dlon * 0.15, -dlat * 0.15),
            ]

            for offset_lat, offset_lon in offsets:
                if len(raw_routes) >= target_count:
                    break

                waypoint_lat = mid_lat + offset_lat
                waypoint_lon = mid_lon + offset_lon
                via_coords = f"{lon1:.6f},{lat1:.6f};{waypoint_lon:.6f},{waypoint_lat:.6f};{lon2:.6f},{lat2:.6f}"

                via_routes = self._query_osrm(via_coords, alternatives=False)
                if via_routes:
                    raw_routes.append(
                        self._create_raw_route(
                            route_data=via_routes[0],
                            route_index=len(raw_routes),
                            departure_time=departure_time,
                            interval_miles=interval_miles,
                        )
                    )

        return raw_routes[:target_count]
