from django.shortcuts import render
from django.views.generic import TemplateView

def catchall(request):
  return Template.as_view(template_name='home/index.html')

# Create your views here.
#def index(request):
#  context = {}
#  return render(request, "home/index.html", context=context)