import os
import sys
import django

sys.path.append(r"c:\Users\Bijaya kumar Behera\Desktop\AI_model_dynamic\Stage1\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from agentic_flow.tasks import execute_langgraph_pipeline

try:
    print("Testing Celery delay...")
    task = execute_langgraph_pipeline.delay(1)
    print("Task dispatched successfully! ID:", task.id)
except Exception as e:
    print("Failed to dispatch task:", type(e).__name__, str(e))
