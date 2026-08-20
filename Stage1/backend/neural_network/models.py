"""
neural_network/models.py
"""

from django.db import models
from accounts.models import Student
from scenarios.models import Scenario


class NeuralNetworkExperiment(models.Model):

    DATA_SOURCE_CHOICES = [
        ('PRELOADED', 'Pre-loaded scenario dataset'),
        ('UPLOAD',    'Student-uploaded CSV'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED',  'Failed'),
    ]

    student        = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='neural_network_experiments')
    scenario       = models.ForeignKey(Scenario, on_delete=models.SET_NULL, null=True, related_name='neural_network_experiments')
    variant_name   = models.CharField(max_length=50)
    variant_label  = models.CharField(max_length=100, blank=True)
    student_prompt = models.TextField(blank=True)

    generated_code = models.TextField(blank=True)
    stdout_log     = models.TextField(blank=True)
    stderr_log     = models.TextField(blank=True)
    output_image   = models.TextField(blank=True)
    explanation    = models.TextField(blank=True)

    data_source  = models.CharField(max_length=20, choices=DATA_SOURCE_CHOICES, default='PRELOADED')
    uploaded_csv = models.FileField(upload_to='uploads/neural_network/', null=True, blank=True)

    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.student.name} | {self.scenario.title if self.scenario else "?"} | {self.variant_name}'
