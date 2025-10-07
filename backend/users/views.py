from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, viewsets, permissions
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User
from .serializers import UserSerializer
from .permissions import IsAdmin

# 🔹 Valid roles constant
VALID_ROLES = ["Admin", "Editor", "Viewer"]

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
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    # 🟡 Create new user (Admin only)
    def create(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role')

        if not username or not password or not role:
            return Response({'error': 'Missing fields'}, status=status.HTTP_400_BAD_REQUEST)

        if role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(username=username, password=password, role=role)
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # 🟡 Update role or username (PATCH)
    def partial_update(self, request, *args, **kwargs):
        user = self.get_object()
        role = request.data.get('role')

        if role and role not in VALID_ROLES:
            return Response({'error': 'Invalid role'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # 🟡 Delete user
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response({'message': 'User deleted successfully'}, status=status.HTTP_204_NO_CONTENT)
