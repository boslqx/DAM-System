from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User, ActivityLog
from .serializers import UserSerializer, UserCreateSerializer, ActivityLogSerializer
from .permissions import IsAdmin, IsEditorOrAdmin, IsViewerOrHigher  # Import your existing permissions

# 🔹 Valid roles constant
VALID_ROLES = ["Admin", "Editor", "Viewer"]

# 🔹 Activity Logging Function
def log_action(user, action, record_id, description, table_affected="User"):
    ActivityLog.objects.create(
        UserID=user,
        ActionType=action,
        TableAffected=table_affected,
        RecordID=record_id,
        Description=description
    )

# =========================================================
# 🔹 LOGIN VIEW (returns token + user info)
# =========================================================
@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')

    user = authenticate(username=username, password=password)
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        
        # Log login action
        log_action(
            user,
            "VIEW",
            user.id,
            f"User {user.username} logged in",
            "Authentication"
        )
        
        return Response({
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'token': token.key
        })
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# =========================================================
# 🔹 USER MANAGEMENT VIEWSET (Admin only)
# =========================================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    
    def get_permissions(self):
        """
        Assign permissions based on action:
        - Only Admin can create, update, delete users
        - Editors and Admins can view user list
        - Everyone can view their own profile
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        elif self.action in ['list']:
            permission_classes = [IsEditorOrAdmin]  # Editors can view user list
        else:  # retrieve (view single user)
            permission_classes = [IsViewerOrHigher]  # Anyone can view user details
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    # 🟡 Create new user (Admin only)
    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')
        email = request.data.get('email')

        if not username or not password or not role or not email:
            return Response({'error': 'All fields are required: username, email, password, role'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        if role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, 
            email=email,
            password=password, 
            role=role
        )
        
        # Log the action
        log_action(
            request.user,
            "ADD",
            user.id,
            f"Created user {username} with role {role}"
        )

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # 🟡 Update role (PATCH)
    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        old_role = user.role
        role = request.data.get('role')

        if role and role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        if role and role != old_role:
            # Log role change
            log_action(
                request.user,
                "UPDATE",
                user.id,
                f"Changed role from {old_role} to {role} for user {user.username}"
            )
        
        serializer.save()
        return Response(serializer.data)

    # 🟡 Delete user
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user_id = user.id
        username = user.username
        
        # Prevent self-deletion
        if user == request.user:
            return Response(
                {'error': 'You cannot delete your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the action before deletion
        log_action(
            request.user,
            "DELETE",
            user_id,
            f"Deleted user {username}"
        )
        
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

    # 🟡 List users
    def list(self, request, *args, **kwargs):
        # Log view action
        log_action(
            request.user,
            "VIEW",
            0,
            "Viewed user list",
            "User"
        )
        return super().list(request, *args, **kwargs)

    # 🟡 Retrieve single user
    def retrieve(self, request, *args, **kwargs):
        # Log view action for specific user
        user = self.get_object()
        log_action(
            request.user,
            "VIEW",
            user.id,
            f"Viewed details of user {user.username}",
            "User"
        )
        return super().retrieve(request, *args, **kwargs)


# =========================================================
# 🔹 ACTIVITY LOG VIEWSET
# =========================================================
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdmin]  # Only admins can view activity logs

    def get_queryset(self):
        return ActivityLog.objects.all().order_by('-Timestamp')

    def list(self, request, *args, **kwargs):
        # Log the view of activity logs
        log_action(
            request.user,
            "VIEW",
            0,
            "Viewed activity logs",
            "ActivityLog"
        )
        return super().list(request, *args, **kwargs)