"""
accounts/models.py

Custom Student user model. Replaces Django's default User entirely.
Uses email as the login identifier instead of username.
"""

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class StudentManager(BaseUserManager):
    """Custom manager — required when using a custom AbstractBaseUser."""

    def create_user(self, email, name, grade, password=None):
        if not email:
            raise ValueError('Students must have an email address.')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, grade=grade)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, grade, password):
        user = self.create_user(email, name, grade, password)
        user.is_staff = True
        user.is_superuser = True
        user.save(using=self._db)
        return user


class Student(AbstractBaseUser, PermissionsMixin):
    """
    A student account.

    Fields:
        name     — Display name shown in the UI
        email    — Login identifier (unique)
        grade    — CBSE class (8, 9, or 10)
        is_active / is_staff — Standard Django permission flags
    """

    GRADE_CHOICES = [
        (8, 'Class 8'),
        (9, 'Class 9'),
        (10, 'Class 10'),
    ]

    ROLE_CHOICES = [
        ('student', 'Student'),
        ('school_admin', 'School Admin'),
    ]

    name       = models.CharField(max_length=100)
    email      = models.EmailField(unique=True)
    grade      = models.IntegerField(choices=GRADE_CHOICES)
    role       = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student', db_index=True)
    # Parent / guardian contact — used for the daily WhatsApp progress report.
    parent_name  = models.CharField(max_length=100, blank=True, default='')
    parent_phone = models.CharField(
        max_length=20, blank=True, default='',
        help_text='Guardian WhatsApp number in international format, e.g. 919876543210',
    )
    daily_report_opt_in = models.BooleanField(
        default=True, help_text='Send a daily progress report to the guardian.',
    )
    school     = models.ForeignKey(
        'schools.School', on_delete=models.SET_NULL, null=True, blank=True, related_name='members'
    )
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = StudentManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['name', 'grade']   # Asked by createsuperuser in addition to email+password

    class Meta:
        verbose_name        = 'Student'
        verbose_name_plural = 'Students'
        ordering            = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.email}) — Class {self.grade}'
