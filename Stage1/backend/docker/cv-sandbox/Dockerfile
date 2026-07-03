FROM python:3.11-slim

# Install system dependencies for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages for CV processing
RUN pip install --no-cache-dir \
    opencv-python-headless==4.9.0.80 \
    "numpy<2" \
    scikit-learn>=1.3 \
    matplotlib>=3.7 \
    Pillow>=10.0

WORKDIR /app
