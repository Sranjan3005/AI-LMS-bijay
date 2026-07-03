from rest_framework import serializers
from .models import CVExperiment


class CVRunSerializer(serializers.Serializer):
    """Validates the POST body for running a CV experiment."""
    scenario_id    = serializers.UUIDField()
    variant_name   = serializers.CharField(max_length=50)
    input_image    = serializers.CharField(required=False, allow_blank=True,
                                           help_text='Base64-encoded PNG from the drawing canvas')
    student_prompt = serializers.CharField(max_length=500, required=False, allow_blank=True)


class CVExperimentSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)
    model_type     = serializers.CharField(source='scenario.model_type', read_only=True)

    class Meta:
        model  = CVExperiment
        fields = [
            'id', 'scenario_title', 'model_type',
            'variant_name', 'variant_label', 'student_prompt',
            'generated_code', 'stdout_log', 'stderr_log',
            'stage_images', 'output_image', 'prediction', 'explanation',
            'data_source', 'status', 'created_at',
        ]
        read_only_fields = fields


class CVExperimentListSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)

    class Meta:
        model  = CVExperiment
        fields = ['id', 'scenario_title', 'variant_label', 'status', 'created_at']
