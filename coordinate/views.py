from .models import User, Ensemble
from .serializers import UserSerializer, EnsembleSerializer
from rest_framework import generics

# Create your views here.
class UserListCreate(generics.ListCreateAPIView):
  queryset = User.objects.all()
  serializer_class = UserSerializer

class EnsembleListCreate(generics.ListCreateAPIView):
  queryset = Ensemble.objects.all()
  serializer_class = EnsembleSerializer