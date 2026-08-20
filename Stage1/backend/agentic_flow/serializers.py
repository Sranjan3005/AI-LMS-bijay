from rest_framework import serializers
from .models import AgenticWorkflow

class AgenticWorkflowSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = AgenticWorkflow
        fields = [
            'id', 'name', 'description', 'flow_data', 
            'is_template', 'student', 'student_name', 
            'generated_by_ai', 'ai_prompt', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_template', 'student']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['student'] = request.user
        return super().create(validated_data)
