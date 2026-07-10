import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import dj_database_url

# BASE_DIR = Stage1/backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Root .env lives at AI_model_dynamic/.env
# Path: base.py -> settings/ -> config/ -> backend/ -> Stage1/ -> AI_model_dynamic/
load_dotenv(BASE_DIR.parent.parent / '.env')

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'insecure-fallback-change-me')

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    # Local apps — each model type is its own Django app for Stage 3 scalability
    'accounts.apps.AccountsConfig',
    'scenarios.apps.ScenariosConfig',
    'regression.apps.RegressionConfig',
    'classification.apps.ClassificationConfig',
    'neural_network.apps.NeuralNetworkConfig',
    'computer_vision.apps.ComputerVisionConfig',
    'agentic_flow.apps.AgenticFlowConfig',
    'schools.apps.SchoolsConfig',
    'assignments.apps.AssignmentsConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Must be before CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── Database — Neon PostgreSQL via DATABASE_URL env var ──────────────────────
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ─── Custom User Model ────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'accounts.Student'

# ─── Password Validation ──────────────────────────────────────────────────────
# For an educational app targeting middle schoolers, we disable strict password requirements.
AUTH_PASSWORD_VALIDATORS = []

# ─── Localisation ─────────────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ─── Static & Media ───────────────────────────────────────────────────────────
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'   # Uploaded CSVs land here (Stage 2 UI)

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Django REST Framework ────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'SIGNING_KEY': os.environ.get('JWT_SIGNING_KEY', SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ─── LLM API Keys ─────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')


# Celery & Redis Configuration
CELERY_BROKER_URL = os.environ.get('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

# Azure Managed Redis runs in cluster mode. Celery's broker uses multi-key
# transactions across its queue keys (celery, celery3, ...), which fail with
# CROSSSLOT on a cluster unless every key hashes to the same slot. Wrapping the
# key prefix in a {hash tag} forces all broker keys onto one slot, so the
# non-cluster-aware client works correctly against clustered Redis.
CELERY_BROKER_TRANSPORT_OPTIONS = {"global_keyprefix": "{ailab}"}

# Upstash secure redis (rediss://) requires SSL configuration
import ssl
if CELERY_BROKER_URL.startswith('rediss://'):
    CELERY_BROKER_USE_SSL = {'ssl_cert_reqs': ssl.CERT_NONE}
    CELERY_REDIS_BACKEND_USE_SSL = {'ssl_cert_reqs': ssl.CERT_NONE}

# Django Channels Configuration
ASGI_APPLICATION = "config.asgi.application"

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get('REDIS_URL', default='redis://127.0.0.1:6379/1')],
            # Same clustered-Redis fix: the {ailab} hash tag keeps every
            # channel-layer key on one slot so group operations don't hit CROSSSLOT.
            "prefix": "{ailab}:asgi:",
        },
    },
}
