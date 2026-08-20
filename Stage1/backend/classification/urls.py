from django.urls import path
from .views import (
    ClassificationPreviewView,
    ClassificationRunView,
    ClassificationUploadRunView,
    ClassificationPredictView,
    ClassificationResultsListView,
    ClassificationResultDetailView,
)

urlpatterns = [
    path('preview/',          ClassificationPreviewView.as_view(),    name='classification-preview'),
    path('run/',              ClassificationRunView.as_view(),         name='classification-run'),
    path('upload-run/',       ClassificationUploadRunView.as_view(),   name='classification-upload-run'),
    path('predict/',          ClassificationPredictView.as_view(),     name='classification-predict'),
    path('results/',          ClassificationResultsListView.as_view(), name='classification-results'),
    path('results/<int:pk>/', ClassificationResultDetailView.as_view(),name='classification-result-detail'),
]
