from datetime import UTC, datetime
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from services.geocoding.schemas import GeocodeResult
from services.routing.schemas import Checkpoint, RawRoute
from services.weather.schemas import HourlyWeatherSample, LocationHourlyForecast


class HealthCheckTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_endpoint(self):
        url = reverse("health-check")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "spotter-weather-truck-routing")
        self.assertIn("timestamp", data)


class GeocodeApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("api.views.geocoding_service.autocomplete")
    def test_geocode_success(self, mock_autocomplete):
        mock_autocomplete.return_value = [
            GeocodeResult(
                lat=41.8781,
                lon=-87.6298,
                display_name="Chicago, IL",
                place_id="123",
            )
        ]
        url = reverse("geocode")
        response = self.client.get(url, {"q": "Chicago"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["query"], "Chicago")
        self.assertEqual(len(data["results"]), 1)
        self.assertEqual(data["results"][0]["lat"], 41.8781)

    def test_geocode_validation_failure(self):
        url = reverse("geocode")
        # Missing 'q' param
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # 'q' param too short
        response = self.client.get(url, {"q": "a"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TripPlanApiTestCase(TestCase):
    """
    Extensive test suite for POST /api/trips/plan/.
    Tests happy path, load rules, tie breakers, edge cases, and input validation.
    """

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("trip-plan")
        self.dep_time = datetime(2026, 11, 17, 8, 0, tzinfo=UTC)

    def _create_mock_forecast(
        self, lat: float, lon: float, wind: float = 15.0, rain: float = 0.0, snow: float = 0.0
    ):
        times = (
            [f"2026-11-17T{h:02d}:00" for h in range(24)]
            + [f"2026-11-18T{h:02d}:00" for h in range(24)]
            + [f"2026-11-19T{h:02d}:00" for h in range(24)]
        )
        samples = [HourlyWeatherSample(t, wind, rain, snow) for t in times]
        return LocationHourlyForecast(lat, lon, samples)

    def _create_mock_routes(self, distance_miles: float = 180.0, duration_sec: float = 10800.0):
        mock_cps = [
            Checkpoint(
                index=0,
                lat=41.8781,
                lon=-87.6298,
                distance_from_start_miles=0.0,
                segment_miles=0.0,
                eta=self.dep_time,
                eta_iso=self.dep_time.isoformat(),
                elapsed_seconds=0.0,
            ),
            Checkpoint(
                index=1,
                lat=39.7684,
                lon=-86.1581,
                distance_from_start_miles=distance_miles,
                segment_miles=distance_miles,
                eta=self.dep_time,
                eta_iso=self.dep_time.isoformat(),
                elapsed_seconds=duration_sec,
            ),
        ]
        return [
            RawRoute(
                "route-1",
                "Option 1: Primary",
                "I-65",
                distance_miles,
                duration_sec,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
            RawRoute(
                "route-2",
                "Option 2: Alternative A",
                "US-52",
                distance_miles + 15,
                duration_sec + 1200,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
            RawRoute(
                "route-3",
                "Option 3: Alternative B",
                "I-57",
                distance_miles + 30,
                duration_sec + 2700,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
        ]

    # Test 1: Full Happy Path
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_01_happy_path_trip_planning(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        mock_weather.return_value = {
            (41.8781, -87.6298): self._create_mock_forecast(41.8781, -87.6298, wind=12.0),
            (39.7684, -86.1581): self._create_mock_forecast(39.7684, -86.1581, wind=14.0),
        }

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "departure_time": "2026-11-17T08:00:00Z",
            "weight_lbs": 30000,
            "sampling_interval_miles": 25,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        self.assertEqual(len(data["routes"]), 3)
        self.assertEqual(data["recommended_route_id"], "route-1")
        self.assertTrue(data["routes"][0]["is_recommended"])
        self.assertIn("corridor_heatmap", data)
        self.assertEqual(len(data["corridor_heatmap"]["points"][0]["risk_timeline"]), 49)

    # Test 2: Cargo Weight Escalation: 35-44 mph wind + > 40,000 lb -> Severe
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_02_weight_escalation_to_severe(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        # 38 mph wind is normally HIGH (3)
        mock_weather.return_value = {
            (41.8781, -87.6298): self._create_mock_forecast(41.8781, -87.6298, wind=38.0),
            (39.7684, -86.1581): self._create_mock_forecast(39.7684, -86.1581, wind=38.0),
        }

        # Weight is 45,000 lb (> 40k) -> triggers escalation to Severe (4)
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "departure_time": "2026-11-17T08:00:00Z",
            "weight_lbs": 45000,
            "sampling_interval_miles": 25,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        cp = data["routes"][0]["checkpoints"][0]
        self.assertEqual(cp["risk"]["overall_risk"], "SEVERE")
        self.assertEqual(cp["risk"]["risk_score"], 4)
        self.assertTrue(cp["risk"]["load_escalation_applied"])
        self.assertIn("> 40,000 lb", cp["risk"]["escalation_reason"])

    # Test 3: Cargo Weight Escalation: 45-54 mph wind + > 30,000 lb -> No Travel
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_03_weight_escalation_to_no_travel(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        # 48 mph wind is normally SEVERE (4)
        mock_weather.return_value = {
            (41.8781, -87.6298): self._create_mock_forecast(41.8781, -87.6298, wind=48.0),
            (39.7684, -86.1581): self._create_mock_forecast(39.7684, -86.1581, wind=48.0),
        }

        # Weight is 35,000 lb (> 30k) -> triggers escalation to NO_TRAVEL (5)
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "departure_time": "2026-11-17T08:00:00Z",
            "weight_lbs": 35000,
            "sampling_interval_miles": 25,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        cp = data["routes"][0]["checkpoints"][0]
        self.assertEqual(cp["risk"]["overall_risk"], "NO_TRAVEL")
        self.assertEqual(cp["risk"]["risk_score"], 5)
        self.assertTrue(cp["risk"]["load_escalation_applied"])
        self.assertIn("> 30,000 lb", cp["risk"]["escalation_reason"])
        self.assertTrue(data["routes"][0]["has_no_travel"])

    # Test 4: Direct Lat/Lon Coordinate Input (Bypasses Geocoding API)
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_04_direct_lat_lon_coordinates(self, mock_geocode, mock_get_routes, mock_weather):
        mock_get_routes.return_value = self._create_mock_routes()
        mock_weather.return_value = {
            (41.8781, -87.6298): self._create_mock_forecast(41.8781, -87.6298, wind=10.0),
            (39.7684, -86.1581): self._create_mock_forecast(39.7684, -86.1581, wind=10.0),
        }

        payload = {
            "origin": "41.8781, -87.6298",
            "destination": "39.7684, -86.1581",
            "departure_time": "2026-11-17T08:00:00Z",
            "weight_lbs": 25000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Geocoder must NOT be called when coordinates are provided directly
        mock_geocode.assert_not_called()
        data = res.json()
        self.assertAlmostEqual(data["origin"]["lat"], 41.8781, places=3)
        self.assertAlmostEqual(data["destination"]["lat"], 39.7684, places=3)

    # Test 5: 10-Mile Sampling Granularity Accepted
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_05_sampling_interval_10_miles(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        mock_weather.return_value = {}

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 25000,
            "sampling_interval_miles": 10,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["sampling_interval_miles"], 10)

    # Test 6: 50-Mile Sampling Granularity Accepted
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_06_sampling_interval_50_miles(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        mock_weather.return_value = {}

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 25000,
            "sampling_interval_miles": 50,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.json()["sampling_interval_miles"], 50)

    # Test 7: Route Recommendation Prioritizes Safe Route Over Shorter Impassable Route
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_07_safe_route_preferred_over_impassable(
        self, mock_geocode, mock_get_routes, mock_weather
    ):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )

        # Route 1: Shorter (2 hours) but passes through (40.0, -87.0) with extreme wind
        cp_r1 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(
                1, 40.0, -87.0, 100.0, 100.0, self.dep_time, self.dep_time.isoformat(), 7200
            ),
        ]
        # Route 2: Longer (3.5 hours) but passes through (40.5, -86.5) with calm weather
        cp_r2 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(
                1, 40.5, -86.5, 150.0, 150.0, self.dep_time, self.dep_time.isoformat(), 12600
            ),
        ]
        # Route 3: Longest (4 hours) calm weather
        cp_r3 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(
                1, 40.8, -86.0, 180.0, 180.0, self.dep_time, self.dep_time.isoformat(), 14400
            ),
        ]

        mock_get_routes.return_value = [
            RawRoute(
                "r1",
                "Fast but Dangerous",
                "I-65",
                100.0,
                7200.0,
                [(-87.6, 41.8), (-87.0, 40.0)],
                cp_r1,
            ),
            RawRoute(
                "r2", "Safe Detour", "US-52", 150.0, 12600.0, [(-87.6, 41.8), (-86.5, 40.5)], cp_r2
            ),
            RawRoute(
                "r3", "Long Detour", "I-57", 180.0, 14400.0, [(-87.6, 41.8), (-86.0, 40.8)], cp_r3
            ),
        ]

        # 60 mph wind on R1 triggers NO TRAVEL
        mock_weather.return_value = {
            (41.8, -87.6): self._create_mock_forecast(41.8, -87.6, wind=10.0),
            (40.0, -87.0): self._create_mock_forecast(40.0, -87.0, wind=60.0),  # NO TRAVEL
            (40.5, -86.5): self._create_mock_forecast(40.5, -86.5, wind=10.0),  # LOW
            (40.8, -86.0): self._create_mock_forecast(40.8, -86.0, wind=10.0),  # LOW
        }

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # Route 2 must be recommended, despite Route 1 being 1.5 hours faster
        self.assertEqual(data["recommended_route_id"], "r2")
        self.assertTrue(data["routes"][0]["is_recommended"])
        self.assertEqual(data["routes"][0]["route_id"], "r2")
        # Route 1 must have has_no_travel = True
        r1_result = next(r for r in data["routes"] if r["route_id"] == "r1")
        self.assertTrue(r1_result["has_no_travel"])

    # Test 8: Tie-Breaker Priority 1 (Fewest Severe Miles)
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_08_tie_breaker_fewest_severe_miles(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )

        # Route 1: 50 Severe miles, 3 hours
        cp_r1 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(1, 40.0, -87.0, 50.0, 50.0, self.dep_time, self.dep_time.isoformat(), 10800),
        ]
        # Route 2: 0 Severe miles, 4.5 hours
        cp_r2 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(1, 40.5, -86.5, 60.0, 60.0, self.dep_time, self.dep_time.isoformat(), 16200),
        ]
        # Route 3: 100 Severe miles
        cp_r3 = [
            Checkpoint(0, 41.8, -87.6, 0.0, 0.0, self.dep_time, self.dep_time.isoformat(), 0),
            Checkpoint(1, 40.8, -86.0, 80.0, 80.0, self.dep_time, self.dep_time.isoformat(), 18000),
        ]

        mock_get_routes.return_value = [
            RawRoute("r1", "Fast with Severe", "I-65", 50.0, 10800.0, [], cp_r1),
            RawRoute("r2", "Calm Longer", "US-52", 60.0, 16200.0, [], cp_r2),
            RawRoute("r3", "High Severe", "I-57", 80.0, 18000.0, [], cp_r3),
        ]

        # 46 mph wind with 25k lb load = SEVERE (4)
        mock_weather.return_value = {
            (41.8, -87.6): self._create_mock_forecast(41.8, -87.6, wind=10.0),
            (40.0, -87.0): self._create_mock_forecast(40.0, -87.0, wind=46.0),  # SEVERE
            (40.5, -86.5): self._create_mock_forecast(40.5, -86.5, wind=15.0),  # LOW
            (40.8, -86.0): self._create_mock_forecast(40.8, -86.0, wind=46.0),  # SEVERE
        }

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 25000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        # Priority 1 is Fewest Severe Miles: r2 (0 severe mi) beats r1 (50 severe mi)
        self.assertEqual(data["recommended_route_id"], "r2")

    # Test 9: Default Departure Time Fallback When Omitted
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_09_default_departure_time_when_omitted(
        self, mock_geocode, mock_get_routes, mock_weather
    ):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        mock_weather.return_value = {}

        # Omit 'departure_time'
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn("departure_time", data)
        self.assertTrue(data["departure_time"].endswith("Z") or "+00:00" in data["departure_time"])

    # Test 10: Unresolvable Origin Returns 400 Bad Request
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_10_unresolvable_origin_returns_400(self, mock_geocode):
        mock_geocode.return_value = None  # City not found

        payload = {
            "origin": "NonExistentPlaceCityXYZ1234",
            "destination": "Indianapolis, IN",
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        data = res.json()
        self.assertIn("error", data)
        self.assertIn("origin", data["error"].lower())

    # Test 11: Unresolvable Destination Returns 400 Bad Request
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_11_unresolvable_destination_returns_400(self, mock_geocode):
        def geocode_side_effect(q):
            if "Chicago" in q:
                return GeocodeResult(lat=41.8781, lon=-87.6298, display_name="Chicago, IL")
            return None

        mock_geocode.side_effect = geocode_side_effect

        payload = {
            "origin": "Chicago, IL",
            "destination": "UnknownDestABC9876",
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        data = res.json()
        self.assertIn("error", data)
        self.assertIn("destination", data["error"].lower())

    # Test 12: Validation: Negative Weight Rejected
    def test_12_validation_negative_weight(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": -500,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("weight_lbs", res.json()["details"])

    # Test 13: Validation: Excessive Weight (> 150,000 lb) Rejected
    def test_13_validation_excessive_weight(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 200000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("weight_lbs", res.json()["details"])

    # Test 14: Validation: Invalid Sampling Interval Rejected
    def test_14_validation_invalid_sampling_interval(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 30000,
            "sampling_interval_miles": 35,  # Only 10, 25, 50 allowed
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("sampling_interval_miles", res.json()["details"])

    # Test 15: Validation: Missing Origin and Destination Rejected
    def test_15_validation_missing_locations(self):
        payload = {
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        details = res.json()["details"]
        self.assertIn("origin", details)
        self.assertIn("destination", details)

    # Test 16: Extreme Weather: All Routes Encounter No Travel Conditions
    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_16_all_routes_encounter_no_travel(self, mock_geocode, mock_get_routes, mock_weather):
        mock_geocode.side_effect = lambda q: GeocodeResult(
            lat=41.8781, lon=-87.6298, display_name=q
        )
        mock_get_routes.return_value = self._create_mock_routes()
        # 65 mph hurricane-force winds across all coordinates
        mock_weather.return_value = {
            (41.8781, -87.6298): self._create_mock_forecast(41.8781, -87.6298, wind=65.0),
            (39.7684, -86.1581): self._create_mock_forecast(39.7684, -86.1581, wind=65.0),
        }

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "weight_lbs": 30000,
        }
        res = self.client.post(self.url, payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()

        for route in data["routes"]:
            self.assertTrue(route["has_no_travel"])
            self.assertFalse(route["is_safe_to_travel"])

        rec = next(r for r in data["routes"] if r["route_id"] == data["recommended_route_id"])
        self.assertIn("Caution", rec["recommendation_reason"])
