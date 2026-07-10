"""
schools/models.py

Organisation layer: a School is what the company onboards; students and school
admins belong to a School. InstructorQuery is the "ask the instructor" inbox.
"""

from django.conf import settings
from django.db import models


class School(models.Model):
    PLAN_CHOICES = [
        ('pilot', 'Pilot'),
        ('standard', 'Standard'),
        ('premium', 'Premium'),
    ]

    name          = models.CharField(max_length=200)
    board         = models.CharField(max_length=40, default='CBSE')
    city          = models.CharField(max_length=100, blank=True)
    state         = models.CharField(max_length=100, blank=True)
    plan          = models.CharField(max_length=20, choices=PLAN_CHOICES, default='pilot')
    seats         = models.PositiveIntegerField(default=60, help_text='Licensed student seats')
    contact_name  = models.CharField(max_length=120, blank=True)
    contact_email = models.EmailField(blank=True)
    is_active     = models.BooleanField(default=True)
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def student_count(self):
        return self.members.filter(role='student').count()


class InstructorQuery(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('answered', 'Answered'),
    ]

    student     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='queries')
    school      = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='queries')
    module      = models.CharField(max_length=60, blank=True, help_text='Related module key/name')
    subject     = models.CharField(max_length=200)
    message     = models.TextField()
    status      = models.CharField(max_length=12, choices=STATUS_CHOICES, default='open', db_index=True)
    reply       = models.TextField(blank=True)
    answered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='answered_queries')
    created_at  = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Instructor query'
        verbose_name_plural = 'Instructor queries'

    def __str__(self):
        return f'{self.subject} — {self.student}'
