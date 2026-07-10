from django.urls import path

from . import views

urlpatterns = [
    path('queries/',                  views.QueriesView.as_view(), name='queries'),
    path('queries/<int:query_id>/reply/', views.ReplyView.as_view(), name='query-reply'),
    path('roster/',                   views.RosterView.as_view(),  name='roster'),
]
