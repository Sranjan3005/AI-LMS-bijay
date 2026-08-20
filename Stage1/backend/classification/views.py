"""classification/views.py"""

import io
import pandas as pd
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from scenarios.models import Scenario, DataVariant
from .models import ClassificationExperiment
from .serializers import (
    ClassificationRunSerializer,
    ClassificationExperimentSerializer,
    ClassificationExperimentListSerializer,
)
from .dataset_generators import get_dataset
from . import executor


class ClassificationPreviewView(APIView):
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
            scenario = Scenario.objects.get(id=scenario_id, model_type='CLASSIFICATION')
            variant  = DataVariant.objects.get(scenario=scenario, name=variant_name)
        except (Scenario.DoesNotExist, DataVariant.DoesNotExist) as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        try:
            csv_bytes = get_dataset(scenario.title, variant_name)
            df        = pd.read_csv(io.BytesIO(csv_bytes))
        except KeyError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

        # Include class distribution in the preview (extra useful for classification)
        label_col   = df.columns[-1]
        class_dist  = df[label_col].value_counts().to_dict()
        preview_df  = df.head(10)

        return Response({
            'scenario_title':    scenario.title,
            'variant_label':     variant.label,
            'total_rows':        len(df),
            'columns':           list(preview_df.columns),
            'rows':              preview_df.values.tolist(),
            'class_distribution': class_dist,
        })


class ClassificationRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ClassificationRunSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = executor.run_experiment(
                student       = request.user,
                scenario_id   = str(serializer.validated_data['scenario_id']),
                variant_name  = serializer.validated_data['variant_name'],
                student_prompt= serializer.validated_data.get('student_prompt', ''),
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Experiment failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result, status=status.HTTP_200_OK)


class ClassificationUploadRunView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No CSV file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        scenario_id  = request.data.get('scenario_id', '')
        variant_name = request.data.get('variant_name', 'upload')
        prompt       = request.data.get('student_prompt', '')
        if not scenario_id:
            scenario    = Scenario.objects.filter(model_type='CLASSIFICATION', is_active=True).first()
            scenario_id = str(scenario.id) if scenario else ''
        try:
            result = executor.run_experiment(
                student=request.user, scenario_id=scenario_id,
                variant_name=variant_name, student_prompt=prompt,
                uploaded_csv_bytes=csv_file.read(),
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(result, status=status.HTTP_200_OK)


class ClassificationPredictView(APIView):
    """
    POST /api/v1/classification/predict/
    Body: { experiment_id, features: { colName: val } }

    Loads the model the sandbox trained (model_b64) and predicts the class for
    one new example. Also returns per-class probabilities when the classifier
    supports them, so students can see how confident it actually is.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        experiment_id = request.data.get('experiment_id')
        features = request.data.get('features')

        if not experiment_id or not features:
            return Response({'error': 'experiment_id and features are required.'},
                            status=status.HTTP_400_BAD_REQUEST)

        try:
            experiment = ClassificationExperiment.objects.get(id=experiment_id, student=request.user)
        except ClassificationExperiment.DoesNotExist:
            return Response({'error': 'Experiment not found or access denied.'},
                            status=status.HTTP_404_NOT_FOUND)

        if not experiment.model_b64:
            return Response({'error': 'No trained model was saved for this experiment. Re-run the training to enable predictions.'},
                            status=status.HTTP_400_BAD_REQUEST)

        import base64
        import joblib

        try:
            model = joblib.load(io.BytesIO(base64.b64decode(experiment.model_b64)))
            df = pd.DataFrame([features])
            pred = model.predict(df)

            result = pred.tolist()
            if isinstance(result, list) and result:
                result = result[0]
                if isinstance(result, list):   # handle [[val]] vs [val]
                    result = result[0]

            payload = {'prediction': result}

            if hasattr(model, 'predict_proba'):
                try:
                    proba = model.predict_proba(df)[0]
                    classes = [str(c) for c in getattr(model, 'classes_', range(len(proba)))]
                    payload['probabilities'] = {c: round(float(p) * 100, 1) for c, p in zip(classes, proba)}
                except Exception:
                    pass   # probabilities are a bonus, never fail the prediction over them

            return Response(payload, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({'error': 'Prediction failed.', 'details': str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ClassificationResultsListView(generics.ListAPIView):
    serializer_class   = ClassificationExperimentListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClassificationExperiment.objects.filter(student=self.request.user)


class ClassificationResultDetailView(generics.RetrieveAPIView):
    serializer_class   = ClassificationExperimentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ClassificationExperiment.objects.filter(student=self.request.user)
