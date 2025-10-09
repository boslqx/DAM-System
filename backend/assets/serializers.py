from rest_framework import serializers
from .models import Asset
import json

class AssetSerializer(serializers.ModelSerializer):
    # Accept tags as a list directly
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list
    )
    
    class Meta:
        model = Asset
        fields = [
            'id', 'user', 'file', 'name', 'description', 'file_type', 
            'file_size', 'tags', 'keywords', 'category', 'created_at', 
            'updated_at', 'thumbnail', 'is_public', 'preview_url', 
            'polygon_count', 'dimensions'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']
    
    def validate_file(self, value):
        # Validate file size (100MB max)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 100MB")
        return value
    
    def create(self, validated_data):
        # Auto-assign the logged-in user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        return super().create(validated_data)