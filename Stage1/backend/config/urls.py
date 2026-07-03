from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('accounts.urls')),
    path('api/v1/scenarios/', include('scenarios.urls')),
    path('api/v1/regression/', include('regression.urls')),
    path('api/v1/classification/', include('classification.urls')),
    path('api/v1/neural_network/', include('neural_network.urls')),
    path('api/v1/computer_vision/', include('computer_vision.urls')),
    path('api/v1/agentic/', include('agentic_flow.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
