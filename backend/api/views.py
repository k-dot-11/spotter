from datetime import datetime, timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def health_check(request):
    """
    Health check endpoint to verify backend service status.
    """
    return Response({
        "status": "ok",
        "service": "spotter-weather-truck-routing",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
