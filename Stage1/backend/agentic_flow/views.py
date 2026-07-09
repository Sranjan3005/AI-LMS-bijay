from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AgenticWorkflow, UserQuota
from .serializers import AgenticWorkflowSerializer
from .tasks import execute_langgraph_pipeline

class QuotaView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        quota, created = UserQuota.objects.get_or_create(user=request.user)
        quota.reset_if_needed()
        return Response({"daily_points": quota.daily_points})


class AgenticWorkflowViewSet(viewsets.ModelViewSet):
    """
    API endpoints for Agentic Workflows.
    Students can see templates and their own flows.
    """
    serializer_class = AgenticWorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return AgenticWorkflow.objects.all()
        # Return templates + the student's own workflows
        return AgenticWorkflow.objects.filter(is_template=True) | AgenticWorkflow.objects.filter(student=user)

    @action(detail=True, methods=['post'])
    def execute(self, request, pk=None):
        """
        Triggers the Celery task to execute the LangGraph pipeline
        based on the saved React Flow JSON.
        """
        workflow = self.get_object()
        
        # Point Calculation and Word Limit checks
        cost = 0
        nodes = workflow.flow_data.get('nodes', [])
        for node in nodes:
            # LLM Nodes cost 5 points
            if node['type'] in ['customizer', 'summarizer', 'sentimentRadar']:
                cost += 5
            elif node['type'] == 'webSearch':
                cost += 2
                
            # Input Nodes are free but have word limits
            if node['type'] in ['textInput', 'documentReader']:
                text = node.get('data', {}).get('text', '')
                if len(text.split()) > 100:
                    return Response({"error": "Input text exceeds 100 words limit. Please shorten to save points."}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct Points
        quota, _ = UserQuota.objects.get_or_create(user=request.user)
        if not quota.deduct(cost):
            return Response({"error": f"Insufficient points! This workflow requires {cost} points but you only have {quota.daily_points} left today."}, status=status.HTTP_402_PAYMENT_REQUIRED)
            
        # Dispatching the Celery task
        task = execute_langgraph_pipeline.delay(workflow.id)
        
        return Response({
            "message": "Execution started! WebSockets will stream the results.",
            "workflow_id": workflow.id,
            "status": "processing"
        }, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['post'])
    def generate_flow(self, request):
        """
        Generates a React Flow JSON pipeline from a text prompt using OpenRouter.
        Deducts 30 points.
        """
        prompt = request.data.get('prompt', '')
        if not prompt:
            return Response({"error": "Prompt is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Deduct 30 Points
        quota, _ = UserQuota.objects.get_or_create(user=request.user)
        if not quota.deduct(30):
            return Response({"error": f"Insufficient points! AI generation costs 30 points, but you only have {quota.daily_points} left."}, status=status.HTTP_402_PAYMENT_REQUIRED)

        system_prompt = """
You are an expert architect of AI pipelines. You build Agentic Flow pipelines.
We have the following node types available:
Inputs: textInput, documentReader, visionScanner
Processors: customizer (an LLM node), summarizer, sentimentRadar, webSearch
Routing: decider, merger
Outputs: display, chartGenerator

You MUST output exactly a JSON object with the following structure:
{
  "nodes": [
    { "id": "node_1", "type": "textInput", "position": {"x": 100, "y": 100}, "data": {"label": "User Input"} }
  ],
  "edges": [
    { "id": "e1-2", "source": "node_1", "target": "node_2" }
  ],
  "explanation": "A teaching paragraph explaining why you chose these nodes and how the data flows."
}

Do not include markdown blocks outside the JSON. Return only the raw JSON string.
"""

        import os, json
        from openai import AzureOpenAI
        try:
            client = AzureOpenAI(
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
                api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
            )
            response = client.chat.completions.create(
                model=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Build a pipeline for: {prompt}"}
                ],
                max_completion_tokens=2000
            )
            raw_text = response.choices[0].message.content.strip()
            
            # Extract JSON
            start_idx = raw_text.find('{')
            end_idx = raw_text.rfind('}')
            if start_idx != -1 and end_idx != -1:
                json_str = raw_text[start_idx:end_idx+1]
                data = json.loads(json_str)
                return Response(data, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Failed to parse JSON from AI"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            # Refund points if failed?
            quota.daily_points += 30
            quota.save()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
