from django.urls import path

from . import views

urlpatterns = [
    # Student
    path('mine/',     views.MyAssignmentsView.as_view(), name='my-assignments'),
    path('progress/', views.ProgressView.as_view(),      name='assignment-progress'),
    path('<int:placement_id>/submit/', views.SubmitView.as_view(), name='assignment-submit'),
    # School admin
    path('templates/', views.TemplatesView.as_view(), name='assignment-templates'),
    path('assign/',    views.AssignView.as_view(),    name='assignment-assign'),
    path('placements/<int:placement_id>/remove/', views.RemovePlacementView.as_view(), name='assignment-remove'),
    path('student/<int:student_id>/', views.StudentPlacementsView.as_view(), name='student-placements'),
]
