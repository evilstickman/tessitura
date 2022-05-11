from django.db import models

class Song(models.Model):
    composer = models.CharField(max_length=255)
    part = models.CharField(max_length=255)