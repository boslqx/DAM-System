from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from assets.views import AssetViewSet

router = routers.DefaultRouter()
router.register(r'assets', AssetViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]
