FROM python:3.10-slim

WORKDIR /app

# Install necessary machine learning and data libraries
RUN pip install --no-cache-dir \
    pandas==2.2.0 \
    scikit-learn==1.4.0 \
    matplotlib==3.8.2 \
    joblib==1.3.2 \
    numpy==1.26.4

# Create data directory for input/output files
RUN mkdir -p /app/data

# Default command
CMD ["python", "script.py"]
