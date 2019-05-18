from django.db import models
from perform.models import Performer

# Create your models here.
class Director(models.Model):
  first_name = models.CharField(max_length=50)
  last_name = models.CharField(max_length=50)
  email = models.CharField(max_length=255)

class Ensemble(models.Model):
  name = models.CharField(max_length=120)
  director = models.ForeignKey(Director, on_delete=models.DO_NOTHING)

class EnsembleMember(models.Model):
  ensemble = models.ForeignKey(Ensemble, on_delete=models.DO_NOTHING)
  performer = models.ForeignKey(Performer, on_delete=models.DO_NOTHING)