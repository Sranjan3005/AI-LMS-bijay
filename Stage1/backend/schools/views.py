"""
schools/views.py

  POST /api/v1/schools/queries/            → student raises a query
  GET  /api/v1/schools/queries/            → student: mine · school-admin: my school's
  POST /api/v1/schools/queries/<id>/reply/ → school-admin answers
  GET  /api/v1/schools/roster/             → school-admin: students + progress
"""

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsSchoolAdmin
from assignments.grading import module_progress_for
from .models import InstructorQuery
from .serializers import InstructorQuerySerializer


class QueriesView(APIView):
    def get(self, request):
        u = request.user
        if getattr(u, 'role', '') == 'school_admin':
            qs = InstructorQuery.objects.filter(school=u.school)
        else:
            qs = InstructorQuery.objects.filter(student=u)
        return Response(InstructorQuerySerializer(qs, many=True).data)

    def post(self, request):
        serializer = InstructorQuerySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(student=request.user, school=getattr(request.user, 'school', None))
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReplyView(APIView):
    permission_classes = [IsSchoolAdmin]

    def post(self, request, query_id):
        try:
            q = InstructorQuery.objects.get(id=query_id, school=request.user.school)
        except InstructorQuery.DoesNotExist:
            return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        q.reply = request.data.get('reply', '')
        q.status = 'answered'
        q.answered_by = request.user
        q.answered_at = timezone.now()
        q.save(update_fields=['reply', 'status', 'answered_by', 'answered_at'])
        return Response(InstructorQuerySerializer(q).data)


class RosterView(APIView):
    permission_classes = [IsSchoolAdmin]

    def get(self, request):
        from accounts.models import Student
        students = Student.objects.filter(school=request.user.school, role='student')
        out = []
        for s in students:
            modules = module_progress_for(s)
            graded = [m['avg_percent'] for m in modules.values() if m['avg_percent'] is not None]
            out.append({
                'id': s.id,
                'name': s.name,
                'email': s.email,
                'grade': s.grade,
                'modules': modules,
                'avg_percent': round(sum(graded) / len(graded)) if graded else None,
            })
        return Response(out)
