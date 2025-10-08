from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, login_view, ActivityLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'activity-logs', ActivityLogViewSet, basename='activitylog')

urlpatterns = [
    path('login/', login_view, name='login'),  
    path('', include(router.urls)),   
]