from urllib import response
from django.views.generic import TemplateView
from requests import Response
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import PracticeGrid, PracticeGridSerializer
from .models import PracticeRow, PracticeRowSerializer
from .models import PracticeCell, PracticeCellSerializer
from .models import PracticeCellCompletion, PracticeCellCompletionSerializer


# Create your views here.
def index(request):
  context = {}
  return render(request, "perform/index.html", context=context)

class PracticeGridAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeGrid.objects.all()
  serializer_class = PracticeGridSerializer

  @action(detail=True)
  def practice_rows(self, request, *args, **kwargs):
    practice_grid = self.get_object()
    
    return Response(practice_grid)

class PracticeRowAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeRow.objects.all()
  serializer_class = PracticeRowSerializer

class PracticeCellAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeCell.objects.all()
  serializer_class = PracticeCellSerializer

class PracticeCellCompletionAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeCellCompletion.objects.all()
  serializer_class = PracticeCellCompletionSerializer