from rest_framework import serializers
from .models import NeuralNetworkExperiment

class NeuralNetworkRunSerializer(serializers.Serializer):
    scenario_id    = serializers.UUIDField()
    variant_name   = serializers.CharField(max_length=50)
    student_prompt = serializers.CharField(max_length=500, required=False, allow_blank=True)

class NeuralNetworkExperimentSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)
    model_type     = serializers.CharField(source='scenario.model_type', read_only=True)

    class Meta:
        model  = NeuralNetworkExperiment
        fields = [
            'id', 'scenario_title', 'model_type',
            'variant_name', 'variant_label', 'student_prompt',
            'generated_code', 'stdout_log', 'stderr_log',
            'output_image', 'explanation',
            'data_source', 'status', 'created_at',
        ]
        read_only_fields = fields

class NeuralNetworkExperimentListSerializer(serializers.ModelSerializer):
    scenario_title = serializers.CharField(source='scenario.title', read_only=True)

    class Meta:
        model  = NeuralNetworkExperiment
        fields = ['id', 'scenario_title', 'variant_label', 'status', 'created_at']
