"""
accounts/views.py

Endpoints:
    POST   /api/v1/auth/register/        → create account, return JWT tokens
    POST   /api/v1/auth/login/           → return JWT access + refresh + student info
    POST   /api/v1/auth/token/refresh/   → refresh access token
    GET    /api/v1/auth/profile/         → get logged-in student's profile
    PATCH  /api/v1/auth/profile/         → update name or grade
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import Student
from .serializers import RegisterSerializer, StudentProfileSerializer, CustomTokenObtainPairSerializer


class RegisterView(APIView):
    """POST /api/v1/auth/register/ — open to unauthenticated users."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            student = serializer.save()
            # Return tokens immediately so the frontend can log in straight away
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(student)
            return Response(
                {
                    'message': 'Account created successfully.',
                    'student': StudentProfileSerializer(student).data,
                    'tokens': {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    },
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(TokenObtainPairView):
    """
    POST /api/v1/auth/login/
    Returns access token, refresh token, AND student profile in one response.
    """
    permission_classes = [AllowAny]
    serializer_class = CustomTokenObtainPairSerializer


class ProfileView(APIView):
    """GET / PATCH /api/v1/auth/profile/ — requires valid JWT."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = StudentProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = StudentProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

from google.oauth2 import id_token
from google.auth.transport import requests

class GoogleLoginView(APIView):
    """POST /api/v1/auth/google/"""
    permission_classes = [AllowAny]


    def post(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({"error": "No credential provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # The client ID used in the frontend must match the audience here
            CLIENT_ID = "1021205941453-dnbrm6b1lk2ti7o4r24r6tqobmo6k8t5.apps.googleusercontent.com"
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(), 
                CLIENT_ID, 
                clock_skew_in_seconds=10
            )
            
            email = idinfo['email']
            name = idinfo.get('name', 'Student')
            
            # Find or create student properly using the custom manager if creating
            student = Student.objects.filter(email=email).first()
            if not student:
                student = Student.objects.create_user(email=email, name=name, grade=8)
            
            # Generate tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(student)
            
            return Response(
                {
                    'message': 'Logged in successfully.',
                    'student': StudentProfileSerializer(student).data,
                    'tokens': {
                        'access': str(refresh.access_token),
                        'refresh': str(refresh),
                    },
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as e:
            # Print to backend console for debugging if needed
            print(f"Google Auth Error: {e}")
            return Response({"error": f"Invalid token: {e}"}, status=status.HTTP_400_BAD_REQUEST)
