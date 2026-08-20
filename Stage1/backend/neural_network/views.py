"""neural_network/views.py"""

import io
import pandas as pd
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser

from scenarios.models import Scenario, DataVariant
from .models import NeuralNetworkExperiment
from .serializers import (
    NeuralNetworkRunSerializer,
    NeuralNetworkExperimentSerializer,
    NeuralNetworkExperimentListSerializer,
)
from .dataset_generators import get_dataset, _title_to_slug
from . import executor
from .data_interpretations import INTERPRETATIONS

class NeuralNetworkPreviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        scenario_id  = request.query_params.get('scenario_id')
        variant_name = request.query_params.get('variant_name')

        if not scenario_id or not variant_name:
            return Response({'error': 'Missing params.'}, status=400)

        try:
            scenario = Scenario.objects.get(id=scenario_id, model_type='NEURAL_NETWORK')
            variant  = DataVariant.objects.get(scenario=scenario, name=variant_name)
        except Exception as e:
            return Response({'error': str(e)}, status=404)

        try:
            csv_bytes = get_dataset(scenario.title, variant_name)
            df        = pd.read_csv(io.BytesIO(csv_bytes))
        except KeyError as e:
            return Response({'error': str(e)}, status=404)

        # Truncate columns for preview since there are 65 of them!
        cols_to_show = list(df.columns[:5]) + ['...'] + [df.columns[-1]]
        
        return Response({
            'scenario_title': scenario.title,
            'variant_label':  variant.label,
            'total_rows':     len(df),
            'total_columns':  len(df.columns),
            'columns':        cols_to_show,
            'rows':           df.head(5).values.tolist(), # Just 5 rows to save payload size
        })

class NeuralNetworkInterpretView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        scenario_id  = request.query_params.get('scenario_id')
        variant_name = request.query_params.get('variant_name')
        if not scenario_id or not variant_name:
            return Response({'error': 'Missing params.'}, status=400)

        try:
            scenario = Scenario.objects.get(id=scenario_id, model_type='NEURAL_NETWORK')
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found'}, status=404)

        slug = _title_to_slug(scenario.title)
        meta = INTERPRETATIONS.get(slug)
        if not meta:
            return Response({'error': 'Interpretation not found'}, status=404)
        
        variant_meta = meta['variants'].get(variant_name, {})

        return Response({
            'scenario_title': scenario.title,
            'variant_name': variant_name,
            'data_overview': meta['overview'],
            'column_descriptions': meta['columns'],
            'preprocessing_steps': meta['preprocessing'],
            'bias_analysis': variant_meta,
        })


class NeuralNetworkRunView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = NeuralNetworkRunSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        try:
            result = executor.run_experiment(
                student       = request.user,
                scenario_id   = str(serializer.validated_data['scenario_id']),
                variant_name  = serializer.validated_data['variant_name'],
                student_prompt= serializer.validated_data.get('student_prompt', ''),
            )
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response(result, status=200)

class NeuralNetworkUploadRunView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        csv_file = request.FILES.get('file')
        if not csv_file:
            return Response({'error': 'No file.'}, status=400)
        
        scenario_id = request.data.get('scenario_id')
        try:
            result = executor.run_experiment(
                student=request.user, scenario_id=scenario_id,
                variant_name='upload', uploaded_csv_bytes=csv_file.read()
            )
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        return Response(result, status=200)

class NeuralNetworkResultsListView(generics.ListAPIView):
    serializer_class = NeuralNetworkExperimentListSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return NeuralNetworkExperiment.objects.filter(student=self.request.user)

class NeuralNetworkResultDetailView(generics.RetrieveAPIView):
    serializer_class = NeuralNetworkExperimentSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        return NeuralNetworkExperiment.objects.filter(student=self.request.user)
