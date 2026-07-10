"""
core/permissions.py

Reusable DRF permission classes shared across all model apps.
"""

from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS


class IsStudentOwner(BasePermission):
    """
    Object-level permission: only the student who created a record can access it.
    Assumes the model instance has a `student` foreign key field.
    """
    def has_object_permission(self, request, view, obj):
        return obj.student == request.user


class IsSchoolAdmin(BasePermission):
    """Only a logged-in user whose role is 'school_admin'."""
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and getattr(u, 'role', '') == 'school_admin')


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Allow unauthenticated users to GET (e.g., browse scenarios),
    but require authentication for POST/PUT/DELETE.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)
