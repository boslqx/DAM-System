from rest_framework import serializers
from .models import ActivityLog

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'username', 'action_type', 'description', 'ip_address', 'timestamp']
        read_only_fields = ['id', 'timestamp']