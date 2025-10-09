from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Asset
from .serializers import AssetSerializer
from users.permissions import IsAdmin, IsEditorOrAdmin, IsViewerOrHigher
from activitylog.models import ActivityLog  
import json

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    parser_classes = [MultiPartParser, FormParser]  # Important for file uploads!
    
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

    def get_queryset(self):
        """Filter assets based on user permissions and query parameters"""
        user = self.request.user
        params = self.request.query_params
        
        # Admin can see all assets
        if hasattr(user, 'role') and user.role == 'Admin':
            queryset = Asset.objects.all()
        else:
            # Regular users see their own assets + public assets
            queryset = Asset.objects.filter(
                user=user
            ) | Asset.objects.filter(
                is_public=True
            )
        
        # Apply filters
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

    def create(self, request, *args, **kwargs):
        """Handle asset creation with file upload"""
        try:
            print("=== Asset Upload Request ===")
            print("User:", request.user)
            print("Files:", request.FILES)
            print("Raw Data:", dict(request.data))
            
            # Make a mutable copy of the data
            data = request.data.copy()
            
            # Handle tags sent as tags[] array from FormData
            if 'tags[]' in request.data:
                # getlist returns all values for keys ending with []
                tags_list = request.data.getlist('tags[]')
                data['tags'] = tags_list
                print("Tags extracted from tags[]:", tags_list)
                print("Tags type:", type(tags_list))
            # Handle regular tags field
            elif 'tags' in data:
                tags_value = data.get('tags')
                print("Tags value received:", tags_value, "Type:", type(tags_value))
                
                if isinstance(tags_value, str):
                    if not tags_value.strip():
                        data['tags'] = []
                    else:
                        try:
                            parsed = json.loads(tags_value)
                            if isinstance(parsed, list):
                                data['tags'] = parsed
                            else:
                                data['tags'] = []
                        except (json.JSONDecodeError, ValueError):
                            data['tags'] = [tag.strip() for tag in tags_value.split(',') if tag.strip()]
                elif isinstance(tags_value, list):
                    data['tags'] = tags_value
                else:
                    data['tags'] = []
            else:
                data['tags'] = []
                print("No tags provided")
            
            print("Final tags to be saved:", data.get('tags'))
            print("Final tags type:", type(data.get('tags')))
            
            serializer = self.get_serializer(data=data, context={'request': request})
            
            if not serializer.is_valid():
                print("❌ Validation errors:", serializer.errors)
                return Response(
                    {'error': 'Validation failed', 'details': serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            asset = self.perform_create(serializer)
            
            print("✅ Asset created successfully with ID:", asset.id)
            
            return Response(
                {
                    'message': 'Asset uploaded successfully',
                    'asset': serializer.data
                }, 
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            print("❌ Error creating asset:", str(e))
            import traceback
            traceback.print_exc()
            
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_create(self, serializer):
        """Save the asset with the current user and log the action"""
        asset = serializer.save(user=self.request.user)

        # Log the upload action
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
        """Save the updated asset and log the action"""
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
        """Delete the asset and log the action"""
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

    @action(detail=False, methods=['get'])
    def my_assets(self, request):
        """Get only the current user's assets"""
        assets = Asset.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def public_assets(self, request):
        """Get only public assets"""
        assets = Asset.objects.filter(is_public=True).order_by('-created_at')
        serializer = self.get_serializer(assets, many=True)
        return Response(serializer.data)