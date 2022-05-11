from django.db import models
#
from .practice_row import PracticeRow
from .song import Song
from .user import User

class PracticeGrid(models.Model):
    practice_rows = models.ForeignKey(PracticeRow, on_delete=models.CASCADE)
    song = models.ForeignKey(Song, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    