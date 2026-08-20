from django.urls import path
from .views import ScenarioListView, ScenarioDetailView, CustomDataUploadView, CustomJsonUploadView, CustomVariantDeleteView

urlpatterns = [
    path('',        ScenarioListView.as_view(),   name='scenario-list'),
    path('upload/', CustomDataUploadView.as_view(), name='custom-data-upload'),
    path('upload-json/', CustomJsonUploadView.as_view(), name='custom-json-upload'),
    path('<uuid:pk>/', ScenarioDetailView.as_view(), name='scenario-detail'),
    path('variant/<int:pk>/', CustomVariantDeleteView.as_view(), name='variant-delete'),
]
