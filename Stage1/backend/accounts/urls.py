from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import RegisterView, LoginView, ProfileView, GoogleLoginView

urlpatterns = [
    path('register/',      RegisterView.as_view(),  name='auth-register'),
    path('login/',         LoginView.as_view(),     name='auth-login'),
    path('google/',        GoogleLoginView.as_view(), name='auth-google-login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('profile/',       ProfileView.as_view(),   name='auth-profile'),
]
