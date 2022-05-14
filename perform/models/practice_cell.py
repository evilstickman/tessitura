from rest_framework import serializers
from django.db import models

class PracticeCellCompletion(models.Model):
    completion_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class PracticeCell(models.Model):
    practice_cell_completions = models.ForeignKey(PracticeCellCompletion, on_delete=models.CASCADE)
    target_tempo_precentage = models.FloatField()
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