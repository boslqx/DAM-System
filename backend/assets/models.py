from django.db import models

class Asset(models.Model):
    ASSET_TYPES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('model', '3D Model'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to='uploads/')
    type = models.CharField(max_length=20, choices=ASSET_TYPES, default='other')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
