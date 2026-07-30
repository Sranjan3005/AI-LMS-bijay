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
Inputs: textInput, documentReader, visionScanner, speechToText
Processors: customizer (an LLM node), summarizer, sentimentRadar, webSearch, objectDetection
Routing: decider, merger
Outputs: display, chartGenerator, messenger

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
            deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
            
            # --- PRE-CHECK ---
            precheck_prompt = f"""
We have a visual agentic platform with ONLY these nodes: 
textInput, documentReader, visionScanner, speechToText, customizer, summarizer, sentimentRadar, webSearch, objectDetection, decider, merger, display, chartGenerator, messenger.
A student wants to build this idea: "{prompt}"
Can it be built reasonably well using only these nodes?
Reply ONLY in raw JSON format (no markdown):
{{"feasible": true/false, "reason": "short explanation of why or why not"}}
"""
            precheck_response = client.chat.completions.create(
                model=deployment,
                messages=[{"role": "system", "content": "You are a feasibility checker."}, {"role": "user", "content": precheck_prompt}],
                max_completion_tokens=500
            )
            precheck_raw = precheck_response.choices[0].message.content.strip()
            
            try:
                start_idx = precheck_raw.find('{')
                end_idx = precheck_raw.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    precheck_data = json.loads(precheck_raw[start_idx:end_idx+1])
                    if not precheck_data.get("feasible", True):
                        # Refund points since we didn't generate
                        quota.daily_points += 30
                        quota.save()
                        return Response({"error": precheck_data.get("reason", "This idea cannot be built with the available nodes.")}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                pass # If parsing fails, just proceed to generation

            # --- GENERATION ---
            response = client.chat.completions.create(
                model=deployment,
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

    @action(detail=False, methods=['post'])
    def evaluate_idea(self, request):
        """
        Uses Azure OpenAI to determine if the user's pipeline idea is feasible with the currently available nodes.
        Available nodes: TextInput, DocumentReader, VisionScanner, SpeechToText, WebScraper, SentimentRadar, Customizer (LLM prompt), Merger, Decider, Display, ObjectDetection.
        """
        idea = request.data.get('idea', '')
        if not idea:
            return Response({"error": "No idea provided"}, status=status.HTTP_400_BAD_REQUEST)
            
        import os, json
        from openai import AzureOpenAI
        
        try:
            api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
            
            # Local Dev Fallback
            if not api_key:
                return Response({
                    "is_feasible": True,
                    "explanation": "Looks great! You can build this using our sandbox nodes."
                }, status=status.HTTP_200_OK)
                
            client = AzureOpenAI(
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
                api_key=api_key,
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
            )
            deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
            
            system_prompt = """
You are an AI pipeline evaluator for an educational sandbox.
The user wants to build an AI pipeline. Evaluate if their idea is feasible using ONLY the following available drag-and-drop nodes:
- Text Input: manual text entry
- Document Reader: extracts text from PDFs, Word, CSV
- Vision Scanner: extracts text or descriptions from images
- Speech to Text: transcribes audio files to text
- Web Scraper: extracts text from a given URL
- Sentiment Radar: scores the mood (positive/negative) of text
- Customizer: a generic LLM node that can follow any prompt (e.g. summarize, extract, translate)
- Merger: combines multiple inputs into one
- Decider: routes flow based on a true/false condition
- Object Detection: finds and counts objects/animals in an image
- Display: shows the final output to the screen

If the idea requires external APIs we don't have (like sending emails, executing python code, searching live google (unless scraping a specific URL), taking real actions like booking a flight), it is NOT feasible.
If the idea involves facial recognition, biometric matching, or identifying specific real-world people from images (e.g., scanning Facebook to identify someone in a photo), it is NOT feasible due to strict privacy and safety guardrails.
If it just requires processing data, reading documents/audio/web, analyzing sentiment, and prompting an LLM to generate text, it IS feasible.

Respond ONLY with a JSON object:
{"is_feasible": true/false, "explanation": "A short 1-2 sentence friendly explanation of how they can build it or why it's not possible."}
"""
            
            response = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": idea}
                ],
                max_completion_tokens=200
            )
            
            raw_text = response.choices[0].message.content.strip()
            
            # clean markdown
            if raw_text.startswith('```json'):
                raw_text = raw_text[7:]
            if raw_text.startswith('```'):
                raw_text = raw_text[3:]
            if raw_text.endswith('```'):
                raw_text = raw_text[:-3]
                
            data = json.loads(raw_text.strip())
            return Response(data, status=status.HTTP_200_OK)
            
        except Exception as e:
            # Fallback on error to not block the user entirely
            return Response({
                "is_feasible": True,
                "explanation": "We had trouble evaluating this, but feel free to try building it!"
            }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def object_detect(self, request):
        """
        Uses Azure OpenAI Vision to detect objects or animals in a base64 image.
        Returns a list of objects with approximate bounding boxes.
        """
        image_b64 = request.data.get('image', '')
        if not image_b64:
            return Response({"error": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Strip data URL prefix if present
        if ',' in image_b64:
            _, image_b64 = image_b64.split(',', 1)

        import os, json
        from openai import AzureOpenAI
        try:
            api_key = os.environ.get("AZURE_OPENAI_API_KEY", "")
            
            # Local Dev Fallback: If no API key is provided, return a mock response 
            # so the UI still functions for testing without crashing.
            if not api_key:
                return Response({
                    "detections": [
                        {"class": "mock_elephant", "score": 0.99, "bbox": [0.1, 0.1, 0.5, 0.5]},
                        {"class": "mock_zebra", "score": 0.88, "bbox": [0.6, 0.2, 0.3, 0.3]}
                    ]
                }, status=status.HTTP_200_OK)

            client = AzureOpenAI(
                azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
                api_key=api_key,
                api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
            )
            deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
            
            system_prompt = """
You are an object detection AI. Look at the image and find all distinct objects or animals (ignore people).
For each object found, provide its name (e.g., 'zebra', 'car', 'laptop') and a confidence score between 0.0 and 1.0.
CRITICAL: You MUST provide an approximate bounding box [x, y, width, height] in normalized coordinates (0.0 to 1.0) where x and y are the top-left corner.
Respond ONLY with a JSON array of objects. Example:
[{"class": "zebra", "score": 0.95, "bbox": [0.1, 0.2, 0.3, 0.4]}]
Do not include any markdown, just the raw JSON array.
"""
            response = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Detect the animals in this image."},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                        ]
                    }
                ],
                max_completion_tokens=1000
            )
            
            raw_text = response.choices[0].message.content.strip()
            
            start_idx = raw_text.find('[')
            end_idx = raw_text.rfind(']')
            if start_idx != -1 and end_idx != -1:
                json_str = raw_text[start_idx:end_idx+1]
                data = json.loads(json_str)
                return Response({"detections": data}, status=status.HTTP_200_OK)
            else:
                return Response({"detections": []}, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
