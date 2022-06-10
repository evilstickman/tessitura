from django.urls import path
from . import views


urlpatterns = [
    path('', views.index ),
    path('home', views.index ),
    path('musicians', views.index ),
    path('ensembles/create', views.index ),
    path('ensembles', views.index ),
    path('perform/practice_grid_display', views.index ),
    path('perform', views.index ),
]