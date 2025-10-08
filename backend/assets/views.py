from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Asset
from .serializers import AssetSerializer
from users.permissions import IsAdmin, IsEditorOrAdmin, IsViewerOrHigher
from activitylog.models import ActivityLog  

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update']:
            permission_classes = [IsEditorOrAdmin]  # Editor & Admin
        elif self.action in ['destroy']:
            permission_classes = [IsAdmin]  # Only Admin can delete
        else:
            permission_classes = [IsViewerOrHigher]  # List & retrieve allowed to all
        return [perm() for perm in permission_classes]

    def log_action(self, user, action_type, table_affected, record_id, description, ip_address):
        """Helper function to create and save activity logs"""
        ActivityLog.objects.create(
            user=user,
            action_type=action_type,
            table_affected=table_affected,
            record_id=record_id,
            description=description,
            ip_address=ip_address,
        )

    def perform_create(self, serializer):
        asset = serializer.save(user=self.request.user)

        # Fixed: Use the helper method to save the log
        self.log_action(
            user=self.request.user,
            action_type="upload",
            table_affected="Asset",
            record_id=asset.id,
            description=f"Uploaded asset '{asset.name}' ({asset.file_type})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

        return asset

    def perform_update(self, serializer):
        asset = serializer.save()

        self.log_action(
            user=self.request.user,
            action_type="update",
            table_affected="Asset",
            record_id=asset.id,
            description=f"Updated asset '{asset.name}' ({asset.file_type})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

        return asset

    def perform_destroy(self, instance):
        asset_id = instance.id
        asset_name = instance.name
        asset_file_type = instance.file_type

        instance.delete()

        self.log_action(
            user=self.request.user,
            action_type="delete",
            table_affected="Asset",
            record_id=asset_id,
            description=f"Deleted asset '{asset_name}' ({asset_file_type})",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

    def get_queryset(self):
        queryset = Asset.objects.all()
        params = self.request.query_params

        keyword = params.get('keyword')
        if keyword:
            queryset = queryset.filter(name__icontains=keyword)

        file_type = params.get('file_type')
        if file_type:
            queryset = queryset.filter(file_type=file_type)

        date_from = params.get('date_from')
        date_to = params.get('date_to')
        if date_from and date_to:
            queryset = queryset.filter(created_at__range=[date_from, date_to])

        tags = params.get('tags')
        if tags:
            tag_list = tags.split(',')
            queryset = queryset.filter(tags__overlap=tag_list)

        return queryset.order_by('-created_at')