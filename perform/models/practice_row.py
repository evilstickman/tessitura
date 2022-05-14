from rest_framework import serializers
from django.db import models

class PracticeRow(models.Model):
    from .practice_grid import PracticeGrid
    practice_grid = models.ForeignKey(PracticeGrid, on_delete=models.CASCADE)
    target_tempo = models.IntegerField()
    start_measure = models.CharField(max_length=25)
    end_measure = models.CharField(max_length=25)
    steps = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PracticeRowSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeRow
    fields = ('practice_cells', 'target_tempo', 'start_measure', 'end_measure', 'steps', 'created_at', 'updated_at')