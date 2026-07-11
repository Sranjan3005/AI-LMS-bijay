from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Student


@admin.register(Student)
class StudentAdmin(UserAdmin):
    model = Student
    list_display  = ['email', 'name', 'role', 'school', 'grade', 'is_active', 'created_at']
    list_filter   = ['role', 'school', 'grade', 'is_active', 'is_staff']
    search_fields = ['email', 'name']
    ordering      = ['-created_at']
    autocomplete_fields = ['school']

    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('name', 'grade')}),
        ('School role', {'fields': ('role', 'school')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates',       {'fields': ('last_login',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'name', 'grade', 'role', 'school', 'password1', 'password2', 'is_staff', 'is_active'),
        }),
    )
