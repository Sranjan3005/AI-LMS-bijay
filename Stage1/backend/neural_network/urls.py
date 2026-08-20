from django.urls import path
from .views import (
    NeuralNetworkPreviewView,
    NeuralNetworkInterpretView,
    NeuralNetworkRunView,
    NeuralNetworkUploadRunView,
    NeuralNetworkResultsListView,
    NeuralNetworkResultDetailView,
)

urlpatterns = [
    path('preview/',          NeuralNetworkPreviewView.as_view(),    name='nn-preview'),
    path('interpret/',        NeuralNetworkInterpretView.as_view(),  name='nn-interpret'),
    path('run/',              NeuralNetworkRunView.as_view(),        name='nn-run'),
    path('upload-run/',       NeuralNetworkUploadRunView.as_view(),  name='nn-upload-run'),
    path('results/',          NeuralNetworkResultsListView.as_view(),name='nn-results'),
    path('results/<int:pk>/', NeuralNetworkResultDetailView.as_view(),name='nn-result-detail'),
]
