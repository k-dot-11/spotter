"""
Django REST Framework Serializers for Trip Planning and Geocoding APIs.
"""

from datetime import UTC, datetime

from rest_framework import serializers


class GeocodeQuerySerializer(serializers.Serializer):
    """Validates autocomplete and search query parameters."""

    q = serializers.CharField(required=True, min_length=2, trim_whitespace=True)
    limit = serializers.IntegerField(default=5, min_value=1, max_value=10, required=False)


class TripAnalysisRequestSerializer(serializers.Serializer):
    """
    Validates user input for the Weather-Aware Truck Routing analysis:
    - Origin & Destination (City string or Lat,Lon)
    - Departure Date/Time (ISO 8601 string, defaults to now)
    - Load Weight in lbs (0 to 150,000 lbs)
    - Sampling Interval (10, 25, or 50 miles)
    """

    origin = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)
    destination = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)
    departure_time = serializers.DateTimeField(required=False, default=None)
    weight_lbs = serializers.FloatField(required=True, min_value=0.0, max_value=150000.0)
    sampling_interval_miles = serializers.ChoiceField(
        choices=[10, 25, 50],
        default=25,
        required=False,
    )

    def validate_departure_time(self, value):
        if value is None:
            return datetime.now(UTC)
        return value
