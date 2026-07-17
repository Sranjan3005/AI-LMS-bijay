from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# Allow the Vite dev server to hit the Django API
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
]
