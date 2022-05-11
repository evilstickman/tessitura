from django.db import models

class PracticeCellCompletion(models.Model):
    completion_date = models.DateField()

class PracticeCell(models.Model):
    practice_cell_completions = models.ForeignKey(PracticeCellCompletion, on_delete=models.CASCADE)
    target_tempo_precentage = models.FloatField()
