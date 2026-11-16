"""
API View Controllers for Spotter Weather-Aware Truck Routing.
"""

import logging
from datetime import UTC, datetime

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from services.geocoding import NominatimGeocodingService
from services.orchestrator import TripOrchestrator

from .serializers import GeocodeQuerySerializer, TripAnalysisRequestSerializer

logger = logging.getLogger(__name__)

# Shared service instances
geocoding_service = NominatimGeocodingService()
orchestrator = TripOrchestrator(geocoding_service=geocoding_service)


@api_view(["GET"])
def health_check(request):
    """
    Health check endpoint to verify backend service status.
    """
    return Response(
        {
            "status": "ok",
            "service": "spotter-weather-truck-routing",
            "version": "1.0.0",
            "timestamp": datetime.now(UTC).isoformat(),
        }
    )


@api_view(["GET"])
def geocode_view(request):
    """
    Proxy autocomplete endpoint for city and address lookups.
    Ensures safe User-Agent attachment and prevents browser CORS issues.
    """
    serializer = GeocodeQuerySerializer(data=request.query_params)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    query = serializer.validated_data["q"]
    limit = serializer.validated_data.get("limit", 5)

    results = geocoding_service.autocomplete(query, limit=limit)
    return Response(
        {
            "query": query,
            "results": [r.to_dict() for r in results],
        }
    )


@api_view(["POST"])
def plan_trip_view(request):
    """
    Main Trip Planning & Risk Analysis Endpoint:
    - Generates 3 route options
    - Samples weather every 10 / 25 / 50 miles using arrival ETAs
    - Computes risk levels and cargo load weight escalations
    - Evaluates 4-tier route recommendations
    - Compiles 0–48h corridor heatmap timeline
    """
    serializer = TripAnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {"error": "Validation failed", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )

    validated = serializer.validated_data
    origin = validated["origin"]
    destination = validated["destination"]
    departure_time = validated.get("departure_time") or datetime.now(UTC)
    weight_lbs = validated["weight_lbs"]
    interval_miles = float(validated.get("sampling_interval_miles", 25))

    try:
        result = orchestrator.analyze_trip(
            origin_input=origin,
            destination_input=destination,
            departure_time=departure_time,
            weight_lbs=weight_lbs,
            interval_miles=interval_miles,
        )
        return Response(result, status=status.HTTP_200_OK)

    except ValueError as e:
        logger.warning(f"Bad request in trip analysis: {e}")
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    except Exception as e:
        logger.exception(f"Unexpected error analyzing trip: {e}")
        return Response(
            {"error": "An error occurred while analyzing the route. Please try again."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
