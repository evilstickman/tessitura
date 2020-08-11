from django.urls import path
from . import views


urlpatterns = [
    path('', views.index ),
    path('home', views.index ),
    path('musicians', views.index ),
    path('ensemble/create', views.index ),
    path('ensembles', views.index ),
]