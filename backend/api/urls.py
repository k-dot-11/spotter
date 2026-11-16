from django.urls import path

from .views import analyze_routes_view, geocode_view, health_check

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("geocode/", geocode_view, name="geocode"),
    path("routes/analyze/", analyze_routes_view, name="routes-analyze"),
]
