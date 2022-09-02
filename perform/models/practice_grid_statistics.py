from rest_framework import serializers
from django.db import models
from .song import Song

BASE_PERCENTAGE = 0.4

class PracticeGridStatistics(models.Model):
    from .practice_grid import PracticeGrid
    practice_grid = models.ForeignKey(PracticeGrid, on_delete=models.CASCADE, related_name='practice_rows')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PracticeGridStatisticsSerializer(serializers.ModelSerializer):
  from .practice_grid import PracticeGrid
  class Meta:
    model = PracticeGridStatistics
    fields = ('practice_grid_id', 'id', 'created_at', 'updated_at')

  id = serializers.IntegerField(required=False)  
  practice_grid_id = serializers.IntegerField(required=True)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)
  
  #def create(self, validated_data):
  #  from . import PracticeCell
  #  practice_row = PracticeRow.objects.create(**validated_data)
  #  practice_row.save()
  #  steps = practice_row.steps
  #  i = 1;
  #  base = BASE_PERCENTAGE
  #  remainder = 1.0-BASE_PERCENTAGE
  #  while i <= steps:
  #    cell_data = {
  #        'practice_row': practice_row,
  #        'target_tempo_percentage': base + (remainder*( i/steps))
  #    }
  #    practice_cell = PracticeCell.objects.create(**cell_data)
  #    practice_cell.save()
  #    i+= 1
      
  #  return practice_row