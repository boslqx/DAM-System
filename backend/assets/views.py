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
from django.db.models import Sum, Count

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
            
            # Make a mutable copy of the data
            data = request.data.copy()
            
            # Handle tags sent as tags[] array from FormData
            if 'tags[]' in request.data:
                # getlist returns all values for keys ending with []
                tags_list = request.data.getlist('tags[]')
                # Ensure the mutable QueryDict stores a proper multi-value list for 'tags'
                if hasattr(data, 'setlist'):
                    data.setlist('tags', tags_list)
                else:
                    data['tags'] = list(tags_list)
                # Remove the raw tags[] entries to avoid confusion downstream
                try:
                    del data['tags[]']
                except Exception:
                    pass
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
                    # Ensure all list elements are strings
                    data['tags'] = [str(tag) for tag in tags_value]
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
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        """Get dashboard statistics for the current user"""
        user = request.user
        
        # Get assets based on user role
        if hasattr(user, 'role') and user.role == 'Admin':
            user_assets = Asset.objects.all()
        else:
            user_assets = Asset.objects.filter(user=user)
        
        # Calculate statistics
        total_assets = user_assets.count()
        total_size = user_assets.aggregate(total=Sum('file_size'))['total'] or 0
        favorites_count = user.favorite_assets.count()
        
        # Get file type distribution
        file_type_distribution = user_assets.values('file_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Get recent uploads (last 5)
        recent_uploads = user_assets.order_by('-created_at')[:5]
        recent_serializer = self.get_serializer(recent_uploads, many=True)
        
        # Get category distribution
        category_distribution = user_assets.exclude(
            category__isnull=True
        ).exclude(
            category=''
        ).values('category').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        return Response({
            'total_assets': total_assets,
            'total_size': total_size,  # in bytes
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'favorites_count': favorites_count,
            'file_type_distribution': list(file_type_distribution),
            'category_distribution': list(category_distribution),
            'recent_uploads': recent_serializer.data,
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def recent(self, request):
        """Get recently uploaded assets (last 10)"""
        user = request.user
        
        # Get assets based on user role
        if hasattr(user, 'role') and user.role == 'Admin':
            recent_assets = Asset.objects.all()
        else:
            recent_assets = Asset.objects.filter(
                user=user
            ) | Asset.objects.filter(
                is_public=True
            )
        
        recent_assets = recent_assets.order_by('-created_at')[:10]
        serializer = self.get_serializer(recent_assets, many=True)
        return Response(serializer.data)