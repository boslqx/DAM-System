
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from users.models import User
from activitylog.models import ActivityLog


class LoginViewTests(APITestCase):


    def setUp(self):
        """Set up test client and create test users"""
        self.client = APIClient()

        # Create test users with different roles
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@test.com',
            password='testpass123',
            role='Admin'
        )

        self.editor_user = User.objects.create_user(
            username='editor_test',
            email='editor@test.com',
            password='testpass123',
            role='Editor'
        )

    def test_successful_login_admin(self):
        """Test 1: Successful login with admin credentials"""
        data = {
            'username': 'admin_test',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user_id', response.data)
        self.assertEqual(response.data['username'], 'admin_test')
        self.assertEqual(response.data['role'], 'Admin')

    def test_successful_login_editor(self):
        """Test 2: Successful login with editor credentials"""
        data = {
            'username': 'editor_test',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'Editor')

    def test_login_invalid_password(self):
        """Test 3: Login fails with incorrect password"""
        data = {
            'username': 'admin_test',
            'password': 'wrongpassword'
        }
        response = self.client.post('/api/auth/login/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_login_invalid_username(self):
        """Test 4: Login fails with non-existent username"""
        data = {
            'username': 'nonexistent',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_creates_activity_log(self):
        """Test 5: Successful login creates an activity log entry"""
        initial_log_count = ActivityLog.objects.count()

        data = {
            'username': 'admin_test',
            'password': 'testpass123'
        }
        response = self.client.post('/api/auth/login/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check that activity log was created
        final_count = ActivityLog.objects.count()
        self.assertGreater(final_count, initial_log_count)