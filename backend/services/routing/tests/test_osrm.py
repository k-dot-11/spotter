import unittest
from datetime import UTC, datetime
from unittest.mock import patch

from services.routing.osrm import OSRMRoutingService


class TestOSRMRoutingService(unittest.TestCase):
    def setUp(self):
        self.service = OSRMRoutingService()
        self.dep_time = datetime(2026, 11, 17, 8, 0, tzinfo=UTC)

    @patch.object(OSRMRoutingService, "_query_osrm")
    def test_guarantees_three_routes_when_osrm_returns_three(self, mock_query):
        # Mock OSRM returning 3 routes directly
        mock_query.return_value = [
            {
                "distance": 300000.0,
                "duration": 14000.0,
                "geometry": {"coordinates": [[-87.6, 41.8], [-86.1, 39.7]]},
                "legs": [{"steps": [{"name": "I-65 S"}]}],
            },
            {
                "distance": 320000.0,
                "duration": 15000.0,
                "geometry": {"coordinates": [[-87.6, 41.8], [-87.0, 40.5], [-86.1, 39.7]]},
                "legs": [{"steps": [{"name": "US-52 E"}]}],
            },
            {
                "distance": 340000.0,
                "duration": 16000.0,
                "geometry": {"coordinates": [[-87.6, 41.8], [-88.0, 40.5], [-86.1, 39.7]]},
                "legs": [{"steps": [{"name": "I-57 S"}]}],
            },
        ]

        routes = self.service.get_routes(
            origin=(41.8781, -87.6298),
            destination=(39.7684, -86.1581),
            departure_time=self.dep_time,
            interval_miles=25.0,
            target_count=3,
        )

        self.assertEqual(len(routes), 3)
        self.assertEqual(routes[0].route_id, "route-1")
        self.assertEqual(routes[1].route_id, "route-2")
        self.assertEqual(routes[2].route_id, "route-3")
        self.assertGreater(len(routes[0].checkpoints), 0)

    @patch.object(OSRMRoutingService, "_query_osrm")
    def test_guarantees_three_routes_when_osrm_returns_fewer(self, mock_query):
        # Simulate OSRM returning only 1 route on initial call, then returning detour routes on subsequent calls
        def side_effect(coords, alternatives=True):
            if ";" in coords and len(coords.split(";")) == 2:
                # Direct call: only 1 route
                return [
                    {
                        "distance": 300000.0,
                        "duration": 14000.0,
                        "geometry": {"coordinates": [[-87.6, 41.8], [-86.1, 39.7]]},
                        "legs": [{"steps": [{"name": "Main Interstate"}]}],
                    }
                ]
            else:
                # Via waypoint call
                return [
                    {
                        "distance": 330000.0,
                        "duration": 15500.0,
                        "geometry": {"coordinates": [[-87.6, 41.8], [-87.0, 40.5], [-86.1, 39.7]]},
                        "legs": [{"steps": [{"name": "Detour Route"}]}],
                    }
                ]

        mock_query.side_effect = side_effect

        routes = self.service.get_routes(
            origin=(41.8781, -87.6298),
            destination=(39.7684, -86.1581),
            departure_time=self.dep_time,
            interval_miles=25.0,
            target_count=3,
        )

        # Must fulfill requirement of returning 3 routes
        self.assertEqual(len(routes), 3)
        self.assertEqual(routes[0].route_id, "route-1")
        self.assertEqual(routes[1].route_id, "route-2")
        self.assertEqual(routes[2].route_id, "route-3")


if __name__ == "__main__":
    unittest.main()
