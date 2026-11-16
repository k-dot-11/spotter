#!/usr/bin/env python3
"""
Master runner for all third-party API smoke tests.
Runs:
1. OpenStreetMap Nominatim Geocoding API
2. Project OSRM Routing API
3. Open-Meteo Weather Forecast API (batched)
"""

import sys
import time

from test_e2e_analyze import test_live_trip_analysis
from test_geocoding_nominatim import test_nominatim_geocoding
from test_routing_osrm import test_osrm_routing
from test_weather_open_meteo import test_open_meteo_weather


def main():
    print("=" * 60)
    print("🚀 RUNNING THIRD-PARTY API & PIPELINE SMOKE TESTS")
    print("=" * 60)

    tests = [
        ("Geocoding (Nominatim / OpenStreetMap)", test_nominatim_geocoding),
        ("Routing (Project OSRM Driving Engine)", test_osrm_routing),
        ("Weather (Open-Meteo Multi-Coordinate Forecast)", test_open_meteo_weather),
        ("End-to-End Orchestrator Pipeline", test_live_trip_analysis),
    ]

    all_passed = True
    start_total = time.time()

    for name, test_fn in tests:
        print(f"\n▶ Testing: {name}...")
        try:
            passed = test_fn()
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"❌ FAILED: {name} raised an error: {e}")
            all_passed = False

    total_duration = time.time() - start_total
    print("\n" + "=" * 60)
    if all_passed:
        print(f"🎉 ALL SMOKE TESTS PASSED SUCCESSFULLY! Total time: {total_duration:.2f}s")
        print("All free third-party APIs are live, accessible, and returning expected data.")
    else:
        print("⚠️ SOME SMOKE TESTS FAILED. Please review the errors above.")
    print("=" * 60)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
