from rest_framework import serializers

from .models import Assignment, StudentAssignment, AssignmentSubmission


def sanitize_questions(questions):
    """Strip the answer key so students never receive the correct answers."""
    return [{'q': q.get('q'), 'options': q.get('options', [])} for q in (questions or [])]


class AssignmentSerializer(serializers.ModelSerializer):
    """Full assignment — for school admins managing templates."""
    class Meta:
        model = Assignment
        fields = ['id', 'title', 'description', 'kind', 'module_key', 'target_grade',
                  'linked_scenario', 'questions', 'rubric', 'points', 'school',
                  'is_template', 'is_published', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubmissionSerializer(serializers.ModelSerializer):
    percent = serializers.IntegerField(read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = ['id', 'status', 'score', 'max_score', 'percent',
                  'llm_feedback', 'submitted_at', 'graded_at']


class StudentAssignmentSerializer(serializers.ModelSerializer):
    """What a student sees — assignment WITHOUT the answer key + latest submission."""
    assignment = serializers.SerializerMethodField()
    submission = serializers.SerializerMethodField()

    class Meta:
        model = StudentAssignment
        fields = ['id', 'due_date', 'status', 'created_at', 'assignment', 'submission']

    def get_assignment(self, obj):
        a = obj.assignment
        return {
            'id': a.id,
            'title': a.title,
            'description': a.description,
            'kind': a.kind,
            'module_key': a.module_key,
            'points': a.points,
            'questions': sanitize_questions(a.questions) if a.kind == 'quiz' else [],
        }

    def get_submission(self, obj):
        s = obj.submissions.order_by('-submitted_at').first()
        return SubmissionSerializer(s).data if s else None
