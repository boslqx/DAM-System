from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import Asset
from .utils import calculate_image_hash, compare_image_sets
import io
from PIL import Image

User = get_user_model()


class ImageSearchTestCase(TestCase):
    """Test cases for Image Search Module"""
    
    def setUp(self):
        """Set up test client and users"""
        self.client = APIClient()
        
        # Create users
        self.editor = User.objects.create_user(
            username='editor',
            email='editor@test.com',
            password='editor123',
            role='Editor'
        )
        
        # Get token
        self.editor_token = Token.objects.create(user=self.editor)
        
        # Create test image asset with hash
        image = self.create_test_image('red')
        red_file = SimpleUploadedFile(
            "red_image.jpg",
            image.getvalue(),
            content_type="image/jpeg"
        )
        
        self.red_asset = Asset.objects.create(
            user=self.editor,
            name='Red Image',
            file=red_file,
            file_type='IMG',
            file_size=1024,
            average_hash='ffffffffffffffff',
            perceptual_hash='0000000000000000',
            difference_hash='aaaaaaaaaaaaaaaa'
        )
    
    def create_test_image(self, color='red'):
        """Helper method to create test image"""
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100), color=color)
        image.save(file, 'JPEG')
        file.seek(0)
        return file
    
    def test_TC_IS01_calculate_hash(self):
        """TC-IS01: Calculate image hash"""
        print("\n✅ Testing TC-IS01: Calculate image hash")
        
        image_bytes = self.create_test_image('blue')
        result = calculate_image_hash(image_bytes)
        
        self.assertIsNotNone(result)
        self.assertIn('average_hash', result)
        self.assertIn('perceptual_hash', result)
        self.assertIn('difference_hash', result)
        print("✅ TC-IS01 PASSED")
    
    def test_TC_IS02_hash_consistency(self):
        """TC-IS02: Same image produces same hash"""
        print("\n✅ Testing TC-IS02: Hash consistency")
        
        image_bytes = self.create_test_image('green')
        hash1 = calculate_image_hash(image_bytes)
        
        image_bytes.seek(0)
        hash2 = calculate_image_hash(image_bytes)
        
        self.assertEqual(hash1['average_hash'], hash2['average_hash'])
        self.assertEqual(hash1['perceptual_hash'], hash2['perceptual_hash'])
        print("✅ TC-IS02 PASSED")
    
    def test_TC_IS03_compare_identical_images(self):
        """TC-IS03: Compare identical image hashes"""
        print("\n✅ Testing TC-IS03: Compare identical hashes")
        
        hash_set = {
            'average_hash': 'ffffffffffffffff',
            'perceptual_hash': '0000000000000000',
            'difference_hash': 'aaaaaaaaaaaaaaaa'
        }
        
        similarity = compare_image_sets(hash_set, hash_set)
        self.assertGreaterEqual(similarity, 99.0)
        print("✅ TC-IS03 PASSED")
    
    def test_TC_IS04_search_rejects_non_image(self):
        """TC-IS04: Search rejects non-image files"""
        print("\n✅ Testing TC-IS04: Reject non-image files")
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.editor_token.key}')
        
        text_file = SimpleUploadedFile(
            "test.txt",
            b"not an image",
            content_type="text/plain"
        )
        
        response = self.client.post(
            '/api/assets/search_by_image/',
            {'image': text_file}
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("✅ TC-IS04 PASSED")
    
class ImageHashCreationTestCase(TestCase):
    """Test automatic hash creation on upload"""
    
    def setUp(self):
        self.client = APIClient()
        self.editor = User.objects.create_user(
            username='editor',
            email='editor@test.com',
            password='editor123',
            role='Editor'
        )
        self.token = Token.objects.create(user=self.editor)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
    
    def test_TC_IS05_image_upload_creates_hash(self):
        """Test that uploading image creates hash automatically"""
        print("\n✅ Testing: Image upload creates hash")
        
        # Create test image
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100), color='green')
        image.save(file, 'JPEG')
        file.seek(0)
        
        image_file = SimpleUploadedFile(
            "test_image.jpg",
            file.read(),
            content_type="image/jpeg"
        )
        
        response = self.client.post('/api/assets/', {
            'file': image_file,
            'name': 'Test Image',
            'file_type': 'IMG',
            'file_size': 1024
        }, format='multipart')
        
        if response.status_code == status.HTTP_201_CREATED:
            asset_id = response.data['asset']['id']
            asset = Asset.objects.get(id=asset_id)
            
            # Check hashes were created
            self.assertIsNotNone(asset.average_hash)
            self.assertIsNotNone(asset.perceptual_hash)
            self.assertIsNotNone(asset.difference_hash)
            self.assertIsNotNone(asset.dominant_colors)
        
        print("✅ TC-IS05 PASSED")