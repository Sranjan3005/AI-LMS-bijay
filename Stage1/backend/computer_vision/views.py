"""
computer_vision/views.py

Endpoints:
    GET  /api/v1/cv/preview/        → sample image preview for a scenario
    POST /api/v1/cv/run/            → run a CV experiment (accepts base64 image)
    GET  /api/v1/cv/run-status/     → check async task status
    GET  /api/v1/cv/results/        → student's experiment history
    GET  /api/v1/cv/results/{id}/   → single experiment detail
"""

import base64
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from scenarios.models import Scenario, DataVariant
from .models import CVExperiment
from .serializers import (
    CVRunSerializer,
    CVExperimentSerializer,
    CVExperimentListSerializer,
)
from .dataset_generators import get_sample_image, get_stage_metadata
from .tasks import run_cv_experiment_task
from celery.result import AsyncResult


class CVPreviewView(APIView):
    """
    GET /api/v1/cv/preview/?scenario_id=<uuid>&variant_name=<str>

    Returns sample image data and stage metadata for the scenario.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        scenario_id  = request.query_params.get('scenario_id')
        variant_name = request.query_params.get('variant_name')

        if not scenario_id or not variant_name:
            return Response(
                {'error': 'Both scenario_id and variant_name are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            scenario = Scenario.objects.get(id=scenario_id, model_type='COMPUTER_VISION')
            variant  = DataVariant.objects.get(scenario=scenario, name=variant_name)
        except (Scenario.DoesNotExist, DataVariant.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Get a sample image for preview
        try:
            image_bytes = get_sample_image(scenario.title, variant_name)
            sample_image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        except Exception:
            sample_image_b64 = None

        stage_metadata = get_stage_metadata(scenario.title)

        input_type = 'canvas'
        if scenario.title.lower() not in ['the digit detective', 'the handwriting decoder']:
            input_type = 'upload'

        return Response({
            'scenario_title': scenario.title,
            'variant_label':  variant.label,
            'sample_image':   sample_image_b64,
            'stage_metadata': stage_metadata,
            'input_type':     input_type,
        })


class CVRunView(APIView):
    """
    POST /api/v1/cv/run/
    Body: { scenario_id, variant_name, input_image? (base64), student_prompt? }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CVRunSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = run_cv_experiment_task.delay(
                user_id        = request.user.id,
                scenario_id    = str(serializer.validated_data['scenario_id']),
                variant_name   = serializer.validated_data['variant_name'],
                input_image_b64= serializer.validated_data.get('input_image', ''),
                student_prompt = serializer.validated_data.get('student_prompt', ''),
            )
            return Response(
                {'task_id': task.id, 'status': 'processing'},
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception as e:
            return Response(
                {'error': f'Experiment dispatch failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CVTaskStatusView(APIView):
    """
    GET /api/v1/cv/run-status/?task_id=<uuid>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response({'error': 'task_id required'}, status=status.HTTP_400_BAD_REQUEST)

        task = AsyncResult(task_id)
        if task.state in ('PENDING', 'STARTED'):
            return Response({'status': 'processing'})
        elif task.state == 'SUCCESS':
            result = task.result
            if isinstance(result, dict) and 'error' in result:
                return Response(
                    {'status': 'failed', 'error': result['error']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response({'status': 'completed', 'result': result})
        elif task.state == 'FAILURE':
            return Response(
                {'status': 'failed', 'error': str(task.info)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        else:
            return Response({'status': task.state})


class CVResultsListView(generics.ListAPIView):
    """GET /api/v1/cv/results/ — student's CV experiment history."""
    serializer_class   = CVExperimentListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CVExperiment.objects.filter(student=self.request.user)


class CVResultDetailView(generics.RetrieveAPIView):
    """GET /api/v1/cv/results/{id}/ — full detail of one CV experiment."""
    serializer_class   = CVExperimentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CVExperiment.objects.filter(student=self.request.user)
