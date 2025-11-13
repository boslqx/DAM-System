
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from users.models import User


class DashboardTests(APITestCase):


    def setUp(self):
        """Set up test users and authentication"""
        self.client = APIClient()

        # Create admin user
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='admin123',
            role='Admin'
        )
        self.admin_token = Token.objects.create(user=self.admin_user)

        # Create editor user
        self.editor_user = User.objects.create_user(
            username='editor',
            email='editor@test.com',
            password='editor123',
            role='Editor'
        )
        self.editor_token = Token.objects.create(user=self.editor_user)

        # Create viewer user
        self.viewer_user = User.objects.create_user(
            username='viewer',
            email='viewer@test.com',
            password='viewer123',
            role='Viewer'
        )
        self.viewer_token = Token.objects.create(user=self.viewer_user)

    def test_admin_can_list_users(self):
        """Test 1: Admin can view user list"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        response = self.client.get('/api/users/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)

    def test_viewer_cannot_list_users(self):
        """Test 2: Viewer cannot view user list"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.viewer_token.key}')
        response = self.client.get('/api/users/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_create_user(self):
        """Test 3: Admin can create new users"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')

        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'newpass123',
            'role': 'Editor'
        }
        response = self.client.post('/api/users/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_editor_cannot_create_user(self):
        """Test 4: Editor cannot create users"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.editor_token.key}')

        data = {
            'username': 'newuser2',
            'email': 'newuser2@test.com',
            'password': 'newpass123',
            'role': 'Viewer'
        }
        response = self.client.post('/api/users/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_delete_user(self):
        """Test 5: Admin can delete users"""
        test_user = User.objects.create_user(
            username='deleteme',
            email='deleteme@test.com',
            password='delete123',
            role='Viewer'
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        url = f'/api/users/{test_user.pk}/'
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(username='deleteme').exists())