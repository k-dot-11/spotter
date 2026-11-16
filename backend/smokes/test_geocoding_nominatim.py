#!/usr/bin/env python3
"""
Smoke test for OpenStreetMap Nominatim Geocoding API.
Endpoint: https://nominatim.openstreetmap.org/search
Requirements: Valid User-Agent header, returns lat/lon for city/address queries.
"""

import time
import requests

def test_nominatim_geocoding():
    url = "https://nominatim.openstreetmap.org/search"
    query = "Chicago, IL"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "SpotterTruckRouting/1.0 (assessment-evaluation; contact: dev@spotter.local)"
    }

    start = time.time()
    response = requests.get(url, params=params, headers=headers, timeout=10)
    duration = time.time() - start

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected list response, got {type(data)}"
    assert len(data) > 0, "No geocoding results returned"

    first_result = data[0]
    lat = float(first_result["lat"])
    lon = float(first_result["lon"])
    display_name = first_result.get("display_name", "")

    # Rough boundary check for Chicago (~41.8°N, -87.6°W)
    assert 41.0 < lat < 43.0, f"Latitude {lat} out of expected range for Chicago"
    assert -88.5 < lon < -87.0, f"Longitude {lon} out of expected range for Chicago"

    print(f"✅ Nominatim Geocoding Smoke Test PASSED ({duration:.2f}s)")
    print(f"   Query: '{query}' -> ({lat:.4f}, {lon:.4f})")
    print(f"   Name: {display_name}")
    return True

if __name__ == "__main__":
    test_nominatim_geocoding()
