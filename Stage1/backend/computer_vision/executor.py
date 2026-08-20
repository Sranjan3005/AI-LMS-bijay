"""
computer_vision/executor.py

Orchestrates a full Computer Vision experiment:
  1. Decode the input image (from canvas drawing or sample)
  2. Generate Python code via Gemini (with COMPUTER_VISION context)
  3. Run in Docker sandbox (cv-sandbox image with OpenCV)
  4. Collect 4 pipeline stage images from sandbox output
  5. Generate student-friendly explanation
  6. Save CVExperiment record to DB
  7. Return result dict with pipeline stages

Called by computer_vision/views.py — views stay thin.
"""

import base64
import logging
from scenarios.models import Scenario, DataVariant
from core.sandbox import run_in_sandbox
from core import llm
from .models import CVExperiment
from .dataset_generators import get_sample_image, get_stage_metadata

logger = logging.getLogger(__name__)

SANDBOX_IMAGE = 'cv-sandbox'


def run_experiment(
    student,
    scenario_id: str,
    variant_name: str,
    input_image_b64: str = '',
    student_prompt: str = '',
) -> dict:
    """
    Run a CV experiment end-to-end.

    Args:
        student:          Authenticated Student instance.
        scenario_id:      UUID of the Scenario.
        variant_name:     e.g. 'clean'.
        input_image_b64:  Base64-encoded PNG from the drawing canvas.
        student_prompt:   Optional extra instruction from student.

    Returns:
        {
            'experiment_id': int,
            'generated_code': str,
            'stdout': str,
            'stderr': str,
            'output_image': str | None,
            'stage_images': list[str],      # base64-encoded stage images
            'stage_metadata': list[dict],   # title + description per stage
            'prediction': str,
            'explanation': str,
            'success': bool,
        }
    """
    # ── 1. Load scenario + variant metadata from DB ────────────────────────
    try:
        scenario = Scenario.objects.get(id=scenario_id, model_type='COMPUTER_VISION')
    except Scenario.DoesNotExist:
        raise ValueError(f'Computer Vision scenario {scenario_id} not found.')

    try:
        variant = DataVariant.objects.get(scenario=scenario, name=variant_name)
    except DataVariant.DoesNotExist:
        raise ValueError(f'Variant "{variant_name}" not found for scenario "{scenario.title}".')

    # ── 2. Get input image bytes ───────────────────────────────────────────
    if input_image_b64:
        # Student drew something on the canvas
        # Strip data URL prefix if present
        if ',' in input_image_b64:
            input_image_b64 = input_image_b64.split(',', 1)[1]
        image_bytes = base64.b64decode(input_image_b64)
        data_source = 'DRAWN'
    else:
        # Use a pre-loaded sample image
        image_bytes = get_sample_image(scenario.title, variant_name)
        data_source = 'PRELOADED'

    # ── 3. Generate Python code via Gemini ────────────────────────────────
    try:
        code = llm.generate_code(
            model_type='COMPUTER_VISION',
            scenario_title=scenario.title,
            variant_label=variant.label,
            student_prompt=student_prompt,
        )
    except Exception as e:
        logger.error(f'[cv executor] LLM code generation failed: {e}')
        raise

    # ── 4. Run in Docker sandbox ──────────────────────────────────────────
    sandbox_result = run_in_sandbox(
        sandbox_image=SANDBOX_IMAGE,
        script_code=code,
        input_files={'input.png': image_bytes},
        timeout=60,
    )

    # ── 5. Collect stage images + prediction from stdout ──────────────────
    stage_images = sandbox_result.get('stage_images', [])
    prediction = ''
    if sandbox_result['success'] and sandbox_result['stdout']:
        # Try to parse JSON prediction from stdout
        import json
        try:
            stdout_data = json.loads(sandbox_result['stdout'].strip().split('\n')[-1])
            prediction = str(stdout_data.get('prediction', ''))
        except (json.JSONDecodeError, IndexError):
            prediction = sandbox_result['stdout'].strip()[:200]

    # ── 6. Generate explanation ───────────────────────────────────────────
    explanation = ''
    if sandbox_result['success']:
        try:
            explanation = llm.generate_explanation(
                model_type='COMPUTER_VISION',
                scenario_title=scenario.title,
                variant_label=variant.label,
                stdout=sandbox_result['stdout'],
            )
        except Exception as e:
            logger.warning(f'[cv executor] Explanation generation failed: {e}')
            explanation = 'The computer vision pipeline completed successfully!'

    # ── 7. Save experiment record to DB ──────────────────────────────────
    experiment = CVExperiment.objects.create(
        student        = student,
        scenario       = scenario,
        variant_name   = variant_name,
        variant_label  = variant.label,
        student_prompt = student_prompt,
        generated_code = code,
        stdout_log     = sandbox_result['stdout'],
        stderr_log     = sandbox_result['stderr'],
        stage_images   = stage_images,
        output_image   = sandbox_result['output_image'] or '',
        prediction     = prediction,
        explanation    = explanation,
        data_source    = data_source,
        status         = 'SUCCESS' if sandbox_result['success'] else 'FAILED',
    )

    # Get stage metadata (titles + descriptions)
    stage_metadata = get_stage_metadata(scenario.title)

    return {
        'experiment_id':  experiment.id,
        'generated_code': code,
        'stdout':         sandbox_result['stdout'],
        'stderr':         sandbox_result['stderr'],
        'output_image':   sandbox_result['output_image'],
        'stage_images':   stage_images,
        'stage_metadata': stage_metadata,
        'prediction':     prediction,
        'explanation':    explanation,
        'success':        sandbox_result['success'],
    }
