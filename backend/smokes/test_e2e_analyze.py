#!/usr/bin/env python3
"""
Live End-to-End Smoke Test for Trip Analysis Pipeline.
Executes real network calls across Nominatim, OSRM, and Open-Meteo.
"""

import os
import sys
import time
from datetime import UTC, datetime

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.orchestrator import TripOrchestrator


def test_live_trip_analysis():
    print("▶ Running Live End-to-End Trip Analysis Smoke Test...")
    orchestrator = TripOrchestrator()

    start_time = time.time()
    result = orchestrator.analyze_trip(
        origin_input="Chicago, IL",
        destination_input="Indianapolis, IN",
        departure_time=datetime.now(UTC),
        weight_lbs=35000,
        interval_miles=25.0,
    )
    elapsed = time.time() - start_time

    assert "origin" in result, "Missing origin"
    assert "destination" in result, "Missing destination"
    assert len(result["routes"]) == 3, f"Expected 3 routes, got {len(result['routes'])}"
    assert result["recommended_route_id"] is not None, "Missing recommended route"
    assert "corridor_heatmap" in result, "Missing corridor heatmap"

    rec_route = next(r for r in result["routes"] if r["route_id"] == result["recommended_route_id"])
    print(f"✅ Live End-to-End Smoke Test PASSED in {elapsed:.2f}s!")
    print(f"   Origin: {result['origin']['name']}")
    print(f"   Destination: {result['destination']['name']}")
    print(f"   Routes Generated: {len(result['routes'])}")
    print(
        f"   Recommended: {rec_route['route_name']} ({rec_route['duration_formatted']}, {rec_route['total_distance_miles']} mi)"
    )
    print(f"   Reason: {rec_route['recommendation_reason']}")
    print(
        f"   Corridor Heatmap Points: {len(result['corridor_heatmap']['points'])} points with 49-hour timelines"
    )
    return True


if __name__ == "__main__":
    test_live_trip_analysis()
