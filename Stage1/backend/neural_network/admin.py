from django.contrib import admin
from .models import NeuralNetworkExperiment

@admin.register(NeuralNetworkExperiment)
class NeuralNetworkExperimentAdmin(admin.ModelAdmin):
    list_display    = ['student', 'scenario', 'variant_name', 'status', 'created_at']
    list_filter     = ['status', 'data_source']
    ordering        = ['-created_at']
    readonly_fields = ['generated_code', 'stdout_log', 'stderr_log', 'output_image', 'explanation']
