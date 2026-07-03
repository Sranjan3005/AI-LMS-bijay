"""
core/sandbox.py

Shared Docker execution engine used by all three model apps:
  - regression
  - classification
  - neural_network

Each app's executor.py calls run_in_sandbox() and never touches Docker directly.
This makes it trivial in Stage 3 to swap Docker for a Celery task without
touching app-level code.
"""

import os
import uuid
import base64
import shutil
import subprocess
import tempfile
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Where temp run directories are created on the host machine.
# Each run gets its own uuid-named subdirectory, cleaned up after execution.
RUNS_BASE_DIR = Path(__file__).resolve().parent.parent / 'runs'


def run_in_sandbox(
    sandbox_image: str,
    script_code: str,
    input_files: dict[str, bytes],
    timeout: int = 45,
) -> dict:
    """
    Execute a Python script inside an isolated Docker container.

    Args:
        sandbox_image:  Docker image name (e.g. 'regression-sandbox').
        script_code:    The Python source code to execute.
        input_files:    Dict of {filename: bytes} to place in /app/data/ inside
                        the container. e.g. {'input.csv': b'day,rides\\n1,10\\n'}
        timeout:        Max seconds before the container is killed.

    Returns:
        {
            'stdout':       str,
            'stderr':       str,
            'output_image': str | None,   # base64-encoded output.jpg if present
            'success':      bool,
        }
    """
    RUNS_BASE_DIR.mkdir(parents=True, exist_ok=True)
    run_id = str(uuid.uuid4())
    run_dir = RUNS_BASE_DIR / run_id
    run_dir.mkdir(parents=True)

    try:
        # Write the generated Python script
        script_path = run_dir / 'script.py'
        script_path.write_text(script_code, encoding='utf-8')

        # Write all input files (CSV, images, etc.)
        for filename, content in input_files.items():
            (run_dir / filename).write_bytes(content)

        docker_cmd = [
            'docker', 'run', '--rm',
            '--cpus', '1.0',
            '--memory', '512m',
            '--network', 'none',          # No internet access inside sandbox
            '--read-only',                # Filesystem is read-only except /app/data
            '--tmpfs', '/tmp',            # Allow /tmp writes
            '-v', f'{run_dir.as_posix()}:/app/data',
            sandbox_image,
            'python', '/app/data/script.py',
        ]

        logger.info(f'[sandbox] Running {sandbox_image} | run_id={run_id}')

        result = subprocess.run(
            docker_cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

        # Read output image if the script saved one
        output_image_b64 = None
        output_path = run_dir / 'output.jpg'
        if output_path.exists():
            output_image_b64 = base64.b64encode(output_path.read_bytes()).decode('utf-8')

        # Read model.pkl if the script saved one
        model_pkl_b64 = None
        model_path = run_dir / 'model.pkl'
        if model_path.exists():
            model_pkl_b64 = base64.b64encode(model_path.read_bytes()).decode('utf-8')

        # Collect pipeline stage images (for Computer Vision scenarios)
        stage_images = []
        for i in range(1, 5):
            stage_path = run_dir / f'stage_{i}.jpg'
            if stage_path.exists():
                stage_images.append(
                    base64.b64encode(stage_path.read_bytes()).decode('utf-8')
                )

        success = result.returncode == 0

        if not success:
            logger.warning(f'[sandbox] Container exited with code {result.returncode}\n{result.stderr[:500]}')

        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'output_image': output_image_b64,
            'model_b64': model_pkl_b64,
            'stage_images': stage_images,
            'success': success,
        }

    except subprocess.TimeoutExpired:
        logger.error(f'[sandbox] Timeout after {timeout}s | run_id={run_id}')
        return {
            'stdout': '',
            'stderr': f'Execution timed out after {timeout} seconds.',
            'output_image': None,
            'success': False,
        }
    except Exception as e:
        logger.exception(f'[sandbox] Unexpected error | run_id={run_id}')
        return {
            'stdout': '',
            'stderr': str(e),
            'output_image': None,
            'success': False,
        }
    finally:
        # Always clean up the temp directory
        shutil.rmtree(run_dir, ignore_errors=True)
