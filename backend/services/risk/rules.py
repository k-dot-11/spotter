"""
Risk Rules and Threshold Definitions for Weather and Cargo Load.
Based on Spotter Full Stack Assessment Specification.
"""

from enum import IntEnum


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


def classify_wind_risk(wind_mph: float) -> RiskLevel:
    """
    Wind thresholds:
    - Low:       < 25 mph
    - Moderate:  25–34 mph
    - High:      35–44 mph
    - Severe:    45–54 mph
    - No Travel: >= 55 mph
    """
    if wind_mph < 0:
        wind_mph = 0.0

    if wind_mph >= 55.0:
        return RiskLevel.NO_TRAVEL
    elif wind_mph >= 45.0:
        return RiskLevel.SEVERE
    elif wind_mph >= 35.0:
        return RiskLevel.HIGH
    elif wind_mph >= 25.0:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


def classify_rain_risk(rain_in_per_hr: float) -> RiskLevel:
    """
    Rain thresholds:
    - Low:       < 0.10 in/hr
    - Moderate:  0.10–0.25 in/hr
    - High:      0.25–0.50 in/hr
    - Severe:    0.50–1.00 in/hr
    - No Travel: > 1.00 in/hr
    """
    if rain_in_per_hr < 0:
        rain_in_per_hr = 0.0

    if rain_in_per_hr > 1.00:
        return RiskLevel.NO_TRAVEL
    elif rain_in_per_hr > 0.50:
        return RiskLevel.SEVERE
    elif rain_in_per_hr > 0.25:
        return RiskLevel.HIGH
    elif rain_in_per_hr >= 0.10:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


def classify_snow_risk(snow_in_per_hr: float) -> RiskLevel:
    """
    Snow thresholds:
    - Low:       < 0.5 in/hr
    - Moderate:  0.5–1.0 in/hr
    - High:      1.0–2.0 in/hr
    - Severe:    2.0–3.0 in/hr
    - No Travel: > 3.0 in/hr
    """
    if snow_in_per_hr < 0:
        snow_in_per_hr = 0.0

    if snow_in_per_hr > 3.00:
        return RiskLevel.NO_TRAVEL
    elif snow_in_per_hr > 2.00:
        return RiskLevel.SEVERE
    elif snow_in_per_hr > 1.00:
        return RiskLevel.HIGH
    elif snow_in_per_hr >= 0.50:
        return RiskLevel.MODERATE
    else:
        return RiskLevel.LOW


def apply_load_weight_rules(
    wind_mph: float, weight_lbs: float, base_wind_risk: RiskLevel
) -> tuple[RiskLevel, str | None]:
    """
    Applies truck cargo load rules:
    - >= 55 mph -> No Travel for any load
    - 45–54 mph + > 30,000 lb -> No Travel (escalated from Severe)
    - 35–44 mph + > 40,000 lb -> Severe (escalated from High)

    Returns (adjusted_risk_level, escalation_reason_or_None)
    """
    # >= 55 mph is always No Travel for any load
    if wind_mph >= 55.0:
        return RiskLevel.NO_TRAVEL, "Wind >= 55 mph (No Travel for any load weight)"

    # 45–54 mph + > 30,000 lb -> No Travel
    if 45.0 <= wind_mph < 55.0 and weight_lbs > 30000:
        return (
            RiskLevel.NO_TRAVEL,
            f"Wind ({wind_mph:.1f} mph) + Weight ({weight_lbs:,.0f} lb > 30,000 lb) escalates to No Travel",
        )

    # 35–44 mph + > 40,000 lb -> Severe
    if 35.0 <= wind_mph < 45.0 and weight_lbs > 40000:
        return (
            RiskLevel.SEVERE,
            f"Wind ({wind_mph:.1f} mph) + Heavy Weight ({weight_lbs:,.0f} lb > 40,000 lb) escalates to Severe",
        )

    return base_wind_risk, None
