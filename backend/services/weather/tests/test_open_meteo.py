import unittest
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

from services.weather.corridor import compile_corridor_heatmap_timeline
from services.weather.open_meteo import OpenMeteoWeatherService
from services.weather.schemas import HourlyWeatherSample, LocationHourlyForecast


class TestOpenMeteoWeatherService(unittest.TestCase):
    def setUp(self):
        self.service = OpenMeteoWeatherService()

    @patch("requests.get")
    def test_fetch_batch_forecasts_multi(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "latitude": 41.8781,
                "longitude": -87.6298,
                "hourly": {
                    "time": ["2026-11-17T08:00", "2026-11-17T09:00"],
                    "wind_speed_10m": [15.2, 28.4],
                    "rain": [0.0, 0.15],
                    "snowfall": [0.0, 0.0],
                },
            },
            {
                "latitude": 39.7684,
                "longitude": -86.1581,
                "hourly": {
                    "time": ["2026-11-17T08:00", "2026-11-17T09:00"],
                    "wind_speed_10m": [12.0, 14.5],
                    "rain": [0.0, 0.0],
                    "snowfall": [0.0, 0.5],
                },
            },
        ]
        mock_get.return_value = mock_response

        coords = [(41.8781, -87.6298), (39.7684, -86.1581)]
        forecast_map = self.service.fetch_batch_forecasts(coords)

        self.assertEqual(len(forecast_map), 2)
        key1 = (round(41.8781, 4), round(-87.6298, 4))
        self.assertIn(key1, forecast_map)
        fc1 = forecast_map[key1]
        self.assertEqual(len(fc1.samples), 2)
        self.assertEqual(fc1.samples[0].wind_mph, 15.2)
        self.assertEqual(fc1.samples[1].wind_mph, 28.4)
        self.assertEqual(fc1.samples[1].rain_in_per_hr, 0.15)

    def test_timestamp_matching(self):
        forecast = LocationHourlyForecast(
            lat=41.8781,
            lon=-87.6298,
            samples=[
                HourlyWeatherSample("2026-11-17T08:00", 10.0, 0.0, 0.0),
                HourlyWeatherSample("2026-11-17T09:00", 25.0, 0.2, 0.0),
                HourlyWeatherSample("2026-11-17T10:00", 40.0, 0.5, 0.0),
            ],
        )

        # Arrival at 09:20 -> should match the 09:00 hour
        target_t = datetime(2026, 11, 17, 9, 20, tzinfo=UTC)
        sample = OpenMeteoWeatherService.get_weather_at_timestamp(forecast, target_t)

        self.assertIsNotNone(sample)
        self.assertEqual(sample.time_iso, "2026-11-17T09:00")
        self.assertEqual(sample.wind_mph, 25.0)

    def test_corridor_heatmap_timeline_compilation(self):
        # Build 72 hours of synthetic forecast
        times = (
            [f"2026-11-17T{h:02d}:00" for h in range(24)]
            + [f"2026-11-18T{h:02d}:00" for h in range(24)]
            + [f"2026-11-19T{h:02d}:00" for h in range(24)]
        )
        samples = [HourlyWeatherSample(t, 20.0 + (i * 0.5), 0.05, 0.0) for i, t in enumerate(times)]

        forecast = LocationHourlyForecast(lat=41.8781, lon=-87.6298, samples=samples)
        key = (round(41.8781, 4), round(-87.6298, 4))
        forecast_map = {key: forecast}

        dep_time = datetime(2026, 11, 17, 0, 0, tzinfo=UTC)
        timeline = compile_corridor_heatmap_timeline(
            corridor_coordinates=[(41.8781, -87.6298)],
            forecast_map=forecast_map,
            departure_time=dep_time,
            weight_lbs=35000,
            max_forecast_hours=48,
        )

        self.assertEqual(timeline.max_forecast_hours, 48)
        self.assertEqual(len(timeline.points), 1)

        point = timeline.points[0]
        # Should have exactly 49 hours (0..48)
        self.assertEqual(len(point.risk_timeline), 49)
        self.assertEqual(len(point.wind_timeline), 49)
        self.assertEqual(len(point.precip_timeline), 49)
        # Verify values are valid risk scores between 1 and 5
        for score in point.risk_timeline:
            self.assertIn(score, [1, 2, 3, 4, 5])


if __name__ == "__main__":
    unittest.main()
