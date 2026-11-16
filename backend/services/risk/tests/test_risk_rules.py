import unittest

from services.risk.evaluator import evaluate_checkpoint_risk
from services.risk.rules import (
    RiskLevel,
    apply_load_weight_rules,
    classify_rain_risk,
    classify_snow_risk,
    classify_wind_risk,
)


class TestRiskThresholdRules(unittest.TestCase):
    """Verifies every threshold specified in the assessment PDF."""

    def test_wind_thresholds(self):
        # Low: < 25 mph
        self.assertEqual(classify_wind_risk(0), RiskLevel.LOW)
        self.assertEqual(classify_wind_risk(15.5), RiskLevel.LOW)
        self.assertEqual(classify_wind_risk(24.9), RiskLevel.LOW)

        # Moderate: 25–34 mph
        self.assertEqual(classify_wind_risk(25.0), RiskLevel.MODERATE)
        self.assertEqual(classify_wind_risk(30.0), RiskLevel.MODERATE)
        self.assertEqual(classify_wind_risk(34.9), RiskLevel.MODERATE)

        # High: 35–44 mph
        self.assertEqual(classify_wind_risk(35.0), RiskLevel.HIGH)
        self.assertEqual(classify_wind_risk(40.0), RiskLevel.HIGH)
        self.assertEqual(classify_wind_risk(44.9), RiskLevel.HIGH)

        # Severe: 45–54 mph
        self.assertEqual(classify_wind_risk(45.0), RiskLevel.SEVERE)
        self.assertEqual(classify_wind_risk(50.0), RiskLevel.SEVERE)
        self.assertEqual(classify_wind_risk(54.9), RiskLevel.SEVERE)

        # No Travel: >= 55 mph
        self.assertEqual(classify_wind_risk(55.0), RiskLevel.NO_TRAVEL)
        self.assertEqual(classify_wind_risk(65.0), RiskLevel.NO_TRAVEL)

    def test_rain_thresholds(self):
        # Low: < 0.10 in/hr
        self.assertEqual(classify_rain_risk(0.0), RiskLevel.LOW)
        self.assertEqual(classify_rain_risk(0.09), RiskLevel.LOW)

        # Moderate: 0.10–0.25 in/hr
        self.assertEqual(classify_rain_risk(0.10), RiskLevel.MODERATE)
        self.assertEqual(classify_rain_risk(0.20), RiskLevel.MODERATE)
        self.assertEqual(classify_rain_risk(0.25), RiskLevel.MODERATE)

        # High: 0.25–0.50 in/hr
        self.assertEqual(classify_rain_risk(0.26), RiskLevel.HIGH)
        self.assertEqual(classify_rain_risk(0.50), RiskLevel.HIGH)

        # Severe: 0.50–1.00 in/hr
        self.assertEqual(classify_rain_risk(0.51), RiskLevel.SEVERE)
        self.assertEqual(classify_rain_risk(1.00), RiskLevel.SEVERE)

        # No Travel: > 1.00 in/hr
        self.assertEqual(classify_rain_risk(1.01), RiskLevel.NO_TRAVEL)
        self.assertEqual(classify_rain_risk(2.50), RiskLevel.NO_TRAVEL)

    def test_snow_thresholds(self):
        # Low: < 0.5 in/hr
        self.assertEqual(classify_snow_risk(0.0), RiskLevel.LOW)
        self.assertEqual(classify_snow_risk(0.49), RiskLevel.LOW)

        # Moderate: 0.5–1.0 in/hr
        self.assertEqual(classify_snow_risk(0.50), RiskLevel.MODERATE)
        self.assertEqual(classify_snow_risk(1.00), RiskLevel.MODERATE)

        # High: 1.0–2.0 in/hr
        self.assertEqual(classify_snow_risk(1.01), RiskLevel.HIGH)
        self.assertEqual(classify_snow_risk(2.00), RiskLevel.HIGH)

        # Severe: 2.0–3.0 in/hr
        self.assertEqual(classify_snow_risk(2.01), RiskLevel.SEVERE)
        self.assertEqual(classify_snow_risk(3.00), RiskLevel.SEVERE)

        # No Travel: > 3.0 in/hr
        self.assertEqual(classify_snow_risk(3.01), RiskLevel.NO_TRAVEL)
        self.assertEqual(classify_snow_risk(5.00), RiskLevel.NO_TRAVEL)

    def test_load_weight_rules(self):
        # 1. >= 55 mph -> No Travel for any load
        risk, reason = apply_load_weight_rules(
            wind_mph=56.0, weight_lbs=10000, base_wind_risk=RiskLevel.NO_TRAVEL
        )
        self.assertEqual(risk, RiskLevel.NO_TRAVEL)
        self.assertIn(">= 55 mph", reason)

        risk, reason = apply_load_weight_rules(
            wind_mph=55.0, weight_lbs=70000, base_wind_risk=RiskLevel.NO_TRAVEL
        )
        self.assertEqual(risk, RiskLevel.NO_TRAVEL)

        # 2. 45–54 mph + > 30,000 lb -> No Travel
        # Below threshold: 30,000 lb remains Severe
        risk, reason = apply_load_weight_rules(
            wind_mph=48.0, weight_lbs=30000, base_wind_risk=RiskLevel.SEVERE
        )
        self.assertEqual(risk, RiskLevel.SEVERE)
        self.assertIsNone(reason)

        # Above threshold: 30,001 lb escalates to No Travel
        risk, reason = apply_load_weight_rules(
            wind_mph=48.0, weight_lbs=30001, base_wind_risk=RiskLevel.SEVERE
        )
        self.assertEqual(risk, RiskLevel.NO_TRAVEL)
        self.assertIn("> 30,000 lb", reason)

        # 3. 35–44 mph + > 40,000 lb -> Severe
        # Below threshold: 40,000 lb remains High
        risk, reason = apply_load_weight_rules(
            wind_mph=38.0, weight_lbs=40000, base_wind_risk=RiskLevel.HIGH
        )
        self.assertEqual(risk, RiskLevel.HIGH)
        self.assertIsNone(reason)

        # Above threshold: 40,001 lb escalates to Severe
        risk, reason = apply_load_weight_rules(
            wind_mph=38.0, weight_lbs=42000, base_wind_risk=RiskLevel.HIGH
        )
        self.assertEqual(risk, RiskLevel.SEVERE)
        self.assertIn("> 40,000 lb", reason)


class TestCheckpointEvaluator(unittest.TestCase):
    """Verifies combined multi-condition checkpoint evaluation."""

    def test_calm_conditions(self):
        result = evaluate_checkpoint_risk(
            wind_mph=10.0, rain_in_per_hr=0.02, snow_in_per_hr=0.0, weight_lbs=25000
        )
        self.assertEqual(result.overall_risk, RiskLevel.LOW)
        self.assertEqual(result.risk_score, 1)
        self.assertTrue(result.is_safe)
        self.assertFalse(result.load_escalation_applied)

    def test_dominant_hazard_selection(self):
        # Wind is Moderate (28 mph), Rain is High (0.35 in/hr), Snow is Low
        result = evaluate_checkpoint_risk(
            wind_mph=28.0, rain_in_per_hr=0.35, snow_in_per_hr=0.0, weight_lbs=25000
        )
        self.assertEqual(result.overall_risk, RiskLevel.HIGH)
        self.assertEqual(result.risk_score, 3)
        self.assertIn("Rain", result.primary_hazard)

    def test_load_escalation_triggers_checkpoint_overall_risk(self):
        # Wind is 38 mph (normally High), Rain is Low, Snow is Low
        # Load is 45,000 lb (> 40k), so wind escalates to Severe -> overall becomes Severe!
        result = evaluate_checkpoint_risk(
            wind_mph=38.0, rain_in_per_hr=0.0, snow_in_per_hr=0.0, weight_lbs=45000
        )
        self.assertEqual(result.overall_risk, RiskLevel.SEVERE)
        self.assertEqual(result.risk_score, 4)
        self.assertTrue(result.load_escalation_applied)
        self.assertIn("> 40,000 lb", result.escalation_reason)

    def test_no_travel_flagging(self):
        # Extreme snow > 3.0 in/hr
        result = evaluate_checkpoint_risk(
            wind_mph=15.0, rain_in_per_hr=0.0, snow_in_per_hr=3.5, weight_lbs=30000
        )
        self.assertEqual(result.overall_risk, RiskLevel.NO_TRAVEL)
        self.assertEqual(result.risk_score, 5)
        self.assertFalse(result.is_safe)


if __name__ == "__main__":
    unittest.main()
