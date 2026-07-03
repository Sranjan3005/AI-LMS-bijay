"""
computer_vision/tasks.py

Celery task wrapper for async CV experiment execution.
"""

from celery import shared_task
from django.contrib.auth import get_user_model
from . import executor

Student = get_user_model()


@shared_task(bind=True, max_retries=1)
def run_cv_experiment_task(self, user_id, scenario_id, variant_name, input_image_b64='', student_prompt=''):
    """
    Celery task: run a CV experiment in the background.
    Returns the result dict or an error dict.
    """
    try:
        student = Student.objects.get(id=user_id)
        result = executor.run_experiment(
            student=student,
            scenario_id=scenario_id,
            variant_name=variant_name,
            input_image_b64=input_image_b64,
            student_prompt=student_prompt,
        )
        return result
    except Exception as e:
        return {'error': str(e)}
