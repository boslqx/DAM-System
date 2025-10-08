from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from users.permissions import IsAdmin  # Import from your users app
from django.utils import timezone
from datetime import datetime

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action_type', 'user__username']
    search_fields = ['description', 'user__username']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']  # Default: newest first

    def get_queryset(self):
        queryset = ActivityLog.objects.all().select_related('user')
        
        # Date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__gte=start_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        if end_date:
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__lte=end_date)
            except ValueError:
                pass  # Ignore invalid date format
        
        return queryset