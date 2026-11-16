"""
Domain Schemas and Data Models for Risk Analysis.
Defines pure data structures (DTOs and Enums) separated from business logic.
"""

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any


class RiskLevel(IntEnum):
    """
    Quantified Risk Levels:
    1: Low
    2: Moderate
    3: High
    4: Severe
    5: No Travel
    """

    LOW = 1
    MODERATE = 2
    HIGH = 3
    SEVERE = 4
    NO_TRAVEL = 5

    @property
    def label(self) -> str:
        labels = {
            RiskLevel.LOW: "Low",
            RiskLevel.MODERATE: "Moderate",
            RiskLevel.HIGH: "High",
            RiskLevel.SEVERE: "Severe",
            RiskLevel.NO_TRAVEL: "No Travel",
        }
        return labels[self]

    @property
    def color(self) -> str:
        """Hex color code for map pins and UI badges."""
        colors = {
            RiskLevel.LOW: "#22c55e",  # Green
            RiskLevel.MODERATE: "#eab308",  # Yellow
            RiskLevel.HIGH: "#f97316",  # Orange
            RiskLevel.SEVERE: "#ef4444",  # Red
            RiskLevel.NO_TRAVEL: "#7f1d1d",  # Dark Burgundy / Crimson
        }
        return colors[self]


@dataclass
class CheckpointRiskResult:
    """Detailed risk assessment output for a single checkpoint."""

    overall_risk: RiskLevel
    risk_score: int
    risk_label: str
    risk_color: str
    wind_risk: RiskLevel
    rain_risk: RiskLevel
    snow_risk: RiskLevel
    primary_hazard: str
    load_escalation_applied: bool
    escalation_reason: str | None
    is_safe: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "overall_risk": self.overall_risk.name,
            "risk_score": self.risk_score,
            "risk_label": self.risk_label,
            "risk_color": self.risk_color,
            "wind_risk": self.wind_risk.name,
            "rain_risk": self.rain_risk.name,
            "snow_risk": self.snow_risk.name,
            "primary_hazard": self.primary_hazard,
            "load_escalation_applied": self.load_escalation_applied,
            "escalation_reason": self.escalation_reason,
            "is_safe": self.is_safe,
        }


@dataclass
class RouteRiskSummary:
    """Aggregated risk metrics and recommendation evaluation for a single route."""

    route_id: str
    route_name: str
    total_distance_miles: float
    duration_seconds: float
    duration_formatted: str

    # Miles breakdown per risk level
    low_miles: float = 0.0
    moderate_miles: float = 0.0
    high_miles: float = 0.0
    severe_miles: float = 0.0
    no_travel_miles: float = 0.0

    # Aggregated scores
    average_risk: float = 1.0
    max_risk_level: RiskLevel = RiskLevel.LOW
    has_no_travel: bool = False
    is_safe_to_travel: bool = True

    # Recommendation metadata
    is_recommended: bool = False
    rank: int = 0
    recommendation_reason: str = ""

    # Detailed checkpoint list
    checkpoints: list[dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "route_id": self.route_id,
            "route_name": self.route_name,
            "total_distance_miles": round(self.total_distance_miles, 1),
            "duration_seconds": self.duration_seconds,
            "duration_formatted": self.duration_formatted,
            "low_miles": round(self.low_miles, 1),
            "moderate_miles": round(self.moderate_miles, 1),
            "high_miles": round(self.high_miles, 1),
            "severe_miles": round(self.severe_miles, 1),
            "no_travel_miles": round(self.no_travel_miles, 1),
            "average_risk": round(self.average_risk, 2),
            "max_risk_level": self.max_risk_level.name,
            "has_no_travel": self.has_no_travel,
            "is_safe_to_travel": self.is_safe_to_travel,
            "is_recommended": self.is_recommended,
            "rank": self.rank,
            "recommendation_reason": self.recommendation_reason,
            "checkpoints": self.checkpoints,
        }
