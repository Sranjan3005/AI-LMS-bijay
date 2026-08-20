"""
regression/models.py

Stores every regression experiment a student runs.
Linked to the student and the scenario they chose.
"""

from django.db import models
from accounts.models import Student
from scenarios.models import Scenario


class RegressionExperiment(models.Model):

    DATA_SOURCE_CHOICES = [
        ('PRELOADED', 'Pre-loaded scenario dataset'),
        ('UPLOAD',    'Student-uploaded CSV'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED',  'Failed'),
    ]

    student        = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='regression_experiments')
    scenario       = models.ForeignKey(Scenario, on_delete=models.SET_NULL, null=True, related_name='regression_experiments')
    variant_name   = models.CharField(max_length=50)
    variant_label  = models.CharField(max_length=100, blank=True)

    # What the student optionally added
    student_prompt = models.TextField(blank=True)

    # Execution outputs
    generated_code = models.TextField(blank=True)
    stdout_log     = models.TextField(blank=True)
    stderr_log     = models.TextField(blank=True)
    output_image   = models.TextField(blank=True)    # base64-encoded output.jpg
    explanation    = models.TextField(blank=True)    # LLM student-friendly explanation

    # Stage 1: PRELOADED. Stage 2: UPLOAD possible
    data_source  = models.CharField(max_length=20, choices=DATA_SOURCE_CHOICES, default='PRELOADED')
    uploaded_csv = models.FileField(upload_to='uploads/regression/', null=True, blank=True)

    # Persisted trained model binary as base64 string
    model_b64    = models.TextField(blank=True)

    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.name} | {self.scenario.title if self.scenario else "?"} | {self.variant_name}'
