from django.urls import path

from . import views

urlpatterns = [
    path('user', views.UserListCreate.as_view()),
]