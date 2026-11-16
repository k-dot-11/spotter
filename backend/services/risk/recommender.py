"""
Route Risk Aggregator & Recommendation Engine.
Applies the 4-tier preference hierarchy from the Spotter Assessment:
1. Fewest Severe miles
2. Fewest High miles
3. Lowest average risk
4. Shortest travel times
"""

from typing import Any

from services.common.time import format_duration

from .schemas import RiskLevel, RouteRiskSummary


def aggregate_route_risk(
    route_id: str,
    route_name: str,
    total_distance_miles: float,
    duration_seconds: float,
    evaluated_checkpoints: list[dict[str, Any]],
) -> RouteRiskSummary:
    """
    Computes risk mileage breakdown, weighted average risk, and flags.
    """
    low_miles = 0.0
    moderate_miles = 0.0
    high_miles = 0.0
    severe_miles = 0.0
    no_travel_miles = 0.0
    weighted_risk_sum = 0.0
    total_segment_miles = 0.0
    max_risk = RiskLevel.LOW

    for cp in evaluated_checkpoints:
        seg_miles = cp.get("segment_miles", 0.0)
        risk_score = cp.get("risk_score", 1)
        risk_level = RiskLevel(risk_score)

        if risk_level > max_risk:
            max_risk = risk_level

        if risk_level == RiskLevel.NO_TRAVEL:
            no_travel_miles += seg_miles
        elif risk_level == RiskLevel.SEVERE:
            severe_miles += seg_miles
        elif risk_level == RiskLevel.HIGH:
            high_miles += seg_miles
        elif risk_level == RiskLevel.MODERATE:
            moderate_miles += seg_miles
        else:
            low_miles += seg_miles

        weighted_risk_sum += risk_score * seg_miles
        total_segment_miles += seg_miles

    avg_risk = (weighted_risk_sum / total_segment_miles) if total_segment_miles > 0 else 1.0
    has_no_travel = no_travel_miles > 0

    return RouteRiskSummary(
        route_id=route_id,
        route_name=route_name,
        total_distance_miles=total_distance_miles,
        duration_seconds=duration_seconds,
        duration_formatted=format_duration(duration_seconds),
        low_miles=low_miles,
        moderate_miles=moderate_miles,
        high_miles=high_miles,
        severe_miles=severe_miles,
        no_travel_miles=no_travel_miles,
        average_risk=avg_risk,
        max_risk_level=max_risk,
        has_no_travel=has_no_travel,
        is_safe_to_travel=not has_no_travel,
        checkpoints=evaluated_checkpoints,
    )


def rank_and_recommend_routes(routes: list[RouteRiskSummary]) -> list[RouteRiskSummary]:
    """
    Ranks routes based on the 4-tier preference hierarchy from the PDF:
    1. Fewest Severe miles
    2. Fewest High miles
    3. Lowest average risk
    4. Shortest travel times

    Routes with No Travel conditions are placed behind safe routes.
    """
    if not routes:
        return []

    # Sorting key implementing exact hierarchy
    def sort_key(r: RouteRiskSummary):
        return (
            r.has_no_travel,  # False (0) before True (1)
            round(r.severe_miles, 2),  # 1. Fewest Severe miles
            round(r.high_miles, 2),  # 2. Fewest High miles
            round(r.average_risk, 3),  # 3. Lowest average risk
            round(r.duration_seconds, 1),  # 4. Shortest travel time
        )

    sorted_routes = sorted(routes, key=sort_key)

    for i, r in enumerate(sorted_routes):
        r.rank = i + 1
        if i == 0:
            r.is_recommended = True
            if r.has_no_travel:
                r.recommendation_reason = (
                    "Caution: All available routes encounter No Travel weather conditions. "
                    "This option has the lowest relative hazard profile."
                )
            else:
                reasons = []
                if r.severe_miles == 0 and r.high_miles == 0:
                    reasons.append("Safest corridor: 0 Severe and 0 High risk miles")
                elif r.severe_miles == 0:
                    reasons.append("Zero Severe risk miles")
                else:
                    reasons.append(f"Lowest Severe exposure ({r.severe_miles:.1f} mi)")

                reasons.append(f"Avg Risk: {r.average_risk:.2f}")
                reasons.append(f"Travel Time: {r.duration_formatted}")
                r.recommendation_reason = " | ".join(reasons)
        else:
            r.is_recommended = False
            diff_reasons = []
            if r.has_no_travel:
                diff_reasons.append(f"Contains {r.no_travel_miles:.1f} mi of No Travel conditions")
            if r.severe_miles > sorted_routes[0].severe_miles:
                diff_reasons.append(
                    f"+{r.severe_miles - sorted_routes[0].severe_miles:.1f} mi Severe risk"
                )
            if r.high_miles > sorted_routes[0].high_miles:
                diff_reasons.append(
                    f"+{r.high_miles - sorted_routes[0].high_miles:.1f} mi High risk"
                )
            r.recommendation_reason = "; ".join(diff_reasons) if diff_reasons else f"Rank #{r.rank}"

    return sorted_routes
