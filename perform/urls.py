from django.urls import include, path
from rest_framework import routers

from . import views

router = routers.DefaultRouter()
router.register(r'practice_grid', views.PracticeGridViewSet)
router.register(r'practice_row', views.PracticeGridViewSet)
router.register(r'practice_cell', views.PracticeGridViewSet)
router.register(r'practice_cell_completion', views.PracticeGridViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework'))
]