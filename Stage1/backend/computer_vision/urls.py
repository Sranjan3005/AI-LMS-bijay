from django.urls import path
from .views import (
    CVPreviewView,
    CVRunView,
    CVTaskStatusView,
    CVResultsListView,
    CVResultDetailView,
)

urlpatterns = [
    path('preview/',          CVPreviewView.as_view(),      name='cv-preview'),
    path('run/',              CVRunView.as_view(),           name='cv-run'),
    path('run-status/',       CVTaskStatusView.as_view(),    name='cv-run-status'),
    path('results/',          CVResultsListView.as_view(),   name='cv-results'),
    path('results/<int:pk>/', CVResultDetailView.as_view(),  name='cv-result-detail'),
]
