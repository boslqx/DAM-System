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

            # Normalize tags from either tags[] (repeated form fields),
            # JSON string in tags, or comma-separated string in tags
            normalized_tags: list[str] = []
            if 'tags[]' in request.data:
                # Multiple fields like tags[]=a, tags[]=b
                normalized_tags = request.data.getlist('tags[]')
                print("Tags extracted from tags[]:", normalized_tags)
            elif 'tags' in data:
                raw_tags = data.get('tags')
                print("Tags value received:", raw_tags, "Type:", type(raw_tags))
                if isinstance(raw_tags, list):
                    normalized_tags = raw_tags
                elif isinstance(raw_tags, str):
                    raw_tags_str = raw_tags.strip()
                    if not raw_tags_str:
                        normalized_tags = []
                    else:
                        # Try JSON array first, otherwise treat as comma-separated
                        try:
                            parsed = json.loads(raw_tags_str)
                            if isinstance(parsed, list):
                                normalized_tags = parsed
                            else:
                                normalized_tags = []
                        except (json.JSONDecodeError, ValueError):
                            normalized_tags = [part.strip() for part in raw_tags_str.split(',') if part.strip()]
                else:
                    normalized_tags = []
            else:
                print("No tags provided")
                normalized_tags = []

            # Force all tags to strings to satisfy serializer CharField child
            normalized_tags = [str(tag) for tag in normalized_tags]

            # Build a clean payload dict rather than passing a QueryDict,
            # to avoid QueryDict coercion of list values into strings
            def _to_bool(value):
                if isinstance(value, bool):
                    return value
                if value is None:
                    return False
                return str(value).lower() in ("1", "true", "yes", "on")

            def _to_int(value, default=0):
                try:
                    return int(value)
                except (TypeError, ValueError):
                    return default

            payload = {
                'file': request.FILES.get('file'),
                'name': data.get('name') or '',
                'description': data.get('description') or '',
                'file_type': data.get('file_type') or '',
                'file_size': _to_int(data.get('file_size'), 0),
                'tags': normalized_tags,
                'keywords': data.get('keywords') or '',
                'category': data.get('category') or '',
                'is_public': _to_bool(data.get('is_public', True)),
            }

            # Optional fields if present
            if 'preview_url' in data:
                payload['preview_url'] = data.get('preview_url')
            if 'polygon_count' in data:
                payload['polygon_count'] = _to_int(data.get('polygon_count'), None)
            if 'dimensions' in data:
                try:
                    dims = data.get('dimensions')
                    payload['dimensions'] = json.loads(dims) if isinstance(dims, str) else dims
                except (json.JSONDecodeError, TypeError, ValueError):
                    payload['dimensions'] = None

            print("Final tags to be saved:", payload.get('tags'))
            print("Final tags type:", type(payload.get('tags')))

            serializer = self.get_serializer(data=payload, context={'request': request})
            
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