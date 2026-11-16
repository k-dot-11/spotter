import unittest

from services.common.geo import EARTH_RADIUS_MILES, haversine_distance_miles
from services.common.time import format_duration


class TestCommonUtils(unittest.TestCase):
    def test_format_duration(self):
        self.assertEqual(format_duration(0), "0m")
        self.assertEqual(format_duration(45), "0m")
        self.assertEqual(format_duration(60), "1m")
        self.assertEqual(format_duration(1800), "30m")
        self.assertEqual(format_duration(3600), "1h 0m")
        self.assertEqual(format_duration(5400), "1h 30m")
        self.assertEqual(format_duration(36000), "10h 0m")
        self.assertEqual(format_duration(-100), "0m")

    def test_haversine_distance_same_point(self):
        dist = haversine_distance_miles(41.8781, -87.6298, 41.8781, -87.6298)
        self.assertEqual(dist, 0.0)

    def test_haversine_distance_known_cities(self):
        # Chicago to New York (~710-720 miles)
        dist = haversine_distance_miles(41.8781, -87.6298, 40.7128, -74.0060)
        self.assertAlmostEqual(dist, 713.0, delta=10.0)
        self.assertGreater(EARTH_RADIUS_MILES, 3900)


if __name__ == "__main__":
    unittest.main()
