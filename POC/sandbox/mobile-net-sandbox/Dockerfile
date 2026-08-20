FROM python:3.10-slim
WORKDIR /app
RUN pip install --no-cache-dir torch torchvision pillow requests --index-url https://download.pytorch.org/whl/cpu
RUN python -c "from torchvision.models import mobilenet_v2, MobileNet_V2_Weights; mobilenet_v2(weights=MobileNet_V2_Weights.DEFAULT)"
CMD ["python", "script.py"]