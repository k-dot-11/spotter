import unittest
from unittest.mock import MagicMock, patch

from services.geocoding.nominatim import NominatimGeocodingService


class TestNominatimGeocoding(unittest.TestCase):
    def setUp(self):
        self.service = NominatimGeocodingService()

    @patch("requests.get")
    def test_geocode_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "lat": "41.8781",
                "lon": "-87.6298",
                "display_name": "Chicago, Cook County, Illinois, United States",
                "place_id": 123456,
            }
        ]
        mock_get.return_value = mock_response

        result = self.service.geocode("Chicago, IL")
        self.assertIsNotNone(result)
        self.assertAlmostEqual(result.lat, 41.8781, places=3)
        self.assertAlmostEqual(result.lon, -87.6298, places=3)
        self.assertIn("Chicago", result.display_name)

    @patch("requests.get")
    def test_geocode_caching(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "lat": "32.7767",
                "lon": "-96.7970",
                "display_name": "Dallas, Texas, United States",
                "place_id": 78910,
            }
        ]
        mock_get.return_value = mock_response

        # First call hits network
        res1 = self.service.geocode("Dallas, TX")
        self.assertEqual(mock_get.call_count, 1)

        # Second call hits in-memory cache
        res2 = self.service.geocode("dallas, tx ")
        self.assertEqual(mock_get.call_count, 1)
        self.assertEqual(res1.lat, res2.lat)

    @patch("requests.get")
    def test_autocomplete(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"lat": "41.8781", "lon": "-87.6298", "display_name": "Chicago, IL"},
            {"lat": "41.5056", "lon": "-87.6367", "display_name": "Chicago Heights, IL"},
        ]
        mock_get.return_value = mock_response

        results = self.service.autocomplete("Chi", limit=2)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].lat, 41.8781)


if __name__ == "__main__":
    unittest.main()
