"""classification/executor.py"""

import logging
from scenarios.models import Scenario, DataVariant
from core.sandbox import run_in_sandbox
from core import llm
from .models import ClassificationExperiment
from .dataset_generators import get_dataset

logger = logging.getLogger(__name__)
SANDBOX_IMAGE = 'classification-sandbox'


def run_experiment(student, scenario_id, variant_name, student_prompt='', uploaded_csv_bytes=None):
    try:
        scenario = Scenario.objects.get(id=scenario_id, model_type='CLASSIFICATION')
    except Scenario.DoesNotExist:
        raise ValueError(f'Classification scenario {scenario_id} not found.')

    try:
        variant = DataVariant.objects.get(scenario=scenario, name=variant_name)
    except DataVariant.DoesNotExist:
        raise ValueError(f'Variant "{variant_name}" not found for scenario "{scenario.title}".')

    if uploaded_csv_bytes:
        csv_bytes   = uploaded_csv_bytes
        data_source = 'UPLOAD'
    else:
        csv_bytes   = get_dataset(scenario.title, variant_name)
        data_source = 'PRELOADED'

    import pandas as pd
    import io
    df_preview = pd.read_csv(io.BytesIO(csv_bytes), nrows=0)
    data_columns = ", ".join(df_preview.columns.tolist())

    code = llm.generate_code(
        model_type='CLASSIFICATION',
        scenario_title=scenario.title,
        variant_label=variant.label,
        student_prompt=student_prompt,
        data_columns=data_columns,
    )

    sandbox_result = run_in_sandbox(
        sandbox_image=SANDBOX_IMAGE,
        script_code=code,
        input_files={'input.csv': csv_bytes},
        timeout=45,
    )

    explanation = ''
    if sandbox_result['success']:
        try:
            explanation = llm.generate_explanation(
                model_type='CLASSIFICATION',
                scenario_title=scenario.title,
                variant_label=variant.label,
                stdout=sandbox_result['stdout'],
            )
        except Exception as e:
            logger.warning(f'[classification executor] Explanation failed: {e}')
            explanation = 'The experiment ran! Check the confusion matrix and accuracy score.'

    experiment = ClassificationExperiment.objects.create(
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
