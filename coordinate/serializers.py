from rest_framework import serializers
from .models import User
from .models import Ensemble
from .models import Library
from .models import Music

class UserSerializer(serializers.ModelSerializer):
  class Meta:
    model = User
    fields = ('first_name', 'last_name', 'email')

class Ensemble(serializers.ModelSerializer):
  class Meta:
    model = Ensemble
    fields = ('name', 'Address', 'administrator', 'users', 'conductor')

class Library(serializers.ModelSerializer):
  class Meta:
    model = Library
    fields = ('name', 'description', 'ensemble')

class Music(serializers.ModelSerializer):
  class Meta:
    model = Music
    fields = ('name', 'composer', 'uploaded_by', 'library')

    