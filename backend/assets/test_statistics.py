from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Asset
import io
from PIL import Image

User = get_user_model()


class StatisticsTestCase(TestCase):
    """Test cases for Universal Statistics Dashboard Module"""
    
    def setUp(self):
        """Set up test client and single test user"""
        self.client = APIClient()
        
        # Create a single user (no roles)
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='test123'
        )
        
        # Generate token for authentication
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        
        # Create sample assets
        self.create_sample_assets()
    
    def create_sample_assets(self):
        """Helper to create test assets"""
        # Create 3 images
        for i in range(3):
            file = io.BytesIO()
            image = Image.new('RGB', (50, 50), color='red')
            image.save(file, 'JPEG')
            file.seek(0)
            
            img_file = SimpleUploadedFile(
                f"image_{i}.jpg",
                file.read(),
                content_type="image/jpeg"
            )
            
            Asset.objects.create(
                user=self.user,
                name=f'Image {i}',
                file=img_file,
                file_type='IMG',
                file_size=1024 * 100,
                category='Images'
            )
        
        # Create 2 videos
        for i in range(2):
            video_file = SimpleUploadedFile(
                f"video_{i}.mp4",
                b"fake video",
                content_type="video/mp4"
            )
            
            Asset.objects.create(
                user=self.user,
                name=f'Video {i}',
                file=video_file,
                file_type='VID',
                file_size=1024 * 1024 * 5,
                category='Videos'
            )
    
    def test_TC_ST01_total_assets_count(self):
        """TC-ST01: Verify total assets count is accurate"""
        print("\n✅ Testing TC-ST01: Total assets count")
        
        response = self.client.get('/api/assets/stats/')
        
        expected = Asset.objects.filter(user=self.user).count()
        self.assertEqual(response.data['total_assets'], expected)
        print("✅ TC-ST01 PASSED")
    
    def test_TC_ST02_file_type_distribution(self):
        """TC-ST02: Verify file type distribution"""
        print("\n✅ Testing TC-ST02: File type distribution")
        
        response = self.client.get('/api/assets/stats/')
        distribution = response.data['file_type_distribution']
        
        self.assertIsInstance(distribution, list)
        file_types = {item['file_type']: item['count'] for item in distribution}
        
        self.assertEqual(file_types.get('IMG', 0), 3)
        self.assertEqual(file_types.get('VID', 0), 2)
        print("✅ TC-ST02 PASSED")
    
    def test_TC_ST03_recent_uploads_limit(self):
        """TC-ST03: Verify recent uploads are limited to 5 entries"""
        print("\n✅ Testing TC-ST03: Recent uploads limit")
        
        response = self.client.get('/api/assets/stats/')
        recent = response.data['recent_uploads']
        
        self.assertLessEqual(len(recent), 5)
        print("✅ TC-ST03 PASSED")
    
    def test_TC_ST04_user_sees_own_assets_only(self):
        """TC-ST04: Verify user only sees their own assets"""
        print("\n✅ Testing TC-ST04: User data isolation")
        
        # Create another user with their own asset
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@test.com',
            password='pass123'
        )
        other_file = SimpleUploadedFile(
            "other_image.jpg",
            b"fake data",
            content_type="image/jpeg"
        )
        Asset.objects.create(
            user=other_user,
            name='Other Image',
            file=other_file,
            file_type='IMG',
            file_size=1024
        )
        
        # Current user should not see other user's asset
        response = self.client.get('/api/assets/stats/')
        total_assets = Asset.objects.filter(user=self.user).count()
        self.assertEqual(response.data['total_assets'], total_assets)
        print("✅ TC-ST04 PASSED")
    
    def test_TC_ST05_no_assets_case(self):
        """TC-ST05: Verify handling when user has no assets"""
        print("\n✅ Testing TC-ST05: No assets case")
        
        new_user = User.objects.create_user(
            username='emptyuser',
            email='empty@test.com',
            password='pass123'
        )
        new_token = Token.objects.create(user=new_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {new_token.key}')
        
        response = self.client.get('/api/assets/stats/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_assets'], 0)
        self.assertEqual(response.data['total_size_mb'], 0)
        print("✅ TC-ST05 PASSED")
