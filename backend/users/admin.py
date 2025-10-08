from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, ActivityLog

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff', 'date_joined']
    list_filter = ['role', 'is_staff', 'date_joined']
    fieldsets = UserAdmin.fieldsets + (
        ('Role Information', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Role Information', {'fields': ('role',)}),
    )

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ['UserID', 'ActionType', 'TableAffected', 'RecordID', 'Timestamp']
    list_filter = ['ActionType', 'TableAffected', 'Timestamp']
    search_fields = ['UserID__username', 'Description']
    readonly_fields = ['Timestamp']
    date_hierarchy = 'Timestamp'