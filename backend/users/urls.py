from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet,login_view

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
] 