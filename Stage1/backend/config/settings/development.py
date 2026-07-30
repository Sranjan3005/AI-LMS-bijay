from .base import *  # noqa
import sys

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Allow the Vite dev server to hit the Django API
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]

# Local Development Fallback: If Redis is configured as localhost (which Windows users rarely have running)
# we switch to InMemory execution so the Sandbox can still be tested locally without needing Docker/Redis.
if '127.0.0.1' in CELERY_BROKER_URL or 'localhost' in CELERY_BROKER_URL:
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_STORE_EAGER_RESULT = True
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }
