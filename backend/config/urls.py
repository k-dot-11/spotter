from django.contrib import admin
from django.urls import include, path

from api.views import health_check

urlpatterns = [
    path("", health_check, name="root-health-check"),
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
