from django.contrib import admin

from .models import Assignment, StudentAssignment, AssignmentSubmission


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display  = ('title', 'kind', 'module_key', 'points', 'school', 'is_published', 'created_at')
    list_filter   = ('kind', 'module_key', 'is_published', 'school')
    search_fields = ('title', 'description')
    raw_id_fields = ('linked_scenario', 'school', 'created_by')


@admin.register(StudentAssignment)
class StudentAssignmentAdmin(admin.ModelAdmin):
    list_display  = ('assignment', 'student', 'status', 'is_active', 'due_date', 'assigned_by', 'created_at')
    list_filter   = ('status', 'is_active')
    search_fields = ('student__email', 'student__name', 'assignment__title')
    raw_id_fields = ('assignment', 'student', 'assigned_by')


@admin.register(AssignmentSubmission)
class AssignmentSubmissionAdmin(admin.ModelAdmin):
    list_display  = ('assignment', 'student', 'score', 'max_score', 'status', 'is_auto_graded', 'submitted_at', 'graded_at')
    list_filter   = ('status', 'is_auto_graded', 'assignment__module_key')
    search_fields = ('student__email', 'student__name', 'assignment__title')
    readonly_fields = ('submitted_at', 'graded_at')
    raw_id_fields = ('placement', 'assignment', 'student')
