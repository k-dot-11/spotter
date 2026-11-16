#!/usr/bin/env python3
"""
Smoke test for Project OSRM Routing API (Public Demo Server).
Endpoint: http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
Requirements: Returns GeoJSON coordinates, distance in meters, duration in seconds, and alternative routes.
"""

import time
import requests

def test_osrm_routing():
    # Chicago, IL to Indianapolis, IN
    chicago_lon, chicago_lat = -87.6244, 41.8756
    indy_lon, indy_lat = -86.1581, 39.7684

    # Format: {lon1},{lat1};{lon2},{lat2}
    coords = f"{chicago_lon},{chicago_lat};{indy_lon},{indy_lat}"
    url = f"http://router.project-osrm.org/route/v1/driving/{coords}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "alternatives": "true",
        "steps": "true",
        "annotations": "duration,distance"
    }
    headers = {
        "User-Agent": "SpotterTruckRouting/1.0"
    }

    start = time.time()
    response = requests.get(url, params=params, headers=headers, timeout=15)
    duration = time.time() - start

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    assert data.get("code") == "Ok", f"OSRM returned error code: {data.get('code')}"
    
    routes = data.get("routes", [])
    assert len(routes) >= 1, "No routes returned by OSRM"

    primary_route = routes[0]
    geometry = primary_route.get("geometry", {})
    coordinates = geometry.get("coordinates", [])
    distance_meters = primary_route.get("distance", 0)
    duration_seconds = primary_route.get("duration", 0)

    distance_miles = distance_meters * 0.000621371
    duration_hours = duration_seconds / 3600.0

    assert len(coordinates) > 10, f"Expected detailed polyline, got {len(coordinates)} points"
    # Chicago to Indy is ~180 miles (~3 hours drive)
    assert 150 < distance_miles < 230, f"Distance {distance_miles:.1f} mi unexpected for CHI -> IND"

    print(f"✅ OSRM Routing Smoke Test PASSED ({duration:.2f}s)")
    print(f"   Routes found: {len(routes)} (Primary + {len(routes) - 1} alternative(s))")
    print(f"   Primary distance: {distance_miles:.1f} miles")
    print(f"   Primary duration: {duration_hours:.1f} hours ({duration_seconds:.0f}s)")
    print(f"   Geometry: {len(coordinates)} road coordinate waypoints")
    return True

if __name__ == "__main__":
    test_osrm_routing()
