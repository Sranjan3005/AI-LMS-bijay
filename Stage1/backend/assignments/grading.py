"""
assignments/grading.py

Grades an AssignmentSubmission:
  - quiz         → deterministic (compare selected options to the answer key)
  - task/submission → LLM-graded against the assignment rubric (core.llm)

Quiz grading is instant (called inline); LLM grading is slow so it runs in a
Celery task (see tasks.py). Both funnel through grade_submission_obj().
"""

from django.utils import timezone

from .models import AssignmentSubmission


def grade_quiz(assignment, answers):
    """answers = list of selected option indices, aligned with assignment.questions."""
    questions = assignment.questions or []
    if not questions:
        return 0, "This quiz has no questions yet."
    correct = 0
    for i, q in enumerate(questions):
        try:
            if int(answers[i]) == int(q.get('answer')):
                correct += 1
        except (IndexError, TypeError, ValueError):
            pass
    score = round(correct / len(questions) * assignment.points)
    fb = f"You got {correct} of {len(questions)} correct."
    return score, fb


def grade_submission_obj(submission_id):
    """Grade one submission in place. Safe to call from a Celery task or inline."""
    try:
        sub = AssignmentSubmission.objects.select_related('assignment', 'placement').get(id=submission_id)
    except AssignmentSubmission.DoesNotExist:
        return
    a = sub.assignment

    if a.kind == 'quiz':
        score, feedback = grade_quiz(a, sub.answers)
    else:
        from core.llm import grade_submission
        score, feedback = grade_submission(
            title=a.title,
            question=a.description or a.title,
            rubric=a.rubric,
            max_points=a.points,
            student_answer=sub.content,
            module_key=a.module_key,
        )

    sub.is_auto_graded = True
    sub.max_score = a.points
    if score is None:
        # LLM failed — leave for a teacher to grade manually.
        sub.status = 'pending'
        sub.save(update_fields=['is_auto_graded', 'max_score', 'status'])
        return

    sub.score = score
    sub.llm_feedback = feedback or ''
    sub.status = 'graded'
    sub.graded_at = timezone.now()
    sub.save(update_fields=['is_auto_graded', 'max_score', 'score', 'llm_feedback', 'status', 'graded_at'])

    if sub.placement_id:
        sub.placement.status = 'graded'
        sub.placement.save(update_fields=['status'])


def module_progress_for(student):
    """Per-module performance from a student's active assignments.
    Returns {module_key: {assigned, graded, avg_percent}}."""
    from .models import StudentAssignment
    placements = (StudentAssignment.objects
                  .filter(student=student, is_active=True)
                  .select_related('assignment'))
    agg = {}
    for p in placements:
        mk = p.assignment.module_key
        row = agg.setdefault(mk, {'assigned': 0, 'graded': 0, 'sum': 0})
        row['assigned'] += 1
        sub = p.submissions.filter(status='graded').order_by('-graded_at').first()
        if sub and sub.percent is not None:
            row['graded'] += 1
            row['sum'] += sub.percent
    return {
        mk: {
            'assigned': v['assigned'],
            'graded': v['graded'],
            'avg_percent': round(v['sum'] / v['graded']) if v['graded'] else None,
        }
        for mk, v in agg.items()
    }
