# Django backend (ASGI via Daphne) for Azure Container Apps
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

WORKDIR /app

# System build deps (covers any source wheels + psycopg build headers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies (azure-identity + whitenoise added explicitly so the image
# works even if requirements.txt hasn't been regenerated yet)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir azure-identity whitenoise

# Application code
COPY . .

# Collect static at build time (needs no DB) so WhiteNoise can serve admin CSS
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# One image, two roles. Default = web (Daphne, HTTP + WebSockets on 8000).
# Set CONTAINER_ROLE=worker on the worker app to run Celery instead.
CMD ["sh", "-c", "if [ \"$CONTAINER_ROLE\" = 'worker' ]; then exec celery -A config worker -l info; else exec daphne -b 0.0.0.0 -p 8000 config.asgi:application; fi"]
