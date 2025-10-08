from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, ActivityLogSerializer
from .permissions import IsAdmin, IsEditorOrAdmin, IsViewerOrHigher
from activitylog.models import ActivityLog  # ✅ Import the correct ActivityLog model


# =========================================================
# 🔹 VALID ROLES CONSTANT
# =========================================================
VALID_ROLES = ["Admin", "Editor", "Viewer"]


# =========================================================
# 🔹 ACTIVITY LOGGING FUNCTION (helper)
# =========================================================
def log_action(user, action, description, ip_address=None):
    """
    Central logging function to record all user activities.
    """
    try:
        ActivityLog.objects.create(
            user=user,
            action_type=action.lower(),  # normalize
            description=description,
            ip_address=ip_address
        )
    except Exception as e:
        print(f"⚠️ Failed to log action: {e}")  # optional safeguard


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

        # Log login
        log_action(
            user,
            "login",
            f"User {user.username} logged in",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'user_id': user.id,
            'username': user.username,
            'role': user.role,
            'token': token.key
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# =========================================================
# 🔹 USER MANAGEMENT VIEWSET (Admin only)
# =========================================================
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAdmin]
        elif self.action in ['list']:
            permission_classes = [IsEditorOrAdmin]
        else:
            permission_classes = [IsViewerOrHigher]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    # 🟡 Create new user
    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')
        email = request.data.get('email')

        if not all([username, password, role, email]):
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

        log_action(
            request.user,
            "add",
            f"Created user {username} with role {role}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # 🟡 Partial update (change role)
    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        old_role = user.role
        new_role = request.data.get('role')

        if new_role and new_role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if new_role and new_role != old_role:
            log_action(
                request.user,
                "update",
                f"Changed role for {user.username} from {old_role} → {new_role}",
                ip_address=request.META.get('REMOTE_ADDR')
            )

        return Response(serializer.data)

    # 🟡 Delete user
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user == request.user:
            return Response({'error': 'You cannot delete your own account'},
                            status=status.HTTP_400_BAD_REQUEST)

        username = user.username
        user.delete()

        log_action(
            request.user,
            "delete",
            f"Deleted user {username}",
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)

    # 🟡 List users
    def list(self, request, *args, **kwargs):
        log_action(
            request.user,
            "view",
            f"Viewed user list",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return super().list(request, *args, **kwargs)

    # 🟡 Retrieve single user
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        log_action(
            request.user,
            "view",
            f"Viewed details of user {user.username}",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return super().retrieve(request, *args, **kwargs)


# =========================================================
# 🔹 ACTIVITY LOG VIEWSET
# =========================================================
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return ActivityLog.objects.all().order_by('-timestamp')

    def list(self, request, *args, **kwargs):
        log_action(
            request.user,
            "view",
            "Viewed activity log list",
            ip_address=request.META.get('REMOTE_ADDR')
        )
        return super().list(request, *args, **kwargs)
