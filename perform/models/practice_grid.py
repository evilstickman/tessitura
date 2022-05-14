from rest_framework import serializers
from django.db import models
from .practice_row import PracticeRow
from .song import Song
from .user import User

class PracticeGrid(models.Model):
    practice_rows = models.ForeignKey(PracticeRow, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
class PracticeGridSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeGrid
    fields = ('practice_rows', 'song', 'user', 'created_at', 'updated_at')