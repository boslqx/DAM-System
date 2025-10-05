from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from assets.views import AssetViewSet
from django.conf import settings  
from django.conf.urls.static import static

router = routers.DefaultRouter()
router.register(r'assets', AssetViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)