from rest_framework import serializers
from django.db import models
from .song import Song
from .user import User

class PracticeGrid(models.Model):
    song = models.ForeignKey(Song, on_delete=models.CASCADE, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    
class PracticeGridSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeGrid
    fields = ('practice_rows', 'song', 'user', 'created_at', 'updated_at')