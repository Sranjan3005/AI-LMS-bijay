"""
assignments/views.py

Student endpoints:
  GET  /api/v1/assignments/mine/                  → my active assignments
  POST /api/v1/assignments/<placement_id>/submit/ → submit + grade
  GET  /api/v1/assignments/progress/              → per-module performance

School-admin endpoints:
  GET  /api/v1/assignments/templates/  → assignments I can hand out
  POST /api/v1/assignments/assign/     → place an assignment on a student
  POST /api/v1/assignments/placements/<id>/remove/ → take it off a student
"""

from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsSchoolAdmin
from .models import Assignment, StudentAssignment, AssignmentSubmission
from .serializers import (AssignmentSerializer, StudentAssignmentSerializer,
                          SubmissionSerializer)
from .grading import grade_submission_obj, module_progress_for


# ─── Student ──────────────────────────────────────────────────────────────────
class MyAssignmentsView(APIView):
    def get(self, request):
        qs = (StudentAssignment.objects
              .filter(student=request.user, is_active=True)
              .select_related('assignment'))
        return Response(StudentAssignmentSerializer(qs, many=True).data)


class SubmitView(APIView):
    def post(self, request, placement_id):
        try:
            placement = StudentAssignment.objects.select_related('assignment').get(
                id=placement_id, student=request.user, is_active=True)
        except StudentAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        a = placement.assignment
        sub = AssignmentSubmission.objects.create(
            placement=placement,
            assignment=a,
            student=request.user,
            answers=request.data.get('answers', []),
            content=request.data.get('content', ''),
            max_score=a.points,
            status='grading',
        )
        placement.status = 'submitted'
        placement.save(update_fields=['status'])

        if a.kind == 'quiz':
            grade_submission_obj(sub.id)          # instant, deterministic
        else:
            try:
                from .tasks import grade_submission_task
                grade_submission_task.delay(sub.id)   # async LLM grading
            except Exception:
                grade_submission_obj(sub.id)          # fallback: grade inline

        sub.refresh_from_db()
        return Response(SubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


class ProgressView(APIView):
    def get(self, request):
        return Response(module_progress_for(request.user))


# ─── School admin ─────────────────────────────────────────────────────────────
class TemplatesView(APIView):
    permission_classes = [IsSchoolAdmin]

    def get(self, request):
        qs = Assignment.objects.filter(
            Q(school__isnull=True) | Q(school=request.user.school), is_published=True)
        return Response(AssignmentSerializer(qs, many=True).data)


class AssignView(APIView):
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        from accounts.models import Student
        assignment_id = request.data.get('assignment')
        student_id = request.data.get('student')
        try:
            assignment = Assignment.objects.get(id=assignment_id)
            student = Student.objects.get(id=student_id, school=request.user.school, role='student')
        except (Assignment.DoesNotExist, Student.DoesNotExist):
            return Response({'error': 'Assignment or student not found in your school.'},
                            status=status.HTTP_404_NOT_FOUND)

        placement, _ = StudentAssignment.objects.update_or_create(
            assignment=assignment, student=student,
            defaults={'assigned_by': request.user, 'is_active': True,
                      'due_date': request.data.get('due_date') or None},
        )
        return Response(StudentAssignmentSerializer(placement).data, status=status.HTTP_201_CREATED)


class RemovePlacementView(APIView):
    permission_classes = [IsSchoolAdmin]

    def post(self, request, placement_id):
        try:
            placement = StudentAssignment.objects.select_related('student').get(
                id=placement_id, student__school=request.user.school)
        except StudentAssignment.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        placement.is_active = request.data.get('is_active', False)
        placement.save(update_fields=['is_active'])
        return Response({'status': 'ok', 'is_active': placement.is_active})


class StudentPlacementsView(APIView):
    """School admin: list one student's assigned tasks (to review / remove)."""
    permission_classes = [IsSchoolAdmin]

    def get(self, request, student_id):
        from accounts.models import Student
        try:
            student = Student.objects.get(id=student_id, school=request.user.school)
        except Student.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        placements = (StudentAssignment.objects
                      .filter(student=student).select_related('assignment'))
        return Response([{
            'id': p.id,
            'title': p.assignment.title,
            'kind': p.assignment.kind,
            'module_key': p.assignment.module_key,
            'status': p.status,
            'is_active': p.is_active,
        } for p in placements])
