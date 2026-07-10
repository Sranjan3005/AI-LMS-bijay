"""
assignments/models.py

The evaluation layer.

- Assignment            : a task definition (quiz / task / submission). Company
                          templates (school=None) or a school's own.
- StudentAssignment     : places one Assignment on one student's dashboard.
                          `is_active=False` lets a school admin remove it.
- AssignmentSubmission  : a student's attempt; auto-graded (quiz) or LLM-graded
                          (task/submission), score feeds the module performance ring.
"""

from django.conf import settings
from django.db import models


class Assignment(models.Model):
    KIND_CHOICES = [
        ('quiz', 'Quiz (auto-graded)'),
        ('task', 'Task (LLM-graded)'),
        ('submission', 'Submission (LLM-graded)'),
    ]

    title           = models.CharField(max_length=200)
    description     = models.TextField(blank=True)
    kind            = models.CharField(max_length=16, choices=KIND_CHOICES, default='quiz')
    # Which Sutra module this belongs to (e.g. 'regression', 'classification', 'ethics').
    module_key      = models.CharField(max_length=40, db_index=True)
    target_grade    = models.IntegerField(null=True, blank=True, help_text='CBSE class; blank = any')
    linked_scenario = models.ForeignKey(
        'scenarios.Scenario', on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments'
    )
    # Quiz questions: [{"q": "...", "options": ["a","b"], "answer": 0}]
    questions       = models.JSONField(default=list, blank=True)
    # Rubric handed to the LLM when grading task/submission kinds.
    rubric          = models.TextField(blank=True)
    points          = models.PositiveIntegerField(default=100)
    school          = models.ForeignKey(
        'schools.School', on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments',
        help_text='Blank = global Sutra template available to all schools'
    )
    is_template     = models.BooleanField(default=True)
    is_published    = models.BooleanField(default=True)
    created_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_assignments'
    )
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['module_key', 'title']

    def __str__(self):
        return f'[{self.get_kind_display()}] {self.title}'


class StudentAssignment(models.Model):
    """One assignment placed on one student's dashboard by a school admin."""

    STATUS_CHOICES = [
        ('assigned', 'Assigned'),
        ('submitted', 'Submitted'),
        ('graded', 'Graded'),
    ]

    assignment  = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='placements')
    student     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='assignments')
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_to_students'
    )
    due_date    = models.DateTimeField(null=True, blank=True)
    is_active   = models.BooleanField(default=True, help_text='Uncheck to remove from the student dashboard')
    status      = models.CharField(max_length=12, choices=STATUS_CHOICES, default='assigned', db_index=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = [('assignment', 'student')]

    def __str__(self):
        return f'{self.assignment.title} → {self.student}'


class AssignmentSubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending grade'),
        ('grading', 'Grading…'),
        ('graded', 'Graded'),
    ]

    placement      = models.ForeignKey(
        StudentAssignment, on_delete=models.CASCADE, null=True, blank=True, related_name='submissions'
    )
    assignment     = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name='submissions')
    student        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='submissions')
    answers        = models.JSONField(default=list, blank=True, help_text='Selected option indices for a quiz')
    content        = models.TextField(blank=True, help_text='Free-text answer for a task/submission')
    file           = models.FileField(upload_to='submissions/', null=True, blank=True)
    score          = models.IntegerField(null=True, blank=True)
    max_score      = models.PositiveIntegerField(default=100)
    is_auto_graded = models.BooleanField(default=False)
    llm_feedback   = models.TextField(blank=True)
    status         = models.CharField(max_length=12, choices=STATUS_CHOICES, default='pending', db_index=True)
    submitted_at   = models.DateTimeField(auto_now_add=True)
    graded_at      = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-submitted_at']

    def __str__(self):
        s = f'{self.score}/{self.max_score}' if self.score is not None else 'ungraded'
        return f'{self.assignment.title} — {self.student} ({s})'

    @property
    def percent(self):
        if self.score is None or not self.max_score:
            return None
        return round(self.score / self.max_score * 100)
