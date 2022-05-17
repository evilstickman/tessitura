from rest_framework import serializers
from django.db import models
from .song import Song

class PracticeRow(models.Model):
    from .practice_grid import PracticeGrid
    song = models.ForeignKey(Song, on_delete=models.CASCADE, null=True, blank=True)
    practice_grid = models.ForeignKey(PracticeGrid, on_delete=models.CASCADE)
    target_tempo = models.IntegerField()
    start_measure = models.CharField(max_length=25)
    end_measure = models.CharField(max_length=25)
    steps = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PracticeRowSerializer(serializers.ModelSerializer):
  from .practice_grid import PracticeGrid
  class Meta:
    model = PracticeRow
    fields = ('practice_grid', 'target_tempo', 'start_measure', 'end_measure', 'steps', 'created_at', 'updated_at')
  
  practice_grid = serializers.ModelField(PracticeGrid)
  target_tempo = serializers.IntegerField(required=False)
  start_measure = serializers.CharField(max_length=25, required=False)
  end_measure = serializers.CharField(max_length=25, required=False)
  steps = serializers.IntegerField(required=False)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)
  
  def create(self, validated_data):
    practice_row = PracticeRow.objects.create(**validated_data)
    practice_row.save()
    return practice_row