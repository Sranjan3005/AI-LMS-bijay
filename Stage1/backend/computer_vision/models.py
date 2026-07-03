"""
computer_vision/models.py

Stores the results of Computer Vision experiments.
Key difference from Regression/Classification: stores multiple pipeline stage images
instead of a single output_image.
"""

from django.db import models
from accounts.models import Student
from scenarios.models import Scenario


class CVExperiment(models.Model):

    DATA_SOURCE_CHOICES = [
        ('PRELOADED', 'Pre-loaded sample image'),
        ('DRAWN',     'Student-drawn canvas input'),
        ('UPLOAD',    'Student-uploaded image'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED',  'Failed'),
    ]

    student        = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='cv_experiments')
    scenario       = models.ForeignKey(Scenario, on_delete=models.SET_NULL, null=True, related_name='cv_experiments')
    variant_name   = models.CharField(max_length=50)
    variant_label  = models.CharField(max_length=100, blank=True)
    student_prompt = models.TextField(blank=True)

    generated_code = models.TextField(blank=True)
    stdout_log     = models.TextField(blank=True)
    stderr_log     = models.TextField(blank=True)

    # Multiple pipeline stage images (list of base64 strings)
    stage_images   = models.JSONField(default=list, help_text='List of base64-encoded stage images')
    # Single output image (final result / stage 4)
    output_image   = models.TextField(blank=True)
    prediction     = models.TextField(blank=True, help_text='Final prediction text/JSON')
    explanation    = models.TextField(blank=True)

    data_source  = models.CharField(max_length=20, choices=DATA_SOURCE_CHOICES, default='DRAWN')

    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.name} | {self.scenario.title if self.scenario else "?"} | {self.variant_name}'
