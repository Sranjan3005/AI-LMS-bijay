from rest_framework import serializers

from .models import InstructorQuery


class InstructorQuerySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)

    class Meta:
        model = InstructorQuery
        fields = ['id', 'subject', 'message', 'module', 'status', 'reply',
                  'created_at', 'answered_at', 'student_name']
        read_only_fields = ['id', 'status', 'reply', 'answered_at', 'created_at', 'student_name']
