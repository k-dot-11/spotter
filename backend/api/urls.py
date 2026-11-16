from django.urls import path

from .views import geocode_view, health_check, plan_trip_view

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("geocode/", geocode_view, name="geocode"),
    path("trips/plan/", plan_trip_view, name="trip-plan"),
]
