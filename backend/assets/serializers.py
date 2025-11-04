from rest_framework import serializers
from .models import Asset
import json

class AssetSerializer(serializers.ModelSerializer):
    # Make tags optional with default empty list
    tags = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        default=list,
        allow_null=True  # ADD THIS
    )
    is_favorited = serializers.SerializerMethodField()
    favorites_count = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'user', 'file', 'name', 'description', 'file_type', 
            'file_size', 'tags', 'keywords', 'category', 'created_at', 
            'updated_at', 'thumbnail', 'is_public', 'preview_url', 
            'polygon_count', 'dimensions','is_favorited','favorites_count'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_is_favorited(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_favorited_by(request.user)
        return False

    def get_favorites_count(self, obj):
        return obj.favorited_by.count()
    
    def validate_file(self, value):
        # Validate file size (100MB max)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError("File size cannot exceed 100MB")
        return value
    
    def validate_tags(self, value):
        """Ensure tags is always a list"""
        if value is None:
            return []
        if isinstance(value, list):
            return value
        return []
    
    def create(self, validated_data):
        # Auto-assign the logged-in user
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['user'] = request.user
        
        # Ensure tags is a list
        if 'tags' not in validated_data or validated_data['tags'] is None:
            validated_data['tags'] = []
            
        return super().create(validated_data)