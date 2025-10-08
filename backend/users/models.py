from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Editor', 'Editor'),
        ('Viewer', 'Viewer'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Viewer')

    def __str__(self):
        return f"{self.username} ({self.role})"

class ActivityLog(models.Model):
    ACTION_CHOICES = [
        ('ADD', 'Add'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('VIEW', 'View'),
    ]
    
    UserID = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    ActionType = models.CharField(max_length=10, choices=ACTION_CHOICES)
    TableAffected = models.CharField(max_length=50)
    RecordID = models.IntegerField()
    Description = models.TextField()
    Timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.UserID.username} - {self.ActionType} - {self.TableAffected} - {self.Timestamp}"