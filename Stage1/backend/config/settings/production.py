import os
from .base import *  # noqa

DEBUG = False

# Comma-separated env lists. Filter falsy entries so an empty var doesn't
# produce [''] (which silently breaks host/CSRF matching).
ALLOWED_HOSTS = [h for h in os.environ.get('ALLOWED_HOSTS', '').split(',') if h]

CORS_ALLOWED_ORIGINS = [o for o in os.environ.get('CORS_ORIGINS', '').split(',') if o]

# The frontend (Static Web Apps) submits to the Django admin / auth over HTTPS
# from a different origin; Django 4+ requires the scheme-qualified origin here.
CSRF_TRUSTED_ORIGINS = [o for o in os.environ.get('CSRF_TRUSTED_ORIGINS', '').split(',') if o]

# We run behind a TLS-terminating reverse proxy (Caddy / Container Apps ingress).
# Without this, SECURE_SSL_REDIRECT causes an infinite redirect loop because
# Django only ever sees the internal HTTP request.
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Security headers for production
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Serve Django admin / DRF static files in production via WhiteNoise
# (no separate web server needed). Inserted right after SecurityMiddleware.
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')  # noqa: F405
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"},
}
