from django.views.generic import TemplateView

# Create your views here.
def index(request):
  context = {}
  return render(request, "perform/index.html", context=context)