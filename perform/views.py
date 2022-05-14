from django.views.generic import TemplateView
from rest_framework import viewsets
from .models import PracticeGrid, PracticeGridSerializer

# Create your views here.
def index(request):
  context = {}
  return render(request, "perform/index.html", context=context)

class PracticeGridViewSet(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeGrid.objects
  serializer_class = PracticeGridSerializer
  