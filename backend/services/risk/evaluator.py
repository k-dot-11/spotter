"""
Checkpoint Risk Evaluator.
Evaluates weather conditions and load weight to determine overall checkpoint risk.
"""

from dataclasses import dataclass, asdict
from typing import List, Optional
from .rules import (
    RiskLevel,
    classify_wind_risk,
    classify_rain_risk,
    classify_snow_risk,
    apply_load_weight_rules,
)


@dataclass
class CheckpointRiskResult:
    """Detailed risk assessment for a single checkpoint."""
    overall_risk: RiskLevel
    risk_score: int
    risk_label: str
    risk_color: str
    wind_risk: RiskLevel
    rain_risk: RiskLevel
    snow_risk: RiskLevel
    primary_hazard: str
    load_escalation_applied: bool
    escalation_reason: Optional[str]
    is_safe: bool

    def to_dict(self):
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


def evaluate_checkpoint_risk(
    wind_mph: float,
    rain_in_per_hr: float,
    snow_in_per_hr: float,
    weight_lbs: float,
) -> CheckpointRiskResult:
    """
    Evaluates individual weather parameters, applies truck weight adjustments,
    and returns the unified risk classification for a route checkpoint.
    """
    raw_wind_risk = classify_wind_risk(wind_mph)
    adjusted_wind_risk, escalation_reason = apply_load_weight_rules(
        wind_mph=wind_mph,
        weight_lbs=weight_lbs,
        base_wind_risk=raw_wind_risk
    )
    rain_risk = classify_rain_risk(rain_in_per_hr)
    snow_risk = classify_snow_risk(snow_in_per_hr)

    # Overall risk is the maximum severity across conditions
    max_level = max(adjusted_wind_risk, rain_risk, snow_risk)

    # Determine primary contributing hazards
    hazards: List[str] = []
    if adjusted_wind_risk == max_level and max_level > RiskLevel.LOW:
        hazards.append(f"Wind ({wind_mph:.1f} mph)")
    if rain_risk == max_level and max_level > RiskLevel.LOW:
        hazards.append(f"Rain ({rain_in_per_hr:.2f} in/hr)")
    if snow_risk == max_level and max_level > RiskLevel.LOW:
        hazards.append(f"Snow ({snow_in_per_hr:.2f} in/hr)")

    primary_hazard = ", ".join(hazards) if hazards else "Clear / Calm conditions"

    return CheckpointRiskResult(
        overall_risk=max_level,
        risk_score=int(max_level),
        risk_label=max_level.label,
        risk_color=max_level.color,
        wind_risk=adjusted_wind_risk,
        rain_risk=rain_risk,
        snow_risk=snow_risk,
        primary_hazard=primary_hazard,
        load_escalation_applied=escalation_reason is not None,
        escalation_reason=escalation_reason,
        is_safe=max_level < RiskLevel.NO_TRAVEL,
    )
