from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AgenticWorkflowViewSet, QuotaView

router = DefaultRouter()
router.register(r'workflows', AgenticWorkflowViewSet, basename='workflow')

urlpatterns = [
    path('quota/', QuotaView.as_view(), name='quota'),
    path('', include(router.urls)),
]
