"""
regression/executor.py

Orchestrates a full regression experiment:
  1. Get the dataset (from generator or student upload)
  2. Generate Python code via Gemini
  3. Run in Docker sandbox
  4. Generate student-friendly explanation
  5. Save RegressionExperiment record to DB
  6. Return result dict

Called by regression/views.py — views stay thin.
"""

import logging
from scenarios.models import Scenario, DataVariant
from core.sandbox import run_in_sandbox
from core import llm
from .models import RegressionExperiment
from .dataset_generators import get_dataset

logger = logging.getLogger(__name__)

SANDBOX_IMAGE = 'regression-sandbox'


def run_experiment(
    student,
    scenario_id: str,
    variant_name: str,
    student_prompt: str = '',
    uploaded_csv_bytes: bytes | None = None,
) -> dict:
    """
    Run a regression experiment end-to-end.

    Args:
        student:            Authenticated Student instance.
        scenario_id:        UUID of the Scenario.
        variant_name:       e.g. 'messy'.
        student_prompt:     Optional extra instruction from student.
        uploaded_csv_bytes: If provided, use this instead of the generator (Stage 2).

    Returns:
        {
            'experiment_id': int,
            'generated_code': str,
            'stdout': str,
            'stderr': str,
            'output_image': str | None,   # base64
            'explanation': str,
            'success': bool,
        }
    """
    # ── 1. Load scenario + variant metadata from DB ────────────────────────
    try:
        scenario = Scenario.objects.get(id=scenario_id, model_type='REGRESSION')
    except Scenario.DoesNotExist:
        raise ValueError(f'Regression scenario {scenario_id} not found.')

    try:
        variant = DataVariant.objects.get(scenario=scenario, name=variant_name)
    except DataVariant.DoesNotExist:
        raise ValueError(f'Variant "{variant_name}" not found for scenario "{scenario.title}".')

    # ── 2. Get dataset CSV bytes ───────────────────────────────────────────
    if uploaded_csv_bytes:
        csv_bytes  = uploaded_csv_bytes
        data_source = 'UPLOAD'
    else:
        csv_bytes  = get_dataset(scenario.title, variant_name)
        data_source = 'PRELOADED'

    # ── 3. Generate Python code via Gemini ────────────────────────────────
    try:
        import pandas as pd
        import io
        df_preview = pd.read_csv(io.BytesIO(csv_bytes), nrows=0)
        data_columns = ", ".join(df_preview.columns.tolist())
        
        code = llm.generate_code(
            model_type='REGRESSION',
            scenario_title=scenario.title,
            variant_label=variant.label,
            student_prompt=student_prompt,
            data_columns=data_columns,
        )
    except Exception as e:
        logger.error(f'[regression executor] LLM code generation failed: {e}')
        raise

    # ── 4. Run in Docker sandbox ──────────────────────────────────────────
    sandbox_result = run_in_sandbox(
        sandbox_image=SANDBOX_IMAGE,
        script_code=code,
        input_files={'input.csv': csv_bytes},
        timeout=45,
    )

    # ── 5. Generate explanation ───────────────────────────────────────────
    explanation = ''
    if sandbox_result['success']:
        try:
            explanation = llm.generate_explanation(
                model_type='REGRESSION',
                scenario_title=scenario.title,
                variant_label=variant.label,
                stdout=sandbox_result['stdout'],
            )
        except Exception as e:
            logger.warning(f'[regression executor] Explanation generation failed: {e}')
            explanation = 'The experiment ran successfully! Check the graph and console output.'

    # ── 6. Save experiment record to DB ──────────────────────────────────
    experiment = RegressionExperiment.objects.create(
        student        = student,
        scenario       = scenario,
        variant_name   = variant_name,
        variant_label  = variant.label,
        student_prompt = student_prompt,
        generated_code = code,
        stdout_log     = sandbox_result['stdout'],
        stderr_log     = sandbox_result['stderr'],
        output_image   = sandbox_result['output_image'] or '',
        model_b64      = sandbox_result.get('model_b64') or '',
        explanation    = explanation,
        data_source    = data_source,
        status         = 'SUCCESS' if sandbox_result['success'] else 'FAILED',
    )

    return {
        'experiment_id':  experiment.id,
        'generated_code': code,
        'stdout':         sandbox_result['stdout'],
        'stderr':         sandbox_result['stderr'],
        'output_image':   sandbox_result['output_image'],
        'explanation':    explanation,
        'success':        sandbox_result['success'],
    }
