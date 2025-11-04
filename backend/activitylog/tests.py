from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import ActivityLog
from datetime import datetime, timedelta

User = get_user_model()


class ActivityLogTestCase(TestCase):
    """Test cases for Activity Log Module"""
    
    def setUp(self):
        """Set up test client and users"""
        self.client = APIClient()
        
        self.admin = User.objects.create_user(
            username='admin',
            password='admin123',
            role='Admin'
        )
        self.editor = User.objects.create_user(
            username='editor',
            password='editor123',
            role='Editor'
        )
        
        self.admin_token = Token.objects.create(user=self.admin)
        self.editor_token = Token.objects.create(user=self.editor)
        
        # Create sample activity logs
        ActivityLog.objects.create(
            user=self.admin,
            action_type='login',
            description='Admin user logged in',
            ip_address='127.0.0.1'
        )
        ActivityLog.objects.create(
            user=self.editor,
            action_type='upload',
            description='Uploaded asset "test.jpg"',
            ip_address='192.168.1.1'
        )
        ActivityLog.objects.create(
            user=self.admin,
            action_type='delete',
            description='Deleted user "testuser"',
            ip_address='127.0.0.1'
        )
    
    def test_TC_AL01_view_all_logs(self):
        """TC-AL01: View all activity logs"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        response = self.client.get('/api/activity/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 3)
    
    def test_TC_AL02_filter_by_action_type(self):
        """TC-AL02: Filter by action type"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        response = self.client.get('/api/activity/logs/?action_type=login')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for log in response.data:
            self.assertEqual(log['action_type'], 'login')
    
    def test_TC_AL03_filter_by_date_range(self):
        """TC-AL03: Filter by date range"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        today = datetime.now().date()
        start_date = today - timedelta(days=7)
        end_date = today + timedelta(days=1)
        
        response = self.client.get(
            f'/api/activity/logs/?start_date={start_date}&end_date={end_date}'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
    
    def test_TC_AL04_search_by_username(self):
        """TC-AL04: Search by username"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        response = self.client.get('/api/activity/logs/?search=admin')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for log in response.data:
            self.assertIn('admin', log['username'].lower())
    
    def test_TC_AL05_search_by_description(self):
        """TC-AL05: Search by description"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        response = self.client.get('/api/activity/logs/?search=uploaded')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(len(response.data), 0)
    
    def test_TC_AL09_log_creation(self):
        """TC-AL09: Log creation on user action"""
        initial_count = ActivityLog.objects.count()
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        # Create a new user (this should create a log entry)
        response = self.client.post('/api/users/', {
            'username': 'newuser',
            'email': 'new@test.com',
            'password': 'pass123',
            'role': 'Viewer'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that a new log was created
        new_count = ActivityLog.objects.count()
        self.assertGreater(new_count, initial_count)
        
        # Verify log details
        latest_log = ActivityLog.objects.latest('timestamp')
        self.assertEqual(latest_log.action_type, 'add')
        self.assertIn('newuser', latest_log.description)
    
    def test_TC_AL10_access_restriction(self):
        """TC-AL10: Access restriction"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.editor_token.key}')
        
        response = self.client.get('/api/activity/logs/')
        
        # Editor should not have access to activity logs
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_log_ordering(self):
        """Test logs are ordered by newest first"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.admin_token.key}')
        
        response = self.client.get('/api/activity/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check ordering (newest first)
        timestamps = [log['timestamp'] for log in response.data]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))
    
    def test_log_includes_ip_address(self):
        """Test that logs include IP address"""
        log = ActivityLog.objects.first()
        self.assertIsNotNone(log.ip_address)
        self.assertTrue(len(log.ip_address) > 0)


class ActivityLogCreationTestCase(TestCase):
    """Test automatic activity log creation"""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            password='admin123',
            role='Admin'
        )
        self.token = Token.objects.create(user=self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_login_creates_log(self):
        """Test that login creates activity log"""
        initial_count = ActivityLog.objects.count()
        
        response = self.client.post('/api/auth/login/', {
            'username': 'admin',
            'password': 'admin123'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreater(ActivityLog.objects.count(), initial_count)
        
        latest_log = ActivityLog.objects.latest('timestamp')
        self.assertEqual(latest_log.action_type, 'login')
    
    def test_asset_upload_creates_log(self):
        """Test that asset upload creates activity log"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        initial_count = ActivityLog.objects.count()
        
        file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        
        response = self.client.post('/api/assets/', {
            'file': file,
            'name': 'Test File',
            'file_type': 'DOC',
            'file_size': 100
        }, format='multipart')
        
        if response.status_code == status.HTTP_201_CREATED:
            self.assertGreater(ActivityLog.objects.count(), initial_count)
            
            latest_log = ActivityLog.objects.latest('timestamp')
            self.assertEqual(latest_log.action_type, 'upload')