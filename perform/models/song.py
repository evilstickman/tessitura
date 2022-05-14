from django.db import models

class Song(models.Model):
    composer = models.CharField(max_length=255)
    part = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)