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

    def get_serializer_context(self):
        """Pass request to serializer for is_favorited check"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Allow anyone to view assets (for testing)
            permission_classes = []
        elif self.action in ['create', 'update', 'partial_update']:
            permission_classes = [IsEditorOrAdmin]  # Editor & Admin
        elif self.action in ['destroy']:
            permission_classes = [IsAdmin]  # Only Admin can delete
        else:
            permission_classes = [IsViewerOrHigher]
        return [perm() for perm in permission_classes]

    def log_action(self, user, action_type, description, ip_address):
        """Helper to create activity logs (model has no table_affected/record_id)."""
        ActivityLog.objects.create(
            user=user,
            action_type=action_type,
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
            
            # DON'T copy for large files - work with request.data directly
            data = request.data
            
            # Handle tags sent as tags[] array from FormData
            tags_to_save = []
            if 'tags[]' in request.data:
                tags_list = request.data.getlist('tags[]')
                tags_to_save = list(tags_list)
                print("Tags extracted from tags[]:", tags_list)
            elif 'tags' in data:
                tags_value = data.get('tags')
                if isinstance(tags_value, str) and tags_value.strip():
                    try:
                        parsed = json.loads(tags_value)
                        if isinstance(parsed, list):
                            tags_to_save = parsed
                    except (json.JSONDecodeError, ValueError):
                        tags_to_save = [tag.strip() for tag in tags_value.split(',') if tag.strip()]
                elif isinstance(tags_value, list):
                    tags_to_save = [str(tag) for tag in tags_value]
            
            print("Final tags to be saved:", tags_to_save)
            
            # Build the data dict for serializer
            serializer_data = {
                'name': data.get('name'),
                'description': data.get('description', ''),
                'category': data.get('category', ''),
                'file_type': data.get('file_type'),
                'file_size': data.get('file_size'),
                'keywords': data.get('keywords', ''),
                'is_public': data.get('is_public', True),
                'tags': tags_to_save,
            }
            
            # Add file if present
            if 'file' in request.FILES:
                serializer_data['file'] = request.FILES['file']
            
            serializer = self.get_serializer(data=serializer_data, context={'request': request})
            
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
            description=f"Uploaded asset '{asset.name}' ({asset.file_type}) [id={asset.id}]",
            ip_address=self.request.META.get('REMOTE_ADDR'),
        )

        return asset

    def perform_update(self, serializer):
        """Save the updated asset and log the action"""
        asset = serializer.save()

        self.log_action(
            user=self.request.user,
            action_type="update",
            description=f"Updated asset '{asset.name}' ({asset.file_type}) [id={asset.id}]",
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
            description=f"Deleted asset '{asset_name}' ({asset_file_type}) [id={asset_id}]",
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
        assets = Asset.objects.filter(is_public=True).order_by('-created_at')
        serializer = self.get_serializer(assets, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        asset = self.get_object()
        user = request.user

        if asset.favorited_by.filter(id=user.id).exists():
            return Response(
                {'detail': 'Asset already in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )

        asset.favorited_by.add(user)

        # Log the action
        self.log_action(
            user=user,
            action_type="favorite",
            description=f"Favorited asset '{asset.name}' [id={asset.id}]",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response(
            {'detail': 'Asset added to favorites'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def unfavorite(self, request, pk=None):
        """Remove asset from favorites"""
        asset = self.get_object()
        user = request.user

        if not asset.favorited_by.filter(id=user.id).exists():
            return Response(
                {'detail': 'Asset not in favorites'},
                status=status.HTTP_400_BAD_REQUEST
            )

        asset.favorited_by.remove(user)

        # Log the action
        self.log_action(
            user=user,
            action_type="unfavorite",
            description=f"Unfavorited asset '{asset.name}' [id={asset.id}]",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response(
            {'detail': 'Asset removed from favorites'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def favorites(self, request):
        user = request.user
        favorites = Asset.objects.filter(favorited_by=user).order_by('-created_at')
        serializer = self.get_serializer(favorites, many=True)
        return Response(serializer.data)