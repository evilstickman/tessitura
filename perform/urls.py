from django.urls import include, path
from rest_framework import routers

from . import views

from frontend import views as frontendviews

router = routers.DefaultRouter()
router.register(r'practice_grid', views.PracticeGridAPIView, basename='PracticeGrid')
router.register(r'practice_row', views.PracticeRowAPIView, basename='PracticeRow')
router.register(r'practice_cell', views.PracticeCellAPIView, basename='PracticeCell')
router.register(r'practice_cell_completion', views.PracticeCellCompletionAPIView, basename='PracticeCellCompletion')


urlpatterns = [
    path('', include(router.urls)),
]