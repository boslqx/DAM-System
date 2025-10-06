from rest_framework import permissions
from rest_framework.permissions import BasePermission

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        # Make sure the user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        # Only allow if role is Admin
        return request.user.role == 'Admin'


class IsEditorOrAdmin(permissions.BasePermission):
    """
    Allows access to Admin and Editor users.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['Admin', 'Editor']


class IsViewerOrHigher(permissions.BasePermission):
    """
    Allows access to all roles (Viewer, Editor, Admin)
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['Admin', 'Editor', 'Viewer']
    
class AssetPermission(BasePermission):
    def has_permission(self, request, view):
        # Admin can do everything
        if request.user.role == 'Admin':
            return True
        # Editor can list, retrieve, create, update
        if request.user.role == 'Editor':
            return True
        # Viewer can only list and retrieve
        if request.user.role == 'Viewer' and view.action in ['list', 'retrieve']:
            return True
        return False
