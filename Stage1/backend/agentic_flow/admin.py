from django.contrib import admin
from .models import AgenticWorkflow

@admin.register(AgenticWorkflow)
class AgenticWorkflowAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_template', 'student', 'generated_by_ai', 'created_at')
    list_filter = ('is_template', 'generated_by_ai')
    search_fields = ('name', 'student__email', 'student__name')
