from rest_framework import serializers
from django.db import connection
from django.db import models
import logging
from .song import Song
from .user import User

logger = logging.getLogger(__name__)

class PracticeGrid(models.Model):
    # user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    def get_all_rows(self):
      from .practice_row import PracticeRow
      return PracticeRow.objects.filter(practice_grid=self).all()

    def get_all_cells(self):
      from .practice_cell import PracticeCell
      return PracticeCell.objects.filter(practice_row_id__practice_grid=self).all()

    def get_all_cell_ids(self):
      
      from .practice_cell import PracticeCell
      return PracticeCell.objects.filter(practice_row_id__practice_grid=self).values('id').all()

    def get_all_cell_completions(self):
      from .practice_cell import PracticeCellCompletion
      return PracticeCellCompletion.objects.filter(practice_cell_id__in=self.get_all_cell_ids()).all()

    def get_cell_count(self):
      from .practice_cell import PracticeCell
      return PracticeCell.objects.filter(practice_row_id__practice_grid=self).values('id').count()

    def get_distinct_cell_completion_count(self):
      from .practice_cell import PracticeCellCompletion
      with connection.cursor() as cursor:
        cursor.execute(f'''
select count(distinct practice_cell_id)
from perform_practicecellcompletion ppcc
join perform_practicecell ppc on ppcc.practice_cell_id = ppc.id
join perform_practicerow ppr on ppc.practice_row_id = ppr.id
where ppr.practice_grid_id={self.id}
and ppcc.completion_date is not NULL
        ''')
        return cursor.fetchone()[0]
      


class PracticeGridSerializer(serializers.ModelSerializer):
  class Meta:
    model = PracticeGrid
    fields = ( 'id','created_at', 'updated_at', 'name', 'notes', 'rows', 'cells', 'cell_completions', 'percentage_complete')
    many=True

  #user = serializers.ModelField(User, required=False)
  created_at = serializers.DateTimeField(required=False)
  updated_at = serializers.DateTimeField(required=False)
  name = serializers.CharField(required=False)
  notes = serializers.CharField(required=False)

  rows = serializers.SerializerMethodField('get_rows')
  cells = serializers.SerializerMethodField('get_cells')
  cell_completions = serializers.SerializerMethodField('get_cell_completions')
  percentage_complete = serializers.SerializerMethodField('get_percentage_complete')
  
  def get_rows(self, obj):
    from .practice_row import PracticeRowSerializer
    rows = obj.get_all_rows()
    serializer = PracticeRowSerializer(rows, many=True)
    return serializer.data
  
  def get_cells(self, obj):
    from .practice_cell import PracticeCellSerializer
    cells = obj.get_all_cells()
    serializer = PracticeCellSerializer(cells, many=True)
    return serializer.data

  def get_cell_completions(self, obj):
    from .practice_cell import PracticeCellCompletionSerializer
    cells = obj.get_all_cell_completions()
    serializer = PracticeCellCompletionSerializer(cells, many=True)
    return serializer.data

  def get_percentage_complete(self, obj):
    distinct_count = obj.get_distinct_cell_completion_count()
    cell_count = obj.get_cell_count()
    logger.warning(f"{distinct_count}/{cell_count}")
    return obj.get_distinct_cell_completion_count() / obj.get_cell_count()

  def create(self, validated_data):
    practice_grid = PracticeGrid.objects.create(**validated_data)
    practice_grid.save()
    return practice_grid