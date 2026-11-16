import unittest
from datetime import UTC, datetime

from services.routing.sampler import (
    haversine_distance_miles,
    sample_checkpoints_along_polyline,
)


class TestSpatialSampler(unittest.TestCase):
    def test_haversine_accuracy(self):
        # Chicago, IL (41.8781, -87.6298) to Indianapolis, IN (39.7684, -86.1581)
        # Known great circle distance is approx 164-165 miles
        dist = haversine_distance_miles(41.8781, -87.6298, 39.7684, -86.1581)
        self.assertAlmostEqual(dist, 164.5, delta=3.0)

    def test_checkpoint_sampling_25_miles(self):
        # Straight north path from (40.0, -88.0) to (41.45, -88.0) ~100 miles
        start_lat = 40.0
        end_lat = 41.45
        lon = -88.0

        coords = [
            (lon, start_lat),
            (lon, (start_lat + end_lat) / 2.0),
            (lon, end_lat),
        ]
        total_dist_miles = 100.0
        total_duration_sec = 7200.0  # 2 hours
        dep_time = datetime(2026, 11, 17, 8, 0, tzinfo=UTC)

        checkpoints = sample_checkpoints_along_polyline(
            coordinates=coords,
            total_distance_miles=total_dist_miles,
            total_duration_seconds=total_duration_sec,
            departure_time=dep_time,
            interval_miles=25.0,
        )

        # Expected milestones: 0, 25, 50, 75, 100 -> 5 checkpoints
        self.assertEqual(len(checkpoints), 5)

        # Origin check
        self.assertEqual(checkpoints[0].index, 0)
        self.assertEqual(checkpoints[0].distance_from_start_miles, 0.0)
        self.assertEqual(checkpoints[0].segment_miles, 0.0)
        self.assertEqual(checkpoints[0].eta, dep_time)

        # Destination check
        self.assertEqual(checkpoints[-1].distance_from_start_miles, 100.0)
        self.assertEqual(checkpoints[-1].segment_miles, 25.0)

        # Strictly monotonic ETAs and distances
        for i in range(1, len(checkpoints)):
            self.assertGreater(
                checkpoints[i].distance_from_start_miles,
                checkpoints[i - 1].distance_from_start_miles,
            )
            self.assertGreater(checkpoints[i].eta, checkpoints[i - 1].eta)

        # Segment miles sum (from checkpoint 1 to end) should equal total distance
        total_segment_miles = sum(cp.segment_miles for cp in checkpoints[1:])
        self.assertAlmostEqual(total_segment_miles, 100.0, places=1)

    def test_checkpoint_sampling_10_and_50_miles(self):
        coords = [(-87.6, 41.8), (-86.1, 39.7)]
        dep_time = datetime(2026, 11, 17, 10, 0, tzinfo=UTC)

        # 50 mile interval on a 180 mile trip -> ~4 checkpoints (0, 50, 100, 150, 180)
        cp_50 = sample_checkpoints_along_polyline(
            coordinates=coords,
            total_distance_miles=180.0,
            total_duration_seconds=10800.0,
            departure_time=dep_time,
            interval_miles=50.0,
        )
        self.assertGreaterEqual(len(cp_50), 4)
        self.assertEqual(cp_50[0].distance_from_start_miles, 0.0)
        self.assertEqual(cp_50[-1].distance_from_start_miles, 180.0)

        # 10 mile interval on a 50 mile trip -> ~6 checkpoints (0, 10, 20, 30, 40, 50)
        cp_10 = sample_checkpoints_along_polyline(
            coordinates=coords,
            total_distance_miles=50.0,
            total_duration_seconds=3600.0,
            departure_time=dep_time,
            interval_miles=10.0,
        )
        self.assertEqual(len(cp_10), 6)
        self.assertEqual(cp_10[-1].distance_from_start_miles, 50.0)


if __name__ == "__main__":
    unittest.main()
