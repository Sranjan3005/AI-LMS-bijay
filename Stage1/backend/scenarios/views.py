"""
scenarios/views.py

GET /api/v1/scenarios/           → list all active scenarios (filterable by ?model_type=)
GET /api/v1/scenarios/{id}/      → full detail with all variants
"""

import base64
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser

from core.llm import extract_csv_from_unstructured_data
from .models import Scenario, DataVariant
from .serializers import ScenarioListSerializer, ScenarioDetailSerializer
import csv
import io


class ScenarioListView(generics.ListAPIView):
    """
    List all active scenarios.
    Optional query param: ?model_type=REGRESSION | CLASSIFICATION | NEURAL_NETWORK
    """
    serializer_class   = ScenarioListSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Scenario.objects.filter(is_active=True).prefetch_related('variants')
        model_type = self.request.query_params.get('model_type')
        if model_type:
            qs = qs.filter(model_type=model_type.upper())
        return qs


class ScenarioDetailView(generics.RetrieveAPIView):
    """Return full scenario detail including all data variants."""
    serializer_class   = ScenarioDetailSerializer
    permission_classes = [AllowAny]
    queryset           = Scenario.objects.filter(is_active=True).prefetch_related('variants')


class CustomDataUploadView(APIView):
    """
    POST /api/v1/scenarios/upload/
    Handles file upload, extracts CSV if needed, and saves as a DataVariant.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        files = request.FILES.getlist('file')
        scenario_id = request.data.get('scenario_id')
        import time
        name = request.data.get('name', f'custom_{request.user.id}_{int(time.time())}')
        label = request.data.get('label', 'My Custom Data')

        if not files or not scenario_id:
            return Response({'error': 'file and scenario_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            if scenario.model_type in ['NEURAL_NETWORK', 'COMPUTER_VISION'] and all(f.content_type.startswith('image/') for f in files):
                if len(files) == 1:
                    payload = base64.b64encode(files[0].read()).decode('utf-8')
                else:
                    import json
                    payload = json.dumps([base64.b64encode(f.read()).decode('utf-8') for f in files])
            else:
                file_obj = files[0]
                file_type = file_obj.content_type
                file_bytes = file_obj.read()
                if file_type == 'text/csv' or file_obj.name.endswith('.csv'):
                    payload = file_bytes.decode('utf-8', errors='ignore')
                else:
                    b64_content = base64.b64encode(file_bytes).decode('utf-8')
                    payload = extract_csv_from_unstructured_data(scenario.title, file_type, b64_content)
        except Exception as e:
            return Response({'error': f'Failed to process file: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        variant, created = DataVariant.objects.update_or_create(
            scenario=scenario,
            name=name,
            user=request.user,
            defaults={
                'label': label,
                'description': 'Custom data collected in the Data Lab.',
                'data_payload': payload,
                'order': 99
            }
        )

        return Response({
            'message': 'Custom data saved successfully',
            'variant_name': variant.name,
            'payload': payload[:500] + '...' if len(payload) > 500 else payload
        }, status=status.HTTP_200_OK)


class CustomJsonUploadView(APIView):
    """
    POST /api/v1/scenarios/upload-json/
    Handles JSON array upload and saves it as a CSV DataVariant.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        scenario_id = request.data.get('scenario_id')
        data_rows = request.data.get('data') # Expecting list of dicts [{x:1, y:2}]
        import time
        name = request.data.get('name', f'custom_json_{request.user.id}_{int(time.time())}')
        label = request.data.get('label', 'My Manual Data')

        if not data_rows or not scenario_id:
            return Response({'error': 'data and scenario_id are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            scenario = Scenario.objects.get(id=scenario_id)
        except Scenario.DoesNotExist:
            return Response({'error': 'Scenario not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Convert JSON array to CSV payload
            output = io.StringIO()
            if len(data_rows) > 0:
                keys = data_rows[0].keys()
                writer = csv.DictWriter(output, fieldnames=keys)
                writer.writeheader()
                writer.writerows(data_rows)
            payload = output.getvalue()
        except Exception as e:
            return Response({'error': f'Failed to process JSON data: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        variant, created = DataVariant.objects.update_or_create(
            scenario=scenario,
            name=name,
            user=request.user,
            defaults={
                'label': label,
                'description': 'Manual data collected in the Data Lab.',
                'data_payload': payload,
                'order': 99
            }
        )

        return Response({
            'message': 'Manual data saved successfully',
            'variant_name': variant.name,
            'payload': payload
        }, status=status.HTTP_200_OK)


class CustomVariantDeleteView(APIView):
    """
    DELETE /api/v1/scenarios/variant/<id>/
    Deletes a custom variant created by a student.
    """
    permission_classes = [AllowAny]
    
    def delete(self, request, pk):
        try:
            variant = DataVariant.objects.get(id=pk)
            if variant.user is None:
                return Response({'error': 'Cannot delete system variants.'}, status=status.HTTP_403_FORBIDDEN)
                
            variant.delete()
            return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)
        except DataVariant.DoesNotExist:
            return Response({'error': 'Variant not found.'}, status=status.HTTP_404_NOT_FOUND)
