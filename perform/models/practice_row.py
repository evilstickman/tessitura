from rest_framework import serializers
from django.db import models
from .song import Song

BASE_PERCENTAGE = 0.4

class PracticeRow(models.Model):
    from .practice_grid import PracticeGrid
    song = models.ForeignKey(Song, on_delete=models.CASCADE, null=True, blank=True)
    practice_grid = models.ForeignKey(PracticeGrid, on_delete=models.CASCADE, related_name='practice_rows')
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
    fields = ('practice_grid_id', 'id', 'target_tempo', 'start_measure', 'end_measure', 'steps', 'created_at', 'updated_at')

  id = serializers.IntegerField(required=False)  
  practice_grid_id = serializers.IntegerField(required=True)
  target_tempo = serializers.IntegerField(required=True)
  start_measure = serializers.CharField(max_length=25, required=True)
  end_measure = serializers.CharField(max_length=25, required=True)
  steps = serializers.IntegerField(required=True)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)
  
  def create(self, validated_data):
    from . import PracticeCell
    practice_row = PracticeRow.objects.create(**validated_data)
    practice_row.save()
    steps = practice_row.steps
    i = 0;
    while i < steps:
      cell_data = {
          'practice_row': practice_row,
          'target_tempo_percentage': ((float)(steps - i)/(steps*2) +  BASE_PERCENTAGE)
      }
      practice_cell = PracticeCell.objects.create(**cell_data)
      practice_cell.save()
      i+= 1
      
    return practice_row