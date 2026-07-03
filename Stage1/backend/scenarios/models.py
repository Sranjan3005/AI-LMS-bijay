"""
scenarios/models.py

Scenario catalog — the 16 CBSE-curriculum scenario cards.
Each Scenario belongs to one model type (Regression / Classification / Neural Network).
Each has multiple DataVariants (e.g. "perfect", "messy", "tiny") that the
student can select in the workbench.
"""

import uuid
from django.db import models


class Scenario(models.Model):

    MODEL_TYPE_CHOICES = [
        ('REGRESSION',      'Linear Regression'),
        ('CLASSIFICATION',  'Classification'),
        ('NEURAL_NETWORK',  'Neural Network'),
        ('COMPUTER_VISION', 'Computer Vision'),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title        = models.CharField(max_length=200)
    model_type   = models.CharField(max_length=20, choices=MODEL_TYPE_CHOICES, db_index=True)
    challenge    = models.TextField()
    takeaway     = models.TextField()
    try_it_out   = models.TextField()
    icon         = models.CharField(max_length=10, default='🔬', help_text='Emoji shown on the card')
    order        = models.PositiveIntegerField(default=0, help_text='Display order within the model type')
    is_active    = models.BooleanField(default=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['model_type', 'order']
        verbose_name        = 'Scenario'
        verbose_name_plural = 'Scenarios'

    def __str__(self):
        return f'[{self.model_type}] {self.title}'


from django.conf import settings

class DataVariant(models.Model):
    """
    A specific data variant for a scenario.
    e.g. Scenario="The Smart Greenhouse" → Variant="messy" (broken sensor data)
    """

    scenario    = models.ForeignKey(Scenario, on_delete=models.CASCADE, related_name='variants')
    name        = models.CharField(max_length=50, help_text='Identifier used internally, e.g. perfect / messy / tiny')
    label       = models.CharField(max_length=100, help_text='Human-readable name shown in UI')
    description = models.TextField()
    order       = models.PositiveIntegerField(default=0)
    
    # New fields for Data Lab
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True, related_name='custom_variants')
    data_payload = models.TextField(blank=True, null=True, help_text='JSON string of processed data or Base64 string for images')

    class Meta:
        ordering = ['order']
        # Allow different users to have a variant with the same name (e.g. "my_data")
        unique_together = ('scenario', 'name', 'user')

    def __str__(self):
        return f'{self.scenario.title} — {self.label}'
