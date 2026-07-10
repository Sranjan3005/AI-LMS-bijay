"""
accounts/serializers.py

Serializers for student registration, login, and profile.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Student


class RegisterSerializer(serializers.ModelSerializer):
    """Used for POST /api/v1/auth/register/"""

    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = Student
        fields = ['name', 'email', 'grade', 'password', 'password2']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        return Student.objects.create_user(**validated_data)


class StudentProfileSerializer(serializers.ModelSerializer):
    """Used for GET/PATCH /api/v1/auth/profile/"""

    school_name = serializers.CharField(source='school.name', read_only=True, default=None)

    class Meta:
        model  = Student
        fields = ['id', 'name', 'email', 'grade', 'role', 'school', 'school_name', 'is_staff', 'created_at']
        read_only_fields = ['id', 'email', 'role', 'school', 'school_name', 'created_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Extends the default JWT login serializer to include student info
    in the token response, so the frontend doesn't need a second API call.
    """
    is_admin = serializers.BooleanField(required=False, write_only=True)

    def validate(self, attrs):
        is_admin_login = attrs.pop('is_admin', False)
        data = super().validate(attrs)
        
        if is_admin_login and not (self.user.is_staff or self.user.is_superuser):
            raise serializers.ValidationError({"detail": "You do not have admin privileges."})
            
        data['student'] = StudentProfileSerializer(self.user).data
        return data
