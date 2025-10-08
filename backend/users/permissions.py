from rest_framework import permissions
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        # Make sure the user is authenticated and has Admin role
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'Admin'
        )


class IsEditorOrAdmin(BasePermission):
    """
    Allows access to Admin and Editor users.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['Admin', 'Editor']
        )


class IsViewerOrHigher(BasePermission):
    """
    Allows access to all roles (Viewer, Editor, Admin)
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['Admin', 'Editor', 'Viewer']
        )
    
class AssetPermission(BasePermission):
    """
    Permission for asset management:
    - Admin: All actions
    - Editor: list, retrieve, create, update (no delete)
    - Viewer: list, retrieve only
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Admin can do everything
        if request.user.role == 'Admin':
            return True
            
        # Editor can list, retrieve, create, update (but not delete)
        if request.user.role == 'Editor':
            return view.action in ['list', 'retrieve', 'create', 'update', 'partial_update']
            
        # Viewer can only list and retrieve
        if request.user.role == 'Viewer':
            return view.action in ['list', 'retrieve']
            
        return False