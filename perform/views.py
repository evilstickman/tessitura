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
  queryset = PracticeGrid.objects.order_by('name').all()
  serializer_class = PracticeGridSerializer

  @action(detail=True)
  def practice_rows(self, request, *args, **kwargs):
    practice_grid = self.get_object()
    practice_rows = PracticeRow.objects.filter(practice_grid_id=practice_grid.id).all()
    serializer = PracticeRowSerializer(practice_rows, many=True)
    return Response(serializer.data)

  @action(detail=False)
  def create_empty_grid(self, request, *args, **kwargs):
    #name = 
    # get name
    # get notes
    # create new grid for user
    return Response()


class PracticeRowAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeRow.objects.order_by('start_measure').all()
  serializer_class = PracticeRowSerializer

  @action(detail=True)
  def practice_cells(self, request, *args, **kwargs):
    practice_row = self.get_object()
    practice_cells = PracticeCell.objects.filter(practice_row_id=practice_row.id).all()
    serializer = PracticeCellSerializer(practice_cells, many=True)
    return Response(serializer.data)

class PracticeCellAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeCell.objects.order_by('target_tempo_percentage').all()
  serializer_class = PracticeCellSerializer

  @action(detail=True)
  def practice_cell_completions(self, request, *args, **kwargs):
    practice_cell = self.get_object()
    practice_cell_completions = PracticeCellCompletion.objects.filter(practice_cell_id=practice_cell.id).all()
    serializer = PracticeCellCompletionSerializer(practice_cell_completions, many=True)
    return Response(serializer.data)
  
class PracticeCellCompletionAPIView(viewsets.ModelViewSet):
  """
  # view/edit endpoint for practice grids
  """
  queryset = PracticeCellCompletion.objects.all().order_by('completion_date')
  serializer_class = PracticeCellCompletionSerializer