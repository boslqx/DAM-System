from rest_framework import serializers
from .models import User
from django.contrib.auth import get_user_model

class UserSerializer(serializers.ModelSerializer):
    def validate_role(self, value):
        allowed_roles = ['Admin', 'Editor', 'Viewer']
        normalized = value.strip().capitalize()  # e.g., "admin" -> "Admin"
        if normalized not in allowed_roles:
            raise serializers.ValidationError("Invalid role")
        return normalized

    

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']  
        read_only_fields = ['id', 'username', 'email']
