from django.contrib import admin
from .models import ClassificationExperiment


@admin.register(ClassificationExperiment)
class ClassificationExperimentAdmin(admin.ModelAdmin):
    list_display    = ['student', 'scenario', 'variant_name', 'status', 'data_source', 'created_at']
    list_filter     = ['status', 'data_source']
    search_fields   = ['student__email', 'scenario__title']
    ordering        = ['-created_at']
    readonly_fields = ['generated_code', 'stdout_log', 'stderr_log', 'output_image', 'explanation']
