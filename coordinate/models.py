from django.db import models




class User(models.Model):
    first_name = models.CharField(max_length=30)
    last_name = models.CharField(max_length=30)
    email = models.CharField(max_length=1024)


class Ensemble(models.Model):
    name = models.CharField(max_length=256)
    Address = models.CharField(max_length=1024)
    administrator = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name="administrator")
    users = models.ManyToManyField(User)
    conductor = models.ForeignKey(User, on_delete=models.DO_NOTHING, related_name="conductor")

class Library(models.Model):
    name = models.CharField(max_length=30)
    description = models.TextField()
    ensemble = models.ForeignKey(Ensemble, on_delete=models.DO_NOTHING)

class Music(models.Model):
    name = models.CharField(max_length=256)
    composer = models.CharField(max_length=256)
    uploaded_by = models.ForeignKey(User, on_delete=models.DO_NOTHING)
    library = models.ForeignKey(Library, on_delete=models.DO_NOTHING)

    