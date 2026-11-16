#!/usr/bin/env python3
"""
Smoke test for Open-Meteo Weather Forecast API.
Endpoint: https://api.open-meteo.com/v1/forecast
Requirements: Hourly wind speed (mph), rain (in/hr), snow (in/hr) for >= 48 hours.
Supports multi-coordinate batching.
"""

import time
import requests

def test_open_meteo_weather():
    url = "https://api.open-meteo.com/v1/forecast"
    
    # Test coordinates: Chicago, IL (41.8781, -87.6298) and Indianapolis, IN (39.7684, -86.1581)
    params = {
        "latitude": "41.8781,39.7684",
        "longitude": "-87.6298,-86.1581",
        "hourly": "wind_speed_10m,rain,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "forecast_days": 3,
        "timezone": "UTC"
    }

    start = time.time()
    response = requests.get(url, params=params, timeout=10)
    duration = time.time() - start

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    assert isinstance(data, list), f"Expected list of results for batched query, got {type(data)}"
    assert len(data) == 2, f"Expected 2 forecast objects for 2 coordinates, got {len(data)}"

    for idx, item in enumerate(data):
        assert "hourly" in item, f"Missing 'hourly' in item {idx}"
        hourly = item["hourly"]
        
        times = hourly.get("time", [])
        winds = hourly.get("wind_speed_10m", [])
        rains = hourly.get("rain", [])
        snows = hourly.get("snowfall", [])

        # Verify hourly length covers at least 48 hours
        assert len(times) >= 48, f"Expected >= 48 hours, got {len(times)}"
        assert len(winds) == len(times), "Wind speed length mismatch"
        assert len(rains) == len(times), "Rain length mismatch"
        assert len(snows) == len(times), "Snow length mismatch"

        # Check units in hourly_units
        units = item.get("hourly_units", {})
        assert units.get("wind_speed_10m") == "mp/h" or "mph" in units.get("wind_speed_10m", "").lower(), f"Unexpected wind unit: {units.get('wind_speed_10m')}"
        assert units.get("rain") == "inch", f"Unexpected rain unit: {units.get('rain')}"
        assert units.get("snowfall") == "inch", f"Unexpected snow unit: {units.get('snowfall')}"

    sample = data[0]["hourly"]
    print(f"✅ Open-Meteo Weather Smoke Test PASSED ({duration:.2f}s)")
    print(f"   Batched coordinates tested: 2 locations")
    print(f"   Hours returned per location: {len(sample['time'])} hours")
    print(f"   Hour 0: {sample['time'][0]} | Wind: {sample['wind_speed_10m'][0]} mph | Rain: {sample['rain'][0]} in | Snow: {sample['snowfall'][0]} in")
    print(f"   Hour 24: {sample['time'][24]} | Wind: {sample['wind_speed_10m'][24]} mph | Rain: {sample['rain'][24]} in | Snow: {sample['snowfall'][24]} in")
    return True

if __name__ == "__main__":
    test_open_meteo_weather()
