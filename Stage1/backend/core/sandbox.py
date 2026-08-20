"""
core/sandbox.py

Shared execution engine used by all four model apps:
  - regression
  - classification
  - neural_network
  - computer_vision

Backend: **Azure Container Apps Dynamic Sessions** — a managed, Hyper-V-isolated
serverless sandbox. This replaces the old local `docker run` engine so the app can
run on any Azure compute (VM, Container Apps) without a Docker daemon or host-path
volume mounts.

The public function `run_in_sandbox()` keeps the exact same signature and return
shape as before, so the four app executors need no changes.

────────────────────────────────────────────────────────────────────────────────
Environment variables
  AZURE_SESSION_POOL_ENDPOINT
      Pool-management endpoint of your Dynamic Sessions pool, e.g.
      https://<region>.dynamicsessions.io/subscriptions/<sub>/resourceGroups/<rg>/sessionPools/<pool>
  AZURE_SESSION_POOL_ENDPOINT__<IMAGE>   (optional, per-image override)
      Lets you route a specific sandbox_image (e.g. 'cv-sandbox') to a dedicated
      custom-container pool, while everything else uses the default code-interpreter
      pool. '<IMAGE>' is the image name upper-cased with '-' -> '_'.
      e.g. AZURE_SESSION_POOL_ENDPOINT__CV_SANDBOX=https://...

Authentication
  Uses azure-identity DefaultAzureCredential:
    · In Azure  -> the Container App / VM managed identity (assign it the
      "Azure ContainerApps Session Executor" role on the pool).
    · Locally   -> `az login`, or AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID.

Dependencies (add to requirements.txt):  azure-identity   (requests is already present)

NOTE: The Dynamic Sessions REST surface is still in preview. The API version and
paths below are centralised as constants — verify them against the current Azure
docs if a call 404s, and adjust in one place.
────────────────────────────────────────────────────────────────────────────────
"""

import os
import uuid
import base64
import logging

import requests
from azure.identity import DefaultAzureCredential

logger = logging.getLogger(__name__)

# ─── Dynamic Sessions configuration ──────────────────────────────────────────
API_VERSION = "2024-02-02-preview"
TOKEN_SCOPE = "https://dynamicsessions.io/.default"
DEFAULT_POOL_ENDPOINT = os.environ.get("AZURE_SESSION_POOL_ENDPOINT", "").rstrip("/")

# Output files the generated scripts may write into the session working dir.
# We fetch each one back (if present) and return it base64-encoded.
_OUTPUT_IMAGE = "output.jpg"
_MODEL_FILE = "model.pkl"
_STAGE_FILES = [f"stage_{i}.jpg" for i in range(1, 5)]

# Session working directory inside a Dynamic Session (code interpreter mounts here).
_SESSION_DIR = "/mnt/data"

# Cached credential — token fetch is cheap after the first call.
_credential = None


def _get_token() -> str:
    global _credential
    if _credential is None:
        _credential = DefaultAzureCredential()
    return _credential.get_token(TOKEN_SCOPE).token


def _auth_headers() -> dict:
    return {"Authorization": f"Bearer {_get_token()}"}


def _pool_endpoint(sandbox_image: str) -> str:
    """
    Pick the pool endpoint for a given image. A per-image override lets Computer
    Vision (OpenCV/YOLO) use a dedicated custom-container pool while regression /
    classification / neural_network share the default code-interpreter pool.
    """
    key = "AZURE_SESSION_POOL_ENDPOINT__" + sandbox_image.upper().replace("-", "_")
    return (os.environ.get(key) or DEFAULT_POOL_ENDPOINT).rstrip("/")


def _upload_file(endpoint: str, session_id: str, filename: str, content: bytes) -> None:
    url = f"{endpoint}/files/upload?api-version={API_VERSION}&identifier={session_id}"
    resp = requests.post(
        url,
        headers=_auth_headers(),
        files={"file": (filename, content)},
        timeout=30,
    )
    resp.raise_for_status()


def _execute_code(endpoint: str, session_id: str, code: str, timeout: int) -> dict:
    """Run code synchronously in the session. Returns parsed stdout/stderr/status."""
    url = f"{endpoint}/code/execute?api-version={API_VERSION}&identifier={session_id}"
    body = {
        "properties": {
            "codeInputType": "inline",
            "executionType": "synchronous",
            "code": code,
        }
    }
    resp = requests.post(url, headers=_auth_headers(), json=body, timeout=timeout + 15)
    resp.raise_for_status()
    # Response shape has evolved across preview versions; read defensively.
    data = resp.json()
    props = data.get("properties", data)
    return {
        "stdout": props.get("stdout") or props.get("result") or "",
        "stderr": props.get("stderr") or "",
        "status": (props.get("status") or "").lower(),
    }


def _download_file(endpoint: str, session_id: str, filename: str) -> bytes | None:
    """Fetch an output file from the session, or None if it wasn't produced."""
    url = f"{endpoint}/files/content/{filename}?api-version={API_VERSION}&identifier={session_id}"
    resp = requests.get(url, headers=_auth_headers(), timeout=30)
    if resp.status_code == 200:
        return resp.content
    return None


def run_in_sandbox(
    sandbox_image: str,
    script_code: str,
    input_files: dict[str, bytes],
    timeout: int = 45,
) -> dict:
    """
    Execute a Python script inside an isolated Azure Dynamic Session.

    Args:
        sandbox_image:  Logical image/pool selector (e.g. 'regression-sandbox').
                        Routes to a per-image pool if configured, else the default.
        script_code:    The Python source to execute.
        input_files:    {filename: bytes} placed in the session working dir
                        (e.g. {'input.csv': b'day,rides\\n1,10\\n'}).
        timeout:        Soft max seconds for the execution call.

    Returns (unchanged shape):
        {
            'stdout':        str,
            'stderr':        str,
            'output_image':  str | None,   # base64 output.jpg if written
            'model_b64':     str | None,   # base64 model.pkl if written
            'stage_images':  list[str],    # base64 stage_1..4.jpg for CV pipelines
            'success':       bool,
        }
    """
    endpoint = _pool_endpoint(sandbox_image)
    if not endpoint:
        msg = "AZURE_SESSION_POOL_ENDPOINT is not configured."
        logger.error(f"[sandbox] {msg}")
        return {"stdout": "", "stderr": msg, "output_image": None,
                "model_b64": None, "stage_images": [], "success": False}

    session_id = str(uuid.uuid4())
    logger.info(f"[sandbox] Dynamic Session {session_id} | image={sandbox_image}")

    # Generated scripts historically used the old '/app/data' mount path; Dynamic
    # Sessions mount at /mnt/data. Rewrite so existing executors work unchanged.
    code = script_code.replace("/app/data", _SESSION_DIR)

    try:
        # 1. Upload all input files into the session working dir.
        for filename, content in input_files.items():
            _upload_file(endpoint, session_id, filename, content)

        # 2. Run the student's script (cwd is the session working dir).
        result = _execute_code(endpoint, session_id, code, timeout)
        success = result["status"] in ("success", "succeeded", "") and not result["stderr"]

        # 3. Collect any output artifacts the script wrote.
        output_image_b64 = None
        img = _download_file(endpoint, session_id, _OUTPUT_IMAGE)
        if img:
            output_image_b64 = base64.b64encode(img).decode("utf-8")

        model_pkl_b64 = None
        pkl = _download_file(endpoint, session_id, _MODEL_FILE)
        if pkl:
            model_pkl_b64 = base64.b64encode(pkl).decode("utf-8")

        stage_images = []
        for stage_name in _STAGE_FILES:
            stage = _download_file(endpoint, session_id, stage_name)
            if stage:
                stage_images.append(base64.b64encode(stage).decode("utf-8"))

        if not success:
            logger.warning(f"[sandbox] Session {session_id} reported failure\n{result['stderr'][:500]}")

        return {
            "stdout": result["stdout"],
            "stderr": result["stderr"],
            "output_image": output_image_b64,
            "model_b64": model_pkl_b64,
            "stage_images": stage_images,
            "success": success,
        }

    except requests.HTTPError as e:
        detail = e.response.text[:500] if e.response is not None else str(e)
        logger.error(f"[sandbox] HTTP error | session={session_id} | {detail}")
        return {"stdout": "", "stderr": f"Sandbox API error: {detail}",
                "output_image": None, "model_b64": None, "stage_images": [], "success": False}
    except Exception as e:
        logger.exception(f"[sandbox] Unexpected error | session={session_id}")
        return {"stdout": "", "stderr": str(e),
                "output_image": None, "model_b64": None, "stage_images": [], "success": False}
