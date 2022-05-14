from rest_framework import serializers
from django.db import models


class PracticeCell(models.Model):
    from .practice_row import PracticeRow
    practice_row = models.ForeignKey(PracticeRow, on_delete=models.CASCADE)
    target_tempo_precentage = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PracticeCellCompletion(models.Model):
    practice_cell = models.ForeignKey(PracticeCell, on_delete=models.CASCADE)
    completion_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PracticeCellSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeCell
    fields = ('practice_cell_completions', 'target_tempo_percentage', 'created_at', 'updated_at')

    
class PracticeCellCompletionSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeCellCompletion
    fields = ('completion_date', 'created_at', 'updated_at')