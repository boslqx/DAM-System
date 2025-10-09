from django.db import models
from django.conf import settings

class Asset(models.Model):
    FILE_TYPES = [
        ('3D', '3D Model'),
        ('IMG', 'Image'),
        ('VID', 'Video'),
        ('DOC', 'Document'),
        ('OTH', 'Other'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    file = models.FileField(upload_to='uploads/')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file_type = models.CharField(max_length=50, default='unknown') 
    file_size = models.PositiveIntegerField(default=0) 
    tags = models.JSONField(default=list, blank=True)
    keywords = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    thumbnail = models.ImageField(upload_to='thumbnails/', blank=True, null=True)
    is_public = models.BooleanField(default=True)

    # 3D-specific data
    preview_url = models.URLField(blank=True, null=True)
    polygon_count = models.IntegerField(blank=True, null=True)
    dimensions = models.JSONField(blank=True, null=True) 

    def __str__(self):
        return f"{self.name} ({self.file_type})"
