from django.contrib import admin
from .models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action_type', 'description', 'ip_address', 'timestamp']
    list_filter = ['action_type', 'timestamp', 'user']
    search_fields = ['user__username', 'description', 'ip_address']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False  # Prevent manual addition of logs