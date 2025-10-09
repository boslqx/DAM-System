# assets/admin.py
from django.contrib import admin
from .models import Asset

@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ('id', 'category', 'file_type', 'file_size', 'user', 'created_at', 'is_public')
    search_fields = ('category', 'file_type', 'user__username')
