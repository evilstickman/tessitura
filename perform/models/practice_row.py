from django.db import models
from . import PracticeCell

class PracticeRow(models.Model):
    practice_cells = models.ForeignKey(PracticeCell, on_delete=models.CASCADE)
    target_tempo = models.IntegerField()
    start_measure = models.CharField(max_length=25)
    end_measure = models.CharField(max_length=25)
    steps = models.IntegerField()
