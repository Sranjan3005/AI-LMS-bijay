"""
regression/views.py

Endpoints:
    GET  /api/v1/regression/preview/      → data preview (no Docker, no LLM)
    POST /api/v1/regression/run/          → full experiment
    POST /api/v1/regression/upload-run/   → run with student CSV (Stage 2 backend)
    GET  /api/v1/regression/results/      → student's experiment history
    GET  /api/v1/regression/results/{id}/ → single experiment detail
"""

import io
import pandas as pd
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from core.permissions import IsStudentOwner
from scenarios.models import Scenario, DataVariant
from .models import RegressionExperiment
from .serializers import (
    RegressionRunSerializer,
    RegressionExperimentSerializer,
    RegressionExperimentListSerializer,
)
from .dataset_generators import get_dataset
from . import executor
from .tasks import run_regression_experiment_task
from celery.result import AsyncResult


class RegressionPreviewView(APIView):
    """
    GET /api/v1/regression/preview/?scenario_id=<uuid>&variant_name=<str>

    Returns the first 10 rows of the dataset for the selected scenario+variant
    as a JSON table. No Docker, no LLM — instant.
    Open to unauthenticated users so students can browse before logging in.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        scenario_id  = request.query_params.get('scenario_id')
        variant_name = request.query_params.get('variant_name')

        if not scenario_id or not variant_name:
            return Response(
                {'error': 'Both scenario_id and variant_name are required query parameters.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            scenario = Scenario.objects.get(id=scenario_id, model_type='REGRESSION')
            variant  = DataVariant.objects.get(scenario=scenario, name=variant_name)
        except (Scenario.DoesNotExist, DataVariant.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        try:
            csv_bytes = get_dataset(scenario.title, variant_name)
            df        = pd.read_csv(io.BytesIO(csv_bytes))
        except KeyError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Replace NaNs and Infinities with None for JSON compliance
        preview_df = df.head(10).replace([float('inf'), float('-inf')], float('nan')).where(pd.notnull(df.head(10)), None)

        return Response({
            'scenario_title': scenario.title,
            'variant_label':  variant.label,
            'total_rows':     len(df),
            'columns':        list(preview_df.columns),
            'rows':           preview_df.values.tolist(),
        })


class RegressionRunView(APIView):
    """
    POST /api/v1/regression/run/
    Body: { scenario_id, variant_name, student_prompt? }
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RegressionRunSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            task = run_regression_experiment_task.delay(
                user_id       = request.user.id,
                scenario_id   = str(serializer.validated_data['scenario_id']),
                variant_name  = serializer.validated_data['variant_name'],
                student_prompt= serializer.validated_data.get('student_prompt', ''),
            )
            return Response({'task_id': task.id, 'status': 'processing'}, status=status.HTTP_202_ACCEPTED)
        except Exception as e:
            return Response({'error': f'Experiment dispatch failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class RegressionTaskStatusView(APIView):
    """
    GET /api/v1/regression/run-status/?task_id=<uuid>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response({'error': 'task_id required'}, status=status.HTTP_400_BAD_REQUEST)

        task = AsyncResult(task_id)
        if task.state == 'PENDING' or task.state == 'STARTED':
            return Response({'status': 'processing'})
        elif task.state == 'SUCCESS':
            result = task.result
            if isinstance(result, dict) and 'error' in result:
                return Response({'status': 'failed', 'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'status': 'completed', 'result': result})
        elif task.state == 'FAILURE':
            return Response({'status': 'failed', 'error': str(task.info)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({'status': task.state})


class RegressionUploadRunView(APIView):
    """
    POST /api/v1/regression/upload-run/
    Multipart: { file (CSV), scenario_id?, variant_name?, student_prompt? }

    Backend is ready for Stage 2. Not exposed in Stage 1 frontend UI.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No CSV file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        scenario_id  = request.data.get('scenario_id', '')
        variant_name = request.data.get('variant_name', 'upload')
        prompt       = request.data.get('student_prompt', '')

        # If no scenario_id, use a generic regression scenario
        # For Stage 2 this will be more sophisticated
        if not scenario_id:
            scenario = Scenario.objects.filter(model_type='REGRESSION', is_active=True).first()
            if not scenario:
                return Response({'error': 'No regression scenarios available.'}, status=status.HTTP_404_NOT_FOUND)
            scenario_id = str(scenario.id)
            variant_name = 'upload'

        try:
            result = executor.run_experiment(
                student            = request.user,
                scenario_id        = scenario_id,
                variant_name       = variant_name,
                student_prompt     = prompt,
                uploaded_csv_bytes = csv_file.read(),
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)


class RegressionResultsListView(generics.ListAPIView):
    """GET /api/v1/regression/results/ — student's own experiment history."""
    serializer_class   = RegressionExperimentListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RegressionExperiment.objects.filter(student=self.request.user)


class RegressionResultDetailView(generics.RetrieveAPIView):
    """GET /api/v1/regression/results/{id}/ — full detail of one experiment."""
    serializer_class   = RegressionExperimentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RegressionExperiment.objects.filter(student=self.request.user)


class RegressionPredictView(APIView):
    """
    POST /api/v1/regression/predict/
    Body: { experiment_id, features: { colName: val } }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        experiment_id = request.data.get('experiment_id')
        features = request.data.get('features')

        if not experiment_id or not features:
            return Response({'error': 'experiment_id and features are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            experiment = RegressionExperiment.objects.get(id=experiment_id, student=request.user)
        except RegressionExperiment.DoesNotExist:
            return Response({'error': 'Experiment not found or access denied.'}, status=status.HTTP_404_NOT_FOUND)

        if not experiment.model_b64:
            return Response({'error': 'No trained model available for this experiment.'}, status=status.HTTP_400_BAD_REQUEST)

        import base64
        import io
        import joblib
        import pandas as pd

        model_bytes = base64.b64decode(experiment.model_b64)

        try:
            # Load directly from memory (bypasses Windows temp file I/O & Antivirus scans)
            # We must use joblib.load since the model was saved with joblib.dump
            model = joblib.load(io.BytesIO(model_bytes))
            
            # Convert single input dict into a pandas DataFrame (1 row)
            df = pd.DataFrame([features])
            pred = model.predict(df)
            
            # Extract scalar or array safely
            result = pred.tolist()
            if isinstance(result, list) and len(result) > 0:
                result = result[0]
                if isinstance(result, list): # handle [[val]] vs [val]
                    result = result[0]

            return Response({'prediction': result}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': 'Prediction failed natively.', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
