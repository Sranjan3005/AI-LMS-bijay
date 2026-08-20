FROM python:3.10-slim
WORKDIR /app
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
# CPU only package of pytorch
RUN pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir ultralytics opencv-python-headless pillow
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
CMD ["python", "script.py"]