import unittest

from services.risk.recommender import (
    RouteRiskSummary,
    aggregate_route_risk,
    format_duration,
    rank_and_recommend_routes,
)


class TestRouteRecommendation(unittest.TestCase):
    """Verifies the exact 4-tier route recommendation hierarchy."""

    def test_duration_formatting(self):
        self.assertEqual(format_duration(3600), "1h 0m")
        self.assertEqual(format_duration(5400), "1h 30m")
        self.assertEqual(format_duration(1800), "30m")

    def test_route_risk_aggregation(self):
        # 100 mile route sampled every 25 miles (4 segments of 25 mi)
        checkpoints = [
            {"segment_miles": 25.0, "risk_score": 1},  # Low
            {"segment_miles": 25.0, "risk_score": 2},  # Moderate
            {"segment_miles": 25.0, "risk_score": 3},  # High
            {"segment_miles": 25.0, "risk_score": 4},  # Severe
        ]
        summary = aggregate_route_risk(
            route_id="r1",
            route_name="Route 1",
            total_distance_miles=100.0,
            duration_seconds=7200,
            evaluated_checkpoints=checkpoints,
        )
        self.assertEqual(summary.low_miles, 25.0)
        self.assertEqual(summary.moderate_miles, 25.0)
        self.assertEqual(summary.high_miles, 25.0)
        self.assertEqual(summary.severe_miles, 25.0)
        self.assertEqual(summary.no_travel_miles, 0.0)
        # Weighted avg: (25*1 + 25*2 + 25*3 + 25*4) / 100 = 250 / 100 = 2.5
        self.assertAlmostEqual(summary.average_risk, 2.5, places=2)
        self.assertTrue(summary.is_safe_to_travel)
        self.assertFalse(summary.has_no_travel)

    def test_priority_1_fewest_severe_miles(self):
        # Route A: 0 Severe miles, 5 hours
        # Route B: 25 Severe miles, 3 hours (shorter time, but severe hazard)
        r_a = RouteRiskSummary(
            route_id="A",
            route_name="Route A",
            total_distance_miles=300,
            duration_seconds=18000,
            duration_formatted="5h 0m",
            severe_miles=0.0,
            high_miles=20.0,
            average_risk=2.0,
        )
        r_b = RouteRiskSummary(
            route_id="B",
            route_name="Route B",
            total_distance_miles=250,
            duration_seconds=10800,
            duration_formatted="3h 0m",
            severe_miles=25.0,
            high_miles=0.0,
            average_risk=1.8,
        )

        ranked = rank_and_recommend_routes([r_b, r_a])
        self.assertEqual(ranked[0].route_id, "A", "Route with 0 Severe miles must rank first")
        self.assertTrue(ranked[0].is_recommended)
        self.assertEqual(ranked[1].route_id, "B")

    def test_priority_2_fewest_high_miles(self):
        # Both have 0 Severe miles
        # Route A: 10 High miles, 4.5 hours
        # Route B: 30 High miles, 4.0 hours
        r_a = RouteRiskSummary(
            route_id="A",
            route_name="Route A",
            total_distance_miles=280,
            duration_seconds=16200,
            duration_formatted="4h 30m",
            severe_miles=0.0,
            high_miles=10.0,
            average_risk=2.1,
        )
        r_b = RouteRiskSummary(
            route_id="B",
            route_name="Route B",
            total_distance_miles=260,
            duration_seconds=14400,
            duration_formatted="4h 0m",
            severe_miles=0.0,
            high_miles=30.0,
            average_risk=2.0,
        )

        ranked = rank_and_recommend_routes([r_b, r_a])
        self.assertEqual(
            ranked[0].route_id, "A", "When severe miles are equal, fewer high miles must win"
        )

    def test_priority_3_lowest_average_risk(self):
        # Both have 0 Severe miles and equal High miles (15 mi)
        # Route A: Average risk 1.4, 4 hours
        # Route B: Average risk 2.2, 3.8 hours
        r_a = RouteRiskSummary(
            route_id="A",
            route_name="Route A",
            total_distance_miles=250,
            duration_seconds=14400,
            duration_formatted="4h 0m",
            severe_miles=0.0,
            high_miles=15.0,
            average_risk=1.4,
        )
        r_b = RouteRiskSummary(
            route_id="B",
            route_name="Route B",
            total_distance_miles=240,
            duration_seconds=13680,
            duration_formatted="3h 48m",
            severe_miles=0.0,
            high_miles=15.0,
            average_risk=2.2,
        )

        ranked = rank_and_recommend_routes([r_b, r_a])
        self.assertEqual(
            ranked[0].route_id, "A", "When severe and high are equal, lower average risk must win"
        )

    def test_priority_4_shortest_travel_time(self):
        # All risk parameters tied: 0 severe, 10 high, avg risk 1.5
        # Route A: 3h 30m
        # Route B: 4h 00m
        r_a = RouteRiskSummary(
            route_id="A",
            route_name="Route A",
            total_distance_miles=220,
            duration_seconds=12600,
            duration_formatted="3h 30m",
            severe_miles=0.0,
            high_miles=10.0,
            average_risk=1.5,
        )
        r_b = RouteRiskSummary(
            route_id="B",
            route_name="Route B",
            total_distance_miles=240,
            duration_seconds=14400,
            duration_formatted="4h 0m",
            severe_miles=0.0,
            high_miles=10.0,
            average_risk=1.5,
        )

        ranked = rank_and_recommend_routes([r_b, r_a])
        self.assertEqual(
            ranked[0].route_id, "A", "When risk metrics are tied, shortest duration wins"
        )

    def test_no_travel_disqualification(self):
        # Route A: Safe route with some moderate weather, 4 hours
        # Route B: Impassable with 1 No Travel section, but 0 high and 0 severe otherwise
        r_a = RouteRiskSummary(
            route_id="A",
            route_name="Route A",
            total_distance_miles=250,
            duration_seconds=14400,
            duration_formatted="4h 0m",
            severe_miles=0.0,
            high_miles=0.0,
            moderate_miles=50.0,
            average_risk=1.5,
            has_no_travel=False,
        )
        r_b = RouteRiskSummary(
            route_id="B",
            route_name="Route B",
            total_distance_miles=200,
            duration_seconds=10800,
            duration_formatted="3h 0m",
            severe_miles=0.0,
            high_miles=0.0,
            no_travel_miles=25.0,
            average_risk=1.4,
            has_no_travel=True,
        )

        ranked = rank_and_recommend_routes([r_b, r_a])
        self.assertEqual(ranked[0].route_id, "A", "Safe route must rank ahead of No Travel route")
        self.assertTrue(ranked[0].is_recommended)
        self.assertFalse(ranked[1].is_recommended)


if __name__ == "__main__":
    unittest.main()
