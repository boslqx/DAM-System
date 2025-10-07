from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from assets.views import AssetViewSet
from users.views import UserViewSet
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'assets', AssetViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)), # DRF routes
    path('api/auth/', include('users.urls')), 
    path('api/users/', include('users.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
