from rest_framework import serializers
from .models import User, ActivityLog
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

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        read_only_fields = ['id']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data.get('role', 'Viewer')
        )
        return user

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already exists")
        return value

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='UserID.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'username', 'ActionType', 'TableAffected', 'RecordID', 'Description', 'Timestamp']
        read_only_fields = ['id', 'Timestamp']