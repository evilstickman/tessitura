from django.db import models

class Song(models.Model):
    composer = models.CharField(max_length=255, null=True, blank=True)
    part = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)