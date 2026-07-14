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

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsSchoolAdmin
from .models import (Assignment, StudentAssignment, AssignmentSubmission,
                     ActivityCompletion)
from .serializers import (AssignmentSerializer, StudentAssignmentSerializer,
                          SubmissionSerializer, sanitize_questions)
from .grading import grade_submission_obj, module_progress_for

REQUIRED_SUBS = {'theory', 'demo', 'hands'}   # opening all three unlocks the module task
UNLOCK_DAYS = 5                               # how long the auto-placed task is due in


def _place_module_task(student, module_key):
    """If the student has completed all required subs of a module and its task
    isn't placed yet, auto-place it (due in UNLOCK_DAYS). Returns the assignment
    id if a task is now on the student's board (new or pre-existing), else None."""
    done = set(ActivityCompletion.objects
               .filter(student=student, module_key=module_key)
               .values_list('sub_type', flat=True))
    if not REQUIRED_SUBS.issubset(done):
        return None
    school = getattr(student, 'school', None)
    task = (Assignment.objects
            .filter(module_key=module_key, kind='task', is_published=True)
            .filter(Q(school__isnull=True) | Q(school=school))
            .order_by('school_id')   # a school's own task wins over the global one
            .first())
    if not task:
        return None
    placement, created = StudentAssignment.objects.get_or_create(
        assignment=task, student=student,
        defaults={'is_active': True, 'status': 'assigned',
                  'due_date': timezone.now() + timedelta(days=UNLOCK_DAYS)},
    )
    if not created and not placement.is_active:
        placement.is_active = True
        placement.save(update_fields=['is_active'])
    return task.id


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

        # Quizzes + agent-pipeline evals grade instantly (so the studio can show
        # feedback right away); other LLM tasks grade async via Celery.
        if a.kind == 'quiz' or a.module_key == 'agentic':
            grade_submission_obj(sub.id)
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


class ActivityCompleteView(APIView):
    """Record that the student opened a submodule activity. Opening all three
    (theory/demo/hands) of a module auto-places that module's written task."""

    def post(self, request):
        module_key = (request.data.get('module_key') or '').strip()
        sub_type = (request.data.get('sub_type') or '').strip()
        if not module_key or sub_type not in REQUIRED_SUBS:
            return Response({'error': 'module_key and a valid sub_type are required.'},
                            status=status.HTTP_400_BAD_REQUEST)
        ActivityCompletion.objects.get_or_create(
            student=request.user, module_key=module_key, sub_type=sub_type)
        assignment_id = _place_module_task(request.user, module_key)
        completed = list(ActivityCompletion.objects
                         .filter(student=request.user, module_key=module_key)
                         .values_list('sub_type', flat=True))
        return Response({'completed': completed,
                         'unlocked': assignment_id is not None,
                         'assignment_id': assignment_id})


class ActivityView(APIView):
    """{module_key: [sub_types...]} — everything the student has opened. Drives
    the per-module completion bar on the dashboard."""

    def get(self, request):
        out = {}
        for mk, st in (ActivityCompletion.objects
                       .filter(student=request.user)
                       .values_list('module_key', 'sub_type')):
            out.setdefault(mk, []).append(st)
        return Response(out)


class SummaryView(APIView):
    """Front-page assignments card: how many are still due, and the soonest."""

    def get(self, request):
        pending = (StudentAssignment.objects
                   .filter(student=request.user, is_active=True)
                   .exclude(status='graded'))
        nxt = (pending.exclude(due_date__isnull=True)
               .order_by('due_date').values_list('due_date', flat=True).first())
        return Response({'pending': pending.count(),
                         'next_due': nxt.isoformat() if nxt else None})


class PracticeView(APIView):
    """Self-serve practice: the global (and this student's school's) published
    assignment templates, so the assignment tab is never empty even when a
    teacher hasn't placed anything. Shaped like MyAssignmentsView items so the
    frontend renders them identically. Optional ?module=<module_key> filter."""

    def get(self, request):
        school = getattr(request.user, 'school', None)
        qs = Assignment.objects.filter(
            Q(school__isnull=True) | Q(school=school), is_published=True)
        module = request.query_params.get('module')
        if module:
            qs = qs.filter(module_key=module)
        qs = qs.order_by('module_key', 'kind', 'title')

        out = []
        for a in qs:
            sub = (AssignmentSubmission.objects
                   .filter(assignment=a, student=request.user)
                   .order_by('-submitted_at').first())
            out.append({
                'id': a.id,                 # in practice mode this is the ASSIGNMENT id
                'practice': True,
                'due_date': None,
                'status': 'graded' if (sub and sub.status == 'graded') else 'assigned',
                'assignment': {
                    'id': a.id,
                    'title': a.title,
                    'description': a.description,
                    'kind': a.kind,
                    'module_key': a.module_key,
                    'points': a.points,
                    'questions': sanitize_questions(a.questions) if a.kind == 'quiz' else [],
                },
                'submission': SubmissionSerializer(sub).data if sub else None,
            })
        return Response(out)


class PracticeSubmitView(APIView):
    """Submit a practice attempt against an assignment template (no teacher
    placement required). Auto-provisions a placement so grading + module
    progress work exactly as for teacher-assigned work."""

    def post(self, request):
        assignment_id = request.data.get('assignment')
        try:
            a = Assignment.objects.get(id=assignment_id, is_published=True)
        except Assignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        school = getattr(request.user, 'school', None)
        if a.school_id and a.school_id != getattr(school, 'id', None):
            return Response({'error': 'Assignment not available.'}, status=status.HTTP_403_FORBIDDEN)

        placement, _ = StudentAssignment.objects.update_or_create(
            assignment=a, student=request.user,
            defaults={'is_active': True, 'status': 'submitted'},
        )
        sub = AssignmentSubmission.objects.create(
            placement=placement,
            assignment=a,
            student=request.user,
            answers=request.data.get('answers', []),
            content=request.data.get('content', ''),
            max_score=a.points,
            status='grading',
        )

        if a.kind == 'quiz' or a.module_key == 'agentic':
            grade_submission_obj(sub.id)
        else:
            try:
                from .tasks import grade_submission_task
                grade_submission_task.delay(sub.id)
            except Exception:
                grade_submission_obj(sub.id)

        sub.refresh_from_db()
        return Response(SubmissionSerializer(sub).data, status=status.HTTP_201_CREATED)


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


class AssignClassView(APIView):
    """Place one assignment on every student in the admin's school at once."""
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        from accounts.models import Student
        assignment_id = request.data.get('assignment')
        due_date = request.data.get('due_date') or None
        try:
            assignment = Assignment.objects.get(id=assignment_id)
        except Assignment.DoesNotExist:
            return Response({'error': 'Assignment not found.'}, status=status.HTTP_404_NOT_FOUND)

        students = Student.objects.filter(school=request.user.school, role='student')
        placed = 0
        for student in students:
            StudentAssignment.objects.update_or_create(
                assignment=assignment, student=student,
                defaults={'assigned_by': request.user, 'is_active': True, 'due_date': due_date},
            )
            placed += 1
        return Response({'placed': placed}, status=status.HTTP_201_CREATED)


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


MODULE_LABEL = {
    'foundations': 'What is AI / Foundations',
    'data': 'Working with Data & Analysis',
    'regression': 'Linear Regression (predicting a number)',
    'classification': 'Classification (sorting into groups)',
    'neural': 'Neural Networks',
    'vision': 'Computer Vision',
    'agentic': 'Agentic AI (agents & pipelines)',
    'ethics': 'Responsible AI & Ethics',
}


def _fallback_options(school, module_key, sub_type, kind):
    """Templated options when the LLM planner is unavailable, so instructors can
    still assign something. Quiz fallbacks reuse the seeded quizzes for the
    module (real, answer-keyed); task fallbacks are two generic prompts."""
    label = MODULE_LABEL.get(module_key, module_key or 'this topic')
    focus = f' about {sub_type}' if sub_type else ''
    if kind == 'quiz':
        quizzes = (Assignment.objects
                   .filter(module_key=module_key, kind='quiz', is_published=True)
                   .filter(Q(school__isnull=True) | Q(school=school))
                   .order_by('school_id')[:2])
        opts = [{
            'title': q.title,
            'kind': 'quiz',
            'description': q.description or f'A quick check on {label}.',
            'questions': q.questions or [],
        } for q in quizzes if q.questions]
        if opts:
            return opts
    # task fallbacks (also used if no seeded quiz exists)
    return [
        {
            'title': 'Explain it in your own words',
            'kind': 'task',
            'description': (f'In your own words, explain the main idea of {label}{focus}. '
                            f'Use one real example from daily life in India, and say why it matters.'),
            'rubric': "Reward a clear, correct explanation in the student's own words plus a sensible real-world example.",
        },
        {
            'title': 'Find it in the real world',
            'kind': 'task',
            'description': (f'Find one real place where {label}{focus} is used — an app, a device, or a service you know. '
                            f'Describe how it works there, and one thing that could go wrong or be unfair.'),
            'rubric': 'Reward a real, relevant example, a correct explanation of how the idea applies, and a thoughtful limitation.',
        },
    ]


class PlanAssignmentView(APIView):
    """AI 'Plan an assignment' — generate 2-3 options for the instructor.
    Falls back to templated options when the LLM is unavailable."""
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        from core.llm import plan_assignments
        module_key = (request.data.get('module_key') or '').strip()
        sub_type = (request.data.get('sub_type') or '').strip()
        kind = request.data.get('kind') or 'task'
        notes = request.data.get('notes') or ''
        if not module_key:
            return Response({'error': 'Pick a module first.'}, status=status.HTTP_400_BAD_REQUEST)
        options = plan_assignments(module_key, sub_type, kind, notes)
        if options:
            return Response({'options': options, 'fallback': False})
        # LLM unavailable — hand back templated options so the instructor isn't blocked.
        options = _fallback_options(request.user.school, module_key, sub_type, kind)
        if not options:
            return Response({'error': 'The planner is unavailable right now — please try again.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response({'options': options, 'fallback': True})


class PlanCreateView(APIView):
    """Create a school-owned assignment from a chosen planner option, then place
    it on one student or the whole class."""
    permission_classes = [IsSchoolAdmin]

    def post(self, request):
        from accounts.models import Student
        opt = request.data.get('option') or {}
        module_key = (request.data.get('module_key') or '').strip()
        target = request.data.get('target') or 'class'   # 'class' | 'student'
        due_date = request.data.get('due_date') or None

        title = (opt.get('title') or '').strip()
        kind = opt.get('kind') or 'task'
        if not title or not module_key:
            return Response({'error': 'A title and module are required.'}, status=status.HTTP_400_BAD_REQUEST)

        assignment = Assignment.objects.create(
            title=title,
            description=opt.get('description', ''),
            kind='quiz' if kind == 'quiz' else 'task',
            module_key=module_key,
            questions=opt.get('questions', []) if kind == 'quiz' else [],
            rubric=opt.get('rubric', '') if kind != 'quiz' else '',
            points=100,
            school=request.user.school,
            is_template=False,
            is_published=True,
            created_by=request.user,
        )

        students = Student.objects.filter(school=request.user.school, role='student')
        if target == 'student':
            students = students.filter(id=request.data.get('student_id'))
        placed = 0
        for student in students:
            StudentAssignment.objects.update_or_create(
                assignment=assignment, student=student,
                defaults={'assigned_by': request.user, 'is_active': True, 'due_date': due_date},
            )
            placed += 1
        return Response({'assignment': AssignmentSerializer(assignment).data, 'placed': placed},
                        status=status.HTTP_201_CREATED)


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
