"""
core/llm.py

Shared Gemini integration using the new google-genai SDK.
All model apps use these two functions — never import google.genai directly in apps.

Two functions:
    - generate_code()        → produces the Python script for the sandbox
    - generate_explanation() → produces a student-friendly explanation of results
"""

import logging
import os
import openai
import hashlib
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# ─── Model type → sandbox instruction context ──────────────────────────────────
_SYSTEM_CONTEXT = {
    'REGRESSION': (
        "You are an AI assistant for a middle-school education platform teaching "
        "Linear Regression. Generate ONLY raw Python code (no markdown, no ```). "
        "The script must:\n"
        "- Read data from /app/data/input.csv using pandas\n"
        "- Train a LinearRegression model using scikit-learn\n"
        "- Save the trained model to /app/data/model.pkl using joblib\n"
        "- Save a matplotlib plot to /app/data/output.jpg\n"
        "- Print key metrics (R² score, predictions) to stdout\n"
        "Use clear variable names suitable for a 12-14 year old reading the code. "
        "CRITICAL: Use plt.style.use('dark_background'). Plot scatter points in bright neon cyan ('#00f0ff') and the regression line in bright neon pink ('#ff00ff') with linewidth=3. If there are 2 features (3 columns total), you MUST use `fig.add_subplot(111, projection='3d')` to generate a 3D scatter plot and a 3D regression plane (using np.meshgrid) instead of a line. Make the graph look highly futuristic, sleek, and interesting! "
        "Do not use plt.show(). Save the figure with plt.savefig('/app/data/output.jpg', bbox_inches='tight', dpi=100)."
    ),
    'CLASSIFICATION': (
        "You are an AI assistant for a middle-school education platform teaching "
        "Classification. Generate ONLY raw Python code (no markdown, no ```). "
        "The script must:\n"
        "- Read data from /app/data/input.csv using pandas\n"
        "- The last column is always the target label\n"
        "- Train a classifier (prefer DecisionTreeClassifier or GaussianNB from scikit-learn)\n"
        "- Save a confusion matrix plot to /app/data/output.jpg using matplotlib\n"
        "- Print accuracy, a classification report to stdout\n"
        "Use clear variable names suitable for a 12-14 year old. "
        "CRITICAL: Use plt.style.use('dark_background'). Plot points in bright neon colors. Make the graph look highly futuristic, sleek, and interesting! "
        "Do not use plt.show(). Save with plt.savefig('/app/data/output.jpg', bbox_inches='tight', dpi=100)."
    ),
    'NEURAL_NETWORK': (
        "You are an AI assistant for a middle-school education platform teaching "
        "Neural Networks. Generate ONLY raw Python code (no markdown, no ```). "
        "The script must:\n"
        "- Use sklearn.datasets.load_digits() as the data source (DO NOT read any CSV file)\n"
        "- Train an MLPClassifier from sklearn.neural_network\n"
        "- Apply the variant transformation described below to the data BEFORE training\n"
        "- Save a training loss curve plot to /app/data/output.jpg using matplotlib\n"
        "- Print accuracy and a short classification report to stdout\n"
        "Use clear variable names suitable for a 12-14 year old. "
        "CRITICAL: Use plt.style.use('dark_background'). Plot lines in bright neon colors (e.g. cyan/magenta). Make the graph look highly futuristic, sleek, and interesting! "
        "Do not use plt.show(). Save with plt.savefig('/app/data/output.jpg', bbox_inches='tight', dpi=100)."
    ),
    'COMPUTER_VISION': (
        "You are an AI assistant for a middle-school education platform teaching "
        "Computer Vision. Generate ONLY raw Python code (no markdown, no ```). "
        "The script must:\n"
        "- Read the input image from /app/data/input.png using cv2.imread()\n"
        "- Perform a 4-stage image processing pipeline and SAVE each stage as a separate image:\n"
        "  Stage 1 (/app/data/stage_1.jpg): The original input image (just copy it)\n"
        "  Stage 2 (/app/data/stage_2.jpg): Preprocessed — grayscale conversion, noise reduction (GaussianBlur), normalization\n"
        "  Stage 3 (/app/data/stage_3.jpg): Feature extraction — Canny edge detection or thresholding, contour detection\n"
        "  Stage 4 (/app/data/stage_4.jpg): Final result visualization — for digit recognition: a bar chart of prediction confidence per digit (0-9); for OCR: the image with detected text overlaid; for edge exploration: a colored feature map overlay\n"
        "- Also save the usual /app/data/output.jpg (can be a copy of stage_4.jpg)\n"
        "- Print the final prediction result to stdout as a JSON object with keys: 'prediction' (the predicted value), 'confidence' (0-100), 'stage_descriptions' (list of 4 strings describing each stage)\n"
        "- Use OpenCV (cv2) for image processing and matplotlib for any charts\n"
        "- For digit recognition scenarios: use sklearn MLPClassifier or similar with load_digits() for training, then predict the drawn input\n"
        "Use clear variable names suitable for a 12-14 year old. "
        "CRITICAL: Use plt.style.use('dark_background'). Use bright neon colors (cyan '#00f0ff', magenta '#ff00ff', green '#00ff88'). "
        "Do not use plt.show(). Save all figures with plt.savefig(..., bbox_inches='tight', dpi=100)."
    ),
}

_EXPLANATION_SYSTEM = (
    "You are a friendly AI tutor explaining machine learning results to a middle-school "
    "student aged 12-14 who is learning about AI for the first time. "
    "You MUST return a JSON object with exactly these 5 string keys: "
    "\"chefs_choice\", \"healthy_snacks\", \"guessing_game\", \"tricky_test\", and \"fix_it_mode\". "
    "Each key should contain a short (2-3 sentences max) engaging explanation for the following concepts:\n"
    "- chefs_choice: Why did we pick this specific robot brain? (Model selection)\n"
    "- healthy_snacks: What did we just feed our AI? (Data quality)\n"
    "- guessing_game: Is our AI a Genius, a Guesser, or just Confused? (Model Evaluation/Confidence based on stdout)\n"
    "- tricky_test: Can you trick the AI with a curveball? (Mention they can make their own tricky data in the Data Lab!)\n"
    "- fix_it_mode: How can we make this AI even smarter next time?\n"
    "Respond ONLY with valid JSON. Do not include markdown code blocks."
)


_DEPLOYMENT = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")


def _get_client() -> openai.AzureOpenAI:
    """Return an Azure OpenAI client configured from environment variables."""
    return openai.AzureOpenAI(
        azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", ""),
        api_key=os.environ.get("AZURE_OPENAI_API_KEY", ""),
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
    )


def generate_code(
    model_type: str,
    scenario_title: str,
    variant_label: str,
    student_prompt: str = '',
    data_columns: str = '',
) -> str:
    """
    Generate a Python script for the sandbox.
    """
    system_ctx = _SYSTEM_CONTEXT.get(model_type, _SYSTEM_CONTEXT['REGRESSION'])

    user_message = (
        f"Scenario: {scenario_title}\n"
        f"Data variant: {variant_label}\n"
    )
    if data_columns:
        user_message += f"Available columns in input.csv: {data_columns}\n"
    if student_prompt:
        user_message += f"Student's additional instruction: {student_prompt}\n"

    # Create a unique hash based on all inputs
    cache_string = f"code_v3_{model_type}_{scenario_title}_{variant_label}_{student_prompt}_{data_columns}"
    cache_key = hashlib.md5(cache_string.encode('utf-8')).hexdigest()
    
    # Check cache first
    cached_code = cache.get(cache_key)
    if cached_code:
        logger.info(f"⚡ CACHE HIT: Returning cached code for '{scenario_title}' ({variant_label})")
        return cached_code

    try:
        logger.info(f"⏳ CACHE MISS: Generating code via LLM for '{scenario_title}'...")
        client = _get_client()
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_ctx},
                {"role": "user", "content": user_message}
            ]
        )
        code = response.choices[0].message.content.strip()

        if code.startswith('```python'):
            code = code[9:]
        if code.startswith('```'):
            code = code[3:]
        if code.endswith('```'):
            code = code[:-3]

        code = code.strip()
        # Save to cache for 30 days
        cache.set(cache_key, code, timeout=60*60*24*30)
        return code
    except Exception as e:
        logger.exception(f'[llm] generate_code failed: {e}')
        raise


def generate_explanation(
    model_type: str,
    scenario_title: str,
    variant_label: str,
    stdout: str,
) -> str:
    """
    Generate a student-friendly explanation of the experiment output as JSON.
    """
    user_message = (
        f"Scenario: {scenario_title}\n"
        f"Data variant: {variant_label}\n"
        f"Model type: {model_type}\n"
        f"Console output from the experiment:\n{stdout[:1000]}\n\n"
        "Explain what these results mean, strictly returning JSON."
    )

    # Create a unique hash for the explanation based on inputs + stdout
    cache_string = f"expl_{model_type}_{scenario_title}_{variant_label}_{stdout[:1000]}"
    cache_key = hashlib.md5(cache_string.encode('utf-8')).hexdigest()
    
    # Check cache first
    cached_explanation = cache.get(cache_key)
    if cached_explanation:
        logger.info(f"⚡ CACHE HIT: Returning cached explanation for '{scenario_title}'")
        return cached_explanation

    try:
        logger.info(f"⏳ CACHE MISS: Generating explanation via LLM for '{scenario_title}'...")
        client = _get_client()
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _EXPLANATION_SYSTEM},
                {"role": "user", "content": user_message}
            ]
        )
        explanation = response.choices[0].message.content.strip()
        # Save to cache for 30 days
        cache.set(cache_key, explanation, timeout=60*60*24*30)
        return explanation
    except Exception as e:
        logger.exception(f'[llm] generate_explanation failed: {e}')
        return '{"chefs_choice": "Error generating explanation", "healthy_snacks": "", "guessing_game": "", "tricky_test": "", "fix_it_mode": ""}'


_GRADING_SYSTEM = (
    "You are a kind but fair teacher grading a Class 6-8 student's AI assignment. "
    "Return ONLY a JSON object with two keys: \"score\" (an integer) and \"feedback\" "
    "(a warm, specific 2-3 sentence note). Grade strictly against the rubric, never "
    "exceed the maximum score, reward genuine effort and clear thinking, and gently "
    "point out one thing to improve. Keep the language simple for a 12-14 year old."
)


def grade_submission(*, title: str, question: str, rubric: str, max_points: int,
                     student_answer: str, module_key: str = '') -> tuple:
    """
    LLM-grade a free-text task/submission. Returns (score:int|None, feedback:str).
    Returns (None, '') on failure so the caller can leave it for manual grading.
    """
    if not (student_answer or '').strip():
        return 0, "Nothing was submitted yet — write your answer and submit again."

    rubric_text = rubric or "Reward correctness, a clear explanation in the student's own words, and age-appropriate effort."
    user_message = (
        f"Assignment: {title}\n"
        f"Module: {module_key}\n"
        f"Task / question: {question}\n"
        f"Rubric: {rubric_text}\n"
        f"Maximum score: {max_points}\n\n"
        f"Student's answer:\n{(student_answer or '')[:4000]}\n\n"
        f"Grade this from 0 to {max_points} and give feedback."
    )
    try:
        import json
        client = _get_client()
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _GRADING_SYSTEM},
                {"role": "user", "content": user_message},
            ],
        )
        data = json.loads(response.choices[0].message.content)
        score = int(round(float(data.get("score", 0))))
        score = max(0, min(int(max_points), score))
        feedback = str(data.get("feedback", "")).strip()
        return score, feedback
    except Exception as e:
        logger.exception(f'[llm] grade_submission failed: {e}')
        return None, ""


_PLANNER_SYSTEM = (
    "You are an expert CBSE (Classes 6-8) AI-curriculum teacher helping an instructor "
    "design a homework assignment. Return ONLY a JSON object with one key \"options\", "
    "whose value is a list of 2 or 3 assignment options. Each option is an object with:\n"
    "- \"title\": a short assignment title\n"
    "- \"kind\": either \"quiz\" or \"task\"\n"
    "- \"description\": for a task, the full question/prompt the student answers; for a "
    "quiz, a one-line instruction\n"
    "- \"rubric\": (task only) 1-2 sentences on how to grade it fairly\n"
    "- \"questions\": (quiz only) a list of 3-4 objects, each {\"q\": str, "
    "\"options\": [4 strings], \"answer\": <0-based index of the correct option>}\n"
    "Keep everything age-appropriate for a 12-14 year old, concrete, and tied to the "
    "given module. Use simple language and Indian real-world examples where natural. "
    "Respond ONLY with valid JSON — no markdown."
)

_MODULE_LABEL = {
    'foundations': 'What is AI / Foundations',
    'data': 'Working with Data & Analysis',
    'regression': 'Linear Regression (predicting a number)',
    'classification': 'Classification (sorting into groups)',
    'neural': 'Neural Networks',
    'vision': 'Computer Vision',
    'agentic': 'Agentic AI / AI agents & pipelines',
    'ethics': 'Responsible AI / Ethics',
}


def plan_assignments(module_key: str, sub_type: str = '', kind: str = 'task', notes: str = '') -> list:
    """Generate 2-3 assignment options for an instructor. Returns a list of option
    dicts (see _PLANNER_SYSTEM). Returns [] on failure so the caller can 400."""
    import json
    module_label = _MODULE_LABEL.get(module_key, module_key or 'AI basics')
    kind_pref = 'multiple-choice quizzes' if kind == 'quiz' else 'short written tasks'
    user_message = (
        f"Module: {module_label}\n"
        f"Focus area / submodule: {sub_type or 'the whole module'}\n"
        f"Preferred kind: {kind} (design {kind_pref})\n"
        f"Instructor notes: {notes or '(none)'}\n\n"
        f"Design 2-3 distinct assignment options."
    )
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _PLANNER_SYSTEM},
                {"role": "user", "content": user_message},
            ],
        )
        data = json.loads(response.choices[0].message.content)
        options = data.get("options", []) if isinstance(data, dict) else []
        return options if isinstance(options, list) else []
    except Exception as e:
        logger.exception(f'[llm] plan_assignments failed: {e}')
        return []


_NODE_GUIDE = {
    'textInput': 'Text Input — provides raw text to the pipeline',
    'documentReader': 'Document Reader — reads an uploaded document',
    'visionScanner': 'Vision Scanner — reads/analyses an image',
    'customizer': 'Customizer — a custom LLM instruction/prompt step',
    'summarizer': 'Summarizer — condenses text to key points',
    'sentimentRadar': 'Sentiment Analyzer — scores tone (positive/negative)',
    'webSearch': 'Web Search — looks facts up on the web',
    'decider': 'Decider — branches the flow based on a condition',
    'merger': 'Merger — combines results from multiple branches',
    'display': 'Display — shows the final output',
    'chartGenerator': 'Chart Generator — turns data into a chart',
}

_AGENT_EVAL_SYSTEM = (
    "You are a kind but fair teacher evaluating a Class 6-8 student's AI AGENT PIPELINE "
    "(a node-and-arrow flow they built in a visual studio). Judge whether the pipeline is a "
    "sensible design that solves the given problem: are the right kinds of nodes present, "
    "connected in a logical order from an input, through processing, to an output? Reward "
    "correct structure and thoughtful choices; it does NOT need to be perfect. "
    "Return ONLY a JSON object with two keys: \"score\" (an integer 0..max) and \"feedback\" "
    "(a warm, specific 2-4 sentence note that names what they got right and ONE concrete way "
    "to improve the flow). Keep language simple for a 12-14 year old."
)


def evaluate_agent_pipeline(*, title: str, problem: str, rubric: str, max_points: int, graph_json: str) -> tuple:
    """LLM-evaluate a student's agent pipeline (nodes+edges JSON). Returns
    (score:int|None, feedback:str). (None, '') on failure → left for manual grading."""
    import json
    try:
        graph = json.loads(graph_json) if graph_json else {}
    except (ValueError, TypeError):
        graph = {}
    nodes = graph.get('nodes', []) if isinstance(graph, dict) else []
    edges = graph.get('edges', []) if isinstance(graph, dict) else []

    if not nodes:
        return 0, "Your pipeline is empty — drag in some nodes, connect them, then submit again."

    # Serialise the graph into something the LLM can reason about.
    label_by_id = {}
    node_lines = []
    for n in nodes:
        nid = n.get('id', '?')
        ntype = n.get('type', 'unknown')
        label = (n.get('data') or {}).get('label', '')
        label_by_id[nid] = label or ntype
        desc = _NODE_GUIDE.get(ntype, ntype)
        node_lines.append(f"- {nid}: {desc}" + (f' (labelled "{label}")' if label else ''))
    edge_lines = [f"- {label_by_id.get(e.get('source'), e.get('source'))} → "
                  f"{label_by_id.get(e.get('target'), e.get('target'))}" for e in edges]

    rubric_text = rubric or ("Reward a clear input node, sensible processing steps in a logical "
                             "order, and an output/display node, all correctly connected.")
    user_message = (
        f"Assignment: {title}\n"
        f"Problem to solve: {problem}\n"
        f"What a good pipeline looks like: {rubric_text}\n"
        f"Maximum score: {max_points}\n\n"
        f"The student built these nodes:\n" + "\n".join(node_lines) + "\n\n"
        f"Connected like this:\n" + ("\n".join(edge_lines) if edge_lines else "(no connections made)") + "\n\n"
        f"Evaluate the pipeline from 0 to {max_points} and give feedback."
    )
    try:
        client = _get_client()
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _AGENT_EVAL_SYSTEM},
                {"role": "user", "content": user_message},
            ],
        )
        data = json.loads(response.choices[0].message.content)
        score = int(round(float(data.get("score", 0))))
        score = max(0, min(int(max_points), score))
        feedback = str(data.get("feedback", "")).strip()
        return score, feedback
    except Exception as e:
        logger.exception(f'[llm] evaluate_agent_pipeline failed: {e}')
        return None, ""


def extract_csv_from_unstructured_data(scenario_title: str, file_type: str, base64_content: str) -> str:
    """
    Uses the Vision/Language LLM to extract a structured CSV from an uploaded Image/Doc/PDF.
    """
    system_prompt = (
        f"You are an AI data extractor. You need to extract structured tabular data from the provided image/document "
        f"for a machine learning scenario titled '{scenario_title}'. "
        f"Return ONLY valid CSV text. Do not use markdown blocks like ```csv. "
        f"Include headers on the first row. Guess the most appropriate features based on the scenario."
    )
    
    try:
        client = _get_client()
        # Create message content depending on whether it's an image
        if file_type.startswith('image/'):
            content = [
                {"type": "text", "text": "Extract tabular data from this image and return it as CSV."},
                {"type": "image_url", "image_url": {"url": f"data:{file_type};base64,{base64_content}"}}
            ]
        else:
            # If it's a PDF/Doc that was converted to base64, we might not be able to read it with vision API directly 
            # if it's just raw bytes. For now, assume it's text or image-based text.
            content = "Please extract the CSV data."
            
        response = client.chat.completions.create(
            model=_DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content}
            ]
        )
        csv_text = response.choices[0].message.content.strip()
        if csv_text.startswith('```csv'):
            csv_text = csv_text[6:]
        if csv_text.startswith('```'):
            csv_text = csv_text[3:]
        if csv_text.endswith('```'):
            csv_text = csv_text[:-3]
        return csv_text.strip()
    except Exception as e:
        logger.exception(f'[llm] extract_csv failed: {e}')
        raise ValueError("Failed to extract data from the uploaded file.")
