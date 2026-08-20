from django.contrib import admin

from .models import School, InstructorQuery


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display  = ('name', 'board', 'city', 'plan', 'seats', 'student_count', 'is_active', 'created_at')
    list_filter   = ('plan', 'is_active', 'board')
    search_fields = ('name', 'city', 'contact_name', 'contact_email')
    readonly_fields = ('created_at',)


@admin.register(InstructorQuery)
class InstructorQueryAdmin(admin.ModelAdmin):
    list_display  = ('subject', 'student', 'school', 'module', 'status', 'created_at')
    list_filter   = ('status', 'school')
    search_fields = ('subject', 'message', 'student__email', 'student__name')
    readonly_fields = ('created_at', 'answered_at')
    raw_id_fields = ('student', 'school', 'answered_by')
