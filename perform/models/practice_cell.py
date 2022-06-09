from rest_framework import serializers
from django.db import models


class PracticeCell(models.Model):
  from .practice_row import PracticeRow
  practice_row = models.ForeignKey(PracticeRow, on_delete=models.CASCADE)
  target_tempo_percentage = models.FloatField()
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)


class PracticeCellCompletion(models.Model):
  practice_cell = models.ForeignKey(PracticeCell, on_delete=models.CASCADE)
  completion_date = models.DateField(null=True, blank=True)
  created_at = models.DateTimeField(auto_now_add=True)
  updated_at = models.DateTimeField(auto_now=True)

class PracticeCellSerializer(serializers.ModelSerializer):
  from .practice_row import PracticeRow
  class Meta:
    model = PracticeCell
    fields = ('id', 'practice_row_id', 'target_tempo_percentage', 'created_at', 'updated_at')

  id = serializers.IntegerField(required=False)
  practice_row_id = serializers.IntegerField(required=True)
  target_tempo_percentage = serializers.FloatField(required=False)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)

  def create(self, validated_data):
    practice_grid = PracticeCell.objects.create(**validated_data)
    practice_grid.save()
    return practice_grid
    
class PracticeCellCompletionSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeCellCompletion
    fields = ('id','practice_cell_id','completion_date', 'created_at', 'updated_at')

  id = serializers.IntegerField(required=False)
  practice_cell_id = serializers.IntegerField(required=True)
  completion_date = serializers.DateField(required=False)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)

  def create(self, validated_data):
    practice_grid = PracticeCellCompletion.objects.create(**validated_data)
    practice_grid.save()
    return practice_grid