import os
from openai import AsyncAzureOpenAI
from django.conf import settings
from langgraph.graph import StateGraph, START, END
from typing import TypedDict, Annotated
import operator
import textwrap
import json
import base64
import fitz  # PyMuPDF
from docx import Document
import io

def update_outputs(base: dict, new: dict) -> dict:
    base = base.copy()
    base.update(new)
    return base

def merge_display(base: str, new: str) -> str:
    # Multiple output nodes (display/chart) or parallel branches can write
    # final_display in the same superstep. A reducer lets LangGraph merge those
    # concurrent updates instead of raising INVALID_CONCURRENT_GRAPH_UPDATE.
    if not new:
        return base
    if not base:
        return new
    return f"{base}\n{new}"

class AgentState(TypedDict):
    # Maps node_id -> output payload
    outputs: Annotated[dict, update_outputs]
    final_display: Annotated[str, merge_display]

# Helper to fetch combined input from incoming edges
def get_combined_input(state: AgentState, incoming_edges: list) -> str:
    inputs = []
    outputs_dict = state.get("outputs", {})
    for src in incoming_edges:
        if src in outputs_dict:
            val = outputs_dict[src]
            if isinstance(val, str):
                inputs.append(val)
            else:
                inputs.append(json.dumps(val))
    return "\n\n".join(inputs)

# Node Factory: Text Input
def make_node_text_input(node_id, node_data):
    async def node_text_input(state: AgentState):
        print(f"--- 📝 Executing Text Input ({node_id}) ---")
        user_prompt = node_data.get('text', '')
        if not user_prompt:
             user_prompt = state.get("outputs", {}).get("__initial__", "No input provided.")
        return {"outputs": {node_id: user_prompt}}
    return node_text_input

# Node Factory: Vision Scanner (File Upload)
def make_node_vision_scanner(node_id, node_data):
    async def node_vision_scanner(state: AgentState):
        print(f"--- 📸 Executing Vision Scanner ({node_id}) ---")
        file_base64 = node_data.get('fileBase64')
        file_type = node_data.get('fileType', '')
        file_name = node_data.get('fileName', '')

        if not file_base64:
            return {"outputs": {node_id: "[No file uploaded to Vision Scanner]"}}

        try:
            # Strip data URL prefix
            if ',' in file_base64:
                _, base64_data = file_base64.split(',', 1)
            else:
                base64_data = file_base64
            
            raw_data = base64.b64decode(base64_data)

            if file_type.startswith('image/'):
                # Send to LLM for image analysis
                client = _azure_client()
                
                response = await client.chat.completions.create(
                    model=_CHAT_DEPLOYMENT,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": "Describe this image in detail."},
                                {"type": "image_url", "image_url": {"url": f"data:{file_type};base64,{base64_data}"}}
                            ]
                        }
                    ],
                    max_completion_tokens=3000
                )
                result = response.choices[0].message.content.strip()
                return {"outputs": {node_id: f"[Image Scan Result]\n{result}"}}
            
            elif file_type == 'application/pdf' or file_name.endswith('.pdf'):
                # Process PDF
                doc = fitz.open(stream=raw_data, filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text()
                doc.close()
                return {"outputs": {node_id: f"[Extracted from PDF: {file_name}]\n{text}"}}
            
            elif 'word' in file_type or file_name.endswith(('.doc', '.docx')):
                # Process Word Document
                doc_file = io.BytesIO(raw_data)
                doc = Document(doc_file)
                text = "\n".join([para.text for para in doc.paragraphs])
                return {"outputs": {node_id: f"[Extracted from Word Doc: {file_name}]\n{text}"}}
            
            else:
                return {"outputs": {node_id: f"[Unsupported file type: {file_type}]"}}

        except Exception as e:
            print(f"Error processing file in {node_id}: {e}")
            return {"outputs": {node_id: f"[Error extracting data from file: {str(e)}]"}}
            
    return node_vision_scanner

# Node Factory: Object Detection (hardcoded vision task)
# Unlike the Customizer, the job is FIXED — find and label every object/animal
# in the image. The node ignores any free-text prompt so its behaviour is
# predictable and specific, the way a real ML detector would be.
# Little icons so the detection output reads nicely (falls back to a dot).
_DETECTION_EMOJI = {
    'person': '🧑', 'bird': '🐦', 'cat': '🐈', 'dog': '🐕', 'horse': '🐴', 'sheep': '🐑',
    'cow': '🐄', 'elephant': '🐘', 'bear': '🐻', 'zebra': '🦓', 'giraffe': '🦒',
    'bicycle': '🚲', 'car': '🚗', 'motorcycle': '🏍️', 'airplane': '✈️', 'bus': '🚌',
    'train': '🚆', 'truck': '🚚', 'boat': '⛵', 'bottle': '🍾', 'cup': '☕', 'fork': '🍴',
    'knife': '🔪', 'bowl': '🥣', 'banana': '🍌', 'apple': '🍎', 'orange': '🍊', 'pizza': '🍕',
    'cake': '🍰', 'chair': '🪑', 'couch': '🛋️', 'bed': '🛏️', 'tv': '📺', 'laptop': '💻',
    'mouse': '🖱️', 'keyboard': '⌨️', 'cell phone': '📱', 'book': '📖', 'clock': '🕐',
    'scissors': '✂️', 'teddy bear': '🧸', 'umbrella': '☂️', 'backpack': '🎒', 'tie': '👔',
}


def make_node_object_detection(node_id, node_data, incoming_edges):
    async def node_object_detection(state: AgentState):
        print(f"--- 🔍 Executing Object Detection ({node_id}) ---")
        # Detection is done CLIENT-SIDE by a real model (TensorFlow.js coco-ssd)
        # when the image is uploaded; the results are stored on the node. Here we
        # simply forward those detections as clean, readable text — no LLM used.
        detections = node_data.get('detections')

        if isinstance(detections, list) and detections:
            lines = []
            for d in detections:
                if not (isinstance(d, dict) and d.get('label')):
                    continue
                label = d['label']
                emoji = _DETECTION_EMOJI.get(label, '🔹')
                score = d.get('score')
                lines.append(f"{emoji} {label}" + (f"  ·  {score}% sure" if score is not None else ""))
            count = len(lines)
            body = "\n".join(lines)
            header = f"🔍 Detected {count} object{'s' if count != 1 else ''}:"
            return {"outputs": {node_id: f"{header}\n{body}"}}

        if isinstance(detections, list):  # ran but found nothing
            return {"outputs": {node_id: "🔍 No objects were detected in the image."}}

        # No client-side detections available (e.g. image not uploaded yet).
        upstream = get_combined_input(state, incoming_edges)
        if upstream.strip():
            return {"outputs": {node_id: f"[Object Detection] No image detections; passing on upstream input:\n{upstream}"}}
        return {"outputs": {node_id: "[Object Detection: upload an image so the detector can run in your browser]"}}
    return node_object_detection

# Node Factory: Customizer
def make_node_customizer(node_id, node_data, incoming_edges):
    async def node_customizer(state: AgentState):
        print(f"--- 🧠 Executing The Customizer Node ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        system_prompt = node_data.get('prompt', 'You are a helpful AI.')
        
        try:
            client = _azure_client()
            
            strict_prompt = textwrap.dedent(f"""\
            Instruction: {system_prompt}
            Input text: {current_text}
            
            You must wrap your final verdict in a JSON object. Do not include any other text or markdown.
            Example format: {{"output": "your final verdict here"}}
            """)
            
            response = await client.chat.completions.create(
                model=_CHAT_DEPLOYMENT,
                messages=[{"role": "user", "content": strict_prompt}],
                max_completion_tokens=3000
            )
            raw_text = response.choices[0].message.content.strip()
            
            try:
                start_idx = raw_text.find('{')
                end_idx = raw_text.rfind('}')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    json_str = raw_text[start_idx:end_idx+1]
                    data = json.loads(json_str)
                    processed_text = data.get("output", raw_text)
                else:
                    processed_text = raw_text
            except json.JSONDecodeError:
                processed_text = raw_text
                
        except Exception as e:
            processed_text = f"OpenRouter Error: {str(e)}"
            
        return {"outputs": {node_id: processed_text}}
    return node_customizer

# Shared Azure OpenAI client for all LLM-backed nodes.
# Set AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT in env.
AZURE_OPENAI_API_VERSION = os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview")
_CHAT_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

def _azure_client():
    return AsyncAzureOpenAI(
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
        api_version=AZURE_OPENAI_API_VERSION,
    )

async def _llm_complete(prompt, max_tokens=2500, model=None):
    """Single-shot completion helper so node factories stay tiny."""
    client = _azure_client()
    response = await client.chat.completions.create(
        model=model or _CHAT_DEPLOYMENT,
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=max_tokens,
    )
    return response.choices[0].message.content.strip()

# Node Factory: Summarizer
def make_node_summarizer(node_id, node_data, incoming_edges):
    async def node_summarizer(state: AgentState):
        print(f"--- 📝 Executing Summarizer Node ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        if not current_text.strip():
            return {"outputs": {node_id: "[Summarizer received no input]"}}
        try:
            prompt = textwrap.dedent(f"""\
            Summarize the following text for a school student in 2-3 clear sentences.
            Keep it simple and factual. Do not add opinions.

            Text:
            {current_text}
            """)
            result = await _llm_complete(prompt, max_tokens=2200)
            return {"outputs": {node_id: f"[Summary]\n{result}"}}
        except Exception as e:
            return {"outputs": {node_id: f"[Summarizer error: {str(e)}]"}}
    return node_summarizer

# Node Factory: Sentiment Radar
def make_node_sentiment_radar(node_id, node_data, incoming_edges):
    async def node_sentiment_radar(state: AgentState):
        print(f"--- 😊 Executing Sentiment Radar Node ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        if not current_text.strip():
            return {"outputs": {node_id: "[Sentiment Radar received no input]"}}
        try:
            prompt = textwrap.dedent(f"""\
            Analyze the sentiment of the text below.
            Reply with ONLY a JSON object, no markdown, in this exact format:
            {{"sentiment": "Positive" | "Negative" | "Neutral", "confidence": 0-100, "reason": "one short sentence"}}

            Text:
            {current_text}
            """)
            raw = await _llm_complete(prompt, max_tokens=1500)
            start_idx, end_idx = raw.find('{'), raw.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                data = json.loads(raw[start_idx:end_idx + 1])
                summary = f"[Sentiment: {data.get('sentiment', 'Unknown')} " \
                          f"({data.get('confidence', 0)}%)]\n{data.get('reason', '')}"
                return {"outputs": {node_id: summary}}
            return {"outputs": {node_id: f"[Sentiment]\n{raw}"}}
        except Exception as e:
            return {"outputs": {node_id: f"[Sentiment Radar error: {str(e)}]"}}
    return node_sentiment_radar

# Node Factory: Safe Web Search
# NOTE: For student safety the sandbox has no live internet. This node answers
# from the model's own knowledge and labels the result clearly. To enable real
# search later, swap _llm_complete() for a Tavily/Bing API call here.
def make_node_web_search(node_id, node_data, incoming_edges):
    async def node_web_search(state: AgentState):
        print(f"--- 🌐 Executing Safe Web Search Node ({node_id}) ---")
        query = get_combined_input(state, incoming_edges) or node_data.get('query', '')
        if not query.strip():
            return {"outputs": {node_id: "[Web Search received no query]"}}
        try:
            prompt = textwrap.dedent(f"""\
            A student asked: "{query}"
            Answer factually and concisely in 3-4 sentences, suitable for a school student.
            If you are unsure, say so rather than guessing.
            """)
            result = await _llm_complete(prompt, max_tokens=2200)
            return {"outputs": {node_id: f"[Safe Web Search Result]\n{result}"}}
        except Exception as e:
            return {"outputs": {node_id: f"[Web Search error: {str(e)}]"}}
    return node_web_search

# Node Factory: The Decider (LLM router)
# Educational simplification: the Decider evaluates its condition and labels the
# outcome (TRUE/FALSE) in its output so students can see the routing decision.
# Both branches still execute downstream (the graph uses standard edges); full
# conditional pruning via add_conditional_edges is a future enhancement.
def make_node_decider(node_id, node_data, incoming_edges):
    async def node_decider(state: AgentState):
        print(f"--- 🔀 Executing Decider Node ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        condition = node_data.get('condition') or node_data.get('prompt') \
            or "Is the input positive or does it meet the goal?"
        try:
            prompt = textwrap.dedent(f"""\
            You are a routing gate. Evaluate this condition against the input.
            Condition: {condition}
            Input: {current_text}

            Reply with ONLY raw JSON, no markdown:
            {{"decision": "TRUE" | "FALSE", "reason": "one short sentence"}}
            """)
            raw = await _llm_complete(prompt, max_tokens=1500)
            start_idx, end_idx = raw.find('{'), raw.rfind('}')
            decision, reason = "TRUE", ""
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                data = json.loads(raw[start_idx:end_idx + 1])
                decision = str(data.get("decision", "TRUE")).upper()
                reason = data.get("reason", "")
            payload = f"[Decision: {decision}] {reason}\n---\n{current_text}"
            return {"outputs": {node_id: payload}}
        except Exception as e:
            return {"outputs": {node_id: f"[Decider error: {str(e)}]\n{current_text}"}}
    return node_decider

# Node Factory: Chart Generator
def make_node_chart_generator(node_id, node_data, incoming_edges):
    async def node_chart_generator(state: AgentState):
        print(f"--- 📊 Executing Chart Generator ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        
        try:
            client = _azure_client()
            
            prompt = textwrap.dedent(f"""\
            Take the following data and format it into a JSON structure for charting.
            Supported chart types are "bar", "line", and "pie".
            The output MUST be raw JSON containing "type" and "data" array with "name" and "value" pairs.
            Do not include markdown fences, ONLY raw JSON.
            
            Example output format:
            {{
              "type": "bar",
              "data": [
                {{"name": "Apples", "value": 10}},
                {{"name": "Bananas", "value": 15}}
              ]
            }}
            
            Input Data:
            {current_text}
            """)
            
            response = await client.chat.completions.create(
                model=_CHAT_DEPLOYMENT,
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=3000
            )
            raw_text = response.choices[0].message.content.strip()
            
            if raw_text.startswith('```json'):
                raw_text = raw_text[7:]
            if raw_text.startswith('```'):
                raw_text = raw_text[3:]
            if raw_text.endswith('```'):
                raw_text = raw_text[:-3]
                
            final_json = raw_text.strip()
            return {"outputs": {node_id: final_json}, "final_display": final_json}
        except Exception as e:
            error_json = json.dumps({"error": str(e)})
            return {"outputs": {node_id: error_json}, "final_display": error_json}
    return node_chart_generator

# Generic placeholder
def make_generic_node(node_id, node_data, incoming_edges):
    async def generic_node(state: AgentState):
        print(f"--- ⚙️ Executing Generic Node ({node_id}) ---")
        current_text = get_combined_input(state, incoming_edges)
        return {"outputs": {node_id: f"[Processed by {node_data.get('label', 'generic')}]\n{current_text}"}}
    return generic_node

# Node Factory: Merger
def make_node_merger(node_id, node_data, incoming_edges):
    async def node_merger(state: AgentState):
        print(f"--- 🔀 Executing Merger Node ({node_id}) ---")
        merged_text = get_combined_input(state, incoming_edges)
        return {"outputs": {node_id: f"--- MERGED DATA ---\n{merged_text}"}}
    return node_merger

# Node Factory: Screen Display
def make_node_display(node_id, node_data, incoming_edges):
    async def node_display(state: AgentState):
        print(f"--- 💻 Executing Screen Display ({node_id}) ---")
        final_text = get_combined_input(state, incoming_edges)
        return {"outputs": {node_id: final_text}, "final_display": final_text}
    return node_display


# Node Factory: Send Message (action) — simulates dispatching a notification.
def make_node_messenger(node_id, node_data, incoming_edges):
    async def node_messenger(state: AgentState):
        print(f"--- 📨 Executing Send Message ({node_id}) ---")
        content = get_combined_input(state, incoming_edges).strip() or "(no content to send)"
        recipient = node_data.get('recipient') or node_data.get('label') or 'the recipient'
        payload = f"📨 Message sent to {recipient}:\n\n{content}\n\n✅ Delivered."
        return {"outputs": {node_id: payload}, "final_display": payload}
    return node_messenger


class ReactFlowCompiler:
    def __init__(self, flow_data):
        self.nodes = flow_data.get('nodes', [])
        self.edges = flow_data.get('edges', [])
        self.graph = StateGraph(AgentState)

    def compile(self):
        if not self.nodes:
            raise ValueError("Flow has no nodes.")

        # Pre-calculate incoming edges
        incoming_edges = {node['id']: [] for node in self.nodes}
        for edge in self.edges:
            incoming_edges[edge['target']].append(edge['source'])

        for node in self.nodes:
            node_id = node['id']
            node_type = node['type']
            node_data = node.get('data', {})
            sources = incoming_edges[node_id]
            
            if node_type in ['textInput', 'documentReader']:
                self.graph.add_node(node_id, make_node_text_input(node_id, node_data))
            elif node_type == 'visionScanner':
                self.graph.add_node(node_id, make_node_vision_scanner(node_id, node_data))
            elif node_type == 'objectDetection':
                self.graph.add_node(node_id, make_node_object_detection(node_id, node_data, sources))
            elif node_type in ['customizer', 'llm']:
                self.graph.add_node(node_id, make_node_customizer(node_id, node_data, sources))
            elif node_type == 'summarizer':
                self.graph.add_node(node_id, make_node_summarizer(node_id, node_data, sources))
            elif node_type == 'sentimentRadar':
                self.graph.add_node(node_id, make_node_sentiment_radar(node_id, node_data, sources))
            elif node_type == 'webSearch':
                self.graph.add_node(node_id, make_node_web_search(node_id, node_data, sources))
            elif node_type == 'decider':
                self.graph.add_node(node_id, make_node_decider(node_id, node_data, sources))
            elif node_type == 'chartGenerator':
                self.graph.add_node(node_id, make_node_chart_generator(node_id, node_data, sources))
            elif node_type == 'display':
                self.graph.add_node(node_id, make_node_display(node_id, node_data, sources))
            elif node_type == 'messenger':
                self.graph.add_node(node_id, make_node_messenger(node_id, node_data, sources))
            elif node_type == 'merger':
                self.graph.add_node(node_id, make_node_merger(node_id, node_data, sources))
            else:
                self.graph.add_node(node_id, make_generic_node(node_id, node_data, sources))

        # Normal edges — but a Decider routes to ONLY ONE branch, so its outgoing
        # edges are handled as conditional edges below (not plain edges).
        decider_ids = {n['id'] for n in self.nodes if n.get('type') == 'decider'}
        for edge in self.edges:
            if edge['source'] in decider_ids:
                continue
            self.graph.add_edge(edge['source'], edge['target'])

        # Conditional routing for each Decider: TRUE → its true-handle target,
        # FALSE → its false-handle target (so the two branches stay separate).
        for did in decider_ids:
            out_edges = [e for e in self.edges if e['source'] == did]
            true_targets = [e['target'] for e in out_edges if e.get('sourceHandle') == 'true']
            false_targets = [e['target'] for e in out_edges if e.get('sourceHandle') == 'false']
            unlabeled = [e['target'] for e in out_edges if e.get('sourceHandle') not in ('true', 'false')]
            true_targets += unlabeled
            false_targets += unlabeled

            def _router(state, _did=did):
                out = str(state.get('outputs', {}).get(_did, '')).lower()
                return 'T' if '[decision: true]' in out else 'F'

            self.graph.add_conditional_edges(did, _router, {
                'T': true_targets[0] if true_targets else END,
                'F': false_targets[0] if false_targets else END,
            })

        target_ids = {edge['target'] for edge in self.edges}
        entry_nodes = [n for n in self.nodes if n['id'] not in target_ids]
        
        # Connect START to ALL entry nodes (fixes parallel branch bug)
        for entry_node in entry_nodes:
            self.graph.add_edge(START, entry_node['id'])
        
        source_ids = {edge['source'] for edge in self.edges}
        exit_nodes = [n for n in self.nodes if n['id'] not in source_ids]
        
        for exit_node in exit_nodes:
            self.graph.add_edge(exit_node['id'], END)

        return self.graph.compile()
