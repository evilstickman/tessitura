from rest_framework import serializers
from django.db import models
from .song import Song
from .user import User

class PracticeGrid(models.Model):
    # user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

class PracticeGridSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeGrid
    fields = ( 'id','created_at', 'updated_at', 'name', 'notes')
    many=True

  #user = serializers.ModelField(User, required=False)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)
  name = serializers.CharField(required=False)
  notes = serializers.CharField(required=False)

  def create(self, validated_data):
    practice_grid = PracticeGrid.objects.create(**validated_data)
    practice_grid.save()
    return practice_grid