from django.urls import path
from .views import (
    RegressionPreviewView,
    RegressionRunView,
    RegressionUploadRunView,
    RegressionResultsListView,
    RegressionResultDetailView,
    RegressionPredictView,
    RegressionTaskStatusView,
)

urlpatterns = [
    # Data preview — no auth, no Docker, instant
    path('preview/',          RegressionPreviewView.as_view(),    name='regression-preview'),

    # Experiment execution — requires auth
    path('run/',              RegressionRunView.as_view(),         name='regression-run'),
    path('upload-run/',       RegressionUploadRunView.as_view(),   name='regression-upload-run'),
    path('predict/',          RegressionPredictView.as_view(),     name='regression-predict'),
    path('run-status/',       RegressionTaskStatusView.as_view(),  name='regression-run-status'),

    # Result history
    path('results/',          RegressionResultsListView.as_view(), name='regression-results'),
    path('results/<int:pk>/', RegressionResultDetailView.as_view(),name='regression-result-detail'),
]
