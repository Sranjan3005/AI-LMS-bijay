"""
assignments/tasks.py — Celery task for LLM grading (auto-discovered).
"""

from celery import shared_task


@shared_task(name='assignments.grade_submission')
def grade_submission_task(submission_id):
    from .grading import grade_submission_obj
    grade_submission_obj(submission_id)
