from django.contrib import admin
from .models import CVExperiment


@admin.register(CVExperiment)
class CVExperimentAdmin(admin.ModelAdmin):
    list_display = ('student', 'scenario', 'variant_name', 'status', 'data_source', 'created_at')
    list_filter  = ('status', 'data_source')
    readonly_fields = ('stage_images', 'generated_code', 'stdout_log', 'stderr_log')
