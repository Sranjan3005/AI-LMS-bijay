from celery import shared_task
from django.contrib.auth import get_user_model
from regression import executor

User = get_user_model()

@shared_task
def run_regression_experiment_task(user_id, scenario_id, variant_name, student_prompt):
    """
    Background Celery task to execute the full regression ML pipeline.
    This prevents blocking the Django web server thread.
    """
    try:
        user = User.objects.get(id=user_id)
        result = executor.run_experiment(
            student=user,
            scenario_id=scenario_id,
            variant_name=variant_name,
            student_prompt=student_prompt,
        )
        return result
    except Exception as e:
        return {'error': str(e)}
