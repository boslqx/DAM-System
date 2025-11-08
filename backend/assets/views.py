from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import Asset
from .serializers import AssetSerializer
from users.permissions import IsAdmin, IsEditorOrAdmin, IsViewerOrHigher
from activitylog.models import ActivityLog  
import json
from django.db.models import Sum, Count, Q
from .utils import calculate_image_hash, compare_image_sets
import io

class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]  # file uplaods reader

    def get_parsers(self):
        """Use appropriate parser based on request method"""
        if self.request.method in ['PATCH', 'PUT']:
            # Use JSONParser for updates
            return [JSONParser()]
        # Use MultiPartParser/FormParser for file uploads (POST)
        return [MultiPartParser(), FormParser()]

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
        search = params.get('search')
        if search:
            # Search across multiple fields
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(keywords__icontains=search) |
                Q(tags__contains=[search])  # Search in tags array
            )

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
        asset = serializer.save(user=self.request.user)
        
        # Hashing- IMG only
        if asset.file_type == 'IMG':
            try:
                from .utils import calculate_image_hash, get_dominant_colors
                
                hashes = calculate_image_hash(asset.file.path)
                if hashes:
                    asset.average_hash = hashes['average_hash']
                    asset.perceptual_hash = hashes['perceptual_hash']
                    asset.difference_hash = hashes['difference_hash']
                    
                    # Extract dominant colors
                    colors = get_dominant_colors(asset.file.path)
                    if colors:
                        asset.dominant_colors = colors
                    
                    asset.save()
            except Exception as e:
                print(f"Error calculating hash for new asset: {e}")
        
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
        user = request.user

        user_assets = Asset.objects.filter(user=user)
        
        #Calculate statistics
        total_assets = user_assets.count()
        total_size = user_assets.aggregate(total=Sum('file_size'))['total'] or 0
        favorites_count = user.favorite_assets.count()
        
        #File type distribution
        file_type_distribution = (
            user_assets.values('file_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        #Recent uploads (last 5)
        recent_uploads = user_assets.order_by('-created_at')[:5]
        recent_serializer = self.get_serializer(recent_uploads, many=True)
        
        #Category distribution
        category_distribution = (
            user_assets.exclude(category__isnull=True)
            .exclude(category='')
            .values('category')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        
        return Response({
            'total_assets': total_assets,
            'total_size': total_size,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'favorites_count': favorites_count,
            'file_type_distribution': list(file_type_distribution),
            'category_distribution': list(category_distribution),
            'recent_uploads': recent_serializer.data,
        })

    

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def search_by_image(self, request):
        """
        Allows users to upload an image and find visually similar assets.
        """
        uploaded_image = request.FILES.get('image')

        if not uploaded_image:
            return Response({'error': 'No image provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if not uploaded_image.content_type.startswith('image/'):
            return Response({'error': 'File must be an image.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            #Generate hashes for the uploaded image
            image_hashes = calculate_image_hash(uploaded_image)
            if not image_hashes:
                return Response({'error': 'Unable to process image.'}, status=status.HTTP_400_BAD_REQUEST)

            #Retrieve only assets with hashes- IMG
            image_assets = Asset.objects.filter(
                file_type='IMG',
            ).exclude(
                average_hash__isnull=True
            ).exclude(
                average_hash=''
            )

            results = []
            for asset in image_assets:
                asset_hashes = {
                    'average_hash': asset.average_hash,
                    'perceptual_hash': asset.perceptual_hash,
                    'difference_hash': asset.difference_hash,
                }

                similarity = compare_image_sets(image_hashes, asset_hashes)
                if similarity >= 70: 
                    results.append({
                        'asset': asset,
                        'similarity': round(similarity, 2)
                    })

            #Sort results by highest first
            results.sort(key=lambda x: x['similarity'], reverse=True)

            # Serialize final results
            serialized = []
            for r in results:
                data = AssetSerializer(r['asset'], context={'request': request}).data
                data['similarity_score'] = r['similarity']
                serialized.append(data)

            return Response({
                'count': len(serialized),
                'results': serialized
            })

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)