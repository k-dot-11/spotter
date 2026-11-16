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


class TripAnalysisApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("routes-analyze")

    @patch("services.weather.open_meteo.OpenMeteoWeatherService.fetch_batch_forecasts")
    @patch("services.routing.osrm.OSRMRoutingService.get_routes")
    @patch("services.geocoding.nominatim.NominatimGeocodingService.geocode")
    def test_analyze_routes_success(self, mock_geocode, mock_get_routes, mock_weather):
        # 1. Mock Geocode
        def geocode_side_effect(q):
            if "Chicago" in q:
                return GeocodeResult(lat=41.8781, lon=-87.6298, display_name="Chicago, IL")
            return GeocodeResult(lat=39.7684, lon=-86.1581, display_name="Indianapolis, IN")

        mock_geocode.side_effect = geocode_side_effect

        # 2. Mock Routes (3 routes)
        dep_time = datetime(2026, 11, 17, 8, 0, tzinfo=UTC)
        mock_cps = [
            Checkpoint(
                index=0,
                lat=41.8781,
                lon=-87.6298,
                distance_from_start_miles=0.0,
                segment_miles=0.0,
                eta=dep_time,
                eta_iso=dep_time.isoformat(),
                elapsed_seconds=0.0,
            ),
            Checkpoint(
                index=1,
                lat=39.7684,
                lon=-86.1581,
                distance_from_start_miles=180.0,
                segment_miles=180.0,
                eta=dep_time,
                eta_iso=dep_time.isoformat(),
                elapsed_seconds=10800.0,
            ),
        ]
        mock_routes = [
            RawRoute(
                "route-1",
                "I-65 S",
                "I-65",
                180.0,
                10800.0,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
            RawRoute(
                "route-2",
                "US-52 E",
                "US-52",
                195.0,
                12000.0,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
            RawRoute(
                "route-3",
                "I-57 S",
                "I-57",
                210.0,
                13500.0,
                [(-87.6, 41.8), (-86.1, 39.7)],
                mock_cps,
            ),
        ]
        mock_get_routes.return_value = mock_routes

        # 3. Mock Weather
        times = (
            [f"2026-11-17T{h:02d}:00" for h in range(24)]
            + [f"2026-11-18T{h:02d}:00" for h in range(24)]
            + [f"2026-11-19T{h:02d}:00" for h in range(24)]
        )
        samples = [HourlyWeatherSample(t, 20.0, 0.0, 0.0) for t in times]
        fc1 = LocationHourlyForecast(41.8781, -87.6298, samples)
        fc2 = LocationHourlyForecast(39.7684, -86.1581, samples)
        mock_weather.return_value = {
            (round(41.8781, 4), round(-87.6298, 4)): fc1,
            (round(39.7684, 4), round(-86.1581, 4)): fc2,
        }

        payload = {
            "origin": "Chicago, IL",
            "destination": "Indianapolis, IN",
            "departure_time": "2026-11-17T08:00:00Z",
            "weight_lbs": 35000,
            "sampling_interval_miles": 25,
        }

        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Schema assertions
        self.assertIn("origin", data)
        self.assertIn("destination", data)
        self.assertEqual(data["origin"]["name"], "Chicago, IL")
        self.assertEqual(len(data["routes"]), 3)
        self.assertEqual(data["recommended_route_id"], "route-1")
        self.assertTrue(data["routes"][0]["is_recommended"])

        # Checkpoints inspection
        checkpoints = data["routes"][0]["checkpoints"]
        self.assertEqual(len(checkpoints), 2)
        self.assertIn("weather", checkpoints[0])
        self.assertIn("risk", checkpoints[0])
        self.assertEqual(checkpoints[0]["weather"]["wind_mph"], 20.0)
        self.assertEqual(checkpoints[0]["risk"]["risk_label"], "Low")

        # Heatmap inspection
        self.assertIn("corridor_heatmap", data)
        heatmap = data["corridor_heatmap"]
        self.assertEqual(heatmap["max_forecast_hours"], 48)
        self.assertGreater(len(heatmap["points"]), 0)
        self.assertEqual(len(heatmap["points"][0]["risk_timeline"]), 49)

    def test_validation_missing_fields(self):
        # Missing destination and weight
        response = self.client.post(self.url, {"origin": "Chicago, IL"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("details", data)
        self.assertIn("destination", data["details"])
        self.assertIn("weight_lbs", data["details"])

    def test_validation_invalid_sampling_interval(self):
        # Interval must be 10, 25, or 50
        payload = {
            "origin": "Chicago, IL",
            "destination": "Dallas, TX",
            "weight_lbs": 30000,
            "sampling_interval_miles": 15,  # Invalid!
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertIn("sampling_interval_miles", data["details"])

    def test_validation_negative_weight(self):
        payload = {
            "origin": "Chicago, IL",
            "destination": "Dallas, TX",
            "weight_lbs": -500,  # Invalid!
        }
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
