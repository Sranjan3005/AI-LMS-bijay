from django.urls import path

from . import views

urlpatterns = [
    # Student
    path('mine/',     views.MyAssignmentsView.as_view(), name='my-assignments'),
    path('progress/', views.ProgressView.as_view(),      name='assignment-progress'),
    path('practice/', views.PracticeView.as_view(),      name='assignment-practice'),
    path('practice/submit/', views.PracticeSubmitView.as_view(), name='assignment-practice-submit'),
    path('activity/', views.ActivityView.as_view(),      name='assignment-activity'),
    path('activity-complete/', views.ActivityCompleteView.as_view(), name='assignment-activity-complete'),
    path('summary/',  views.SummaryView.as_view(),       name='assignment-summary'),
    path('<int:placement_id>/submit/', views.SubmitView.as_view(), name='assignment-submit'),
    # School admin
    path('templates/', views.TemplatesView.as_view(), name='assignment-templates'),
    path('assign/',    views.AssignView.as_view(),    name='assignment-assign'),
    path('assign-class/', views.AssignClassView.as_view(), name='assignment-assign-class'),
    path('plan/',        views.PlanAssignmentView.as_view(), name='assignment-plan'),
    path('plan/create/', views.PlanCreateView.as_view(),     name='assignment-plan-create'),
    path('placements/<int:placement_id>/remove/', views.RemovePlacementView.as_view(), name='assignment-remove'),
    path('student/<int:student_id>/', views.StudentPlacementsView.as_view(), name='student-placements'),
]
