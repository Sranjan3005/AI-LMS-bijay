"""
env_check.py -- fail with an instruction, not a stack trace.

This module has no dependencies on purpose, so it can run in the very
environment it is diagnosing.

WHY IT EXISTS

There is more than one Python on this machine. The global 3.10 has no torch;
`Stage1/backend/venv` has torch, transformers and sklearn already. Whether
`python` means one or the other depends on which shell you opened, which is not
something anyone should have to know. Without this, picking the wrong one shows
up as a bare `ModuleNotFoundError: No module named 'torch'` forty lines into a
traceback, several seconds after the script has already printed a hopeful
"Backbone: ..." banner.

On Kaggle everything is present, so this never fires there.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

# Import name -> what to install it as, for the pip line we suggest.
REQUIRED = {
    "torch": "torch",
    "transformers": "transformers",
    "numpy": "numpy",
    "PIL": "pillow",
}
OPTIONAL = {"sklearn": "scikit-learn"}


def _candidate_interpreters():
    """Python executables on this machine that might already have the deps."""
    root = Path(__file__).resolve().parent.parent.parent  # repo root
    found = []
    for rel in ("Stage1/backend/venv/Scripts/python.exe",
                "Stage1/backend/venv/bin/python",
                "Fine-tuning/.venv/Scripts/python.exe",
                "Fine-tuning/.venv/bin/python"):
        p = root / rel
        if p.exists():
            found.append(p)
    return found


def missing(names) -> list[str]:
    import importlib.util
    return [n for n in names if importlib.util.find_spec(n) is None]


def preflight(need_sklearn: bool = False) -> None:
    """Exit with a usable message if anything required is absent."""
    wanted = dict(REQUIRED)
    if need_sklearn:
        wanted.update(OPTIONAL)

    gone = missing(wanted)
    if not gone:
        return

    print("\n" + "=" * 68)
    print("Missing Python packages: " + ", ".join(gone))
    print("=" * 68)
    print(f"\nRunning under: {sys.executable}")

    alts = _candidate_interpreters()
    if alts:
        print("\nThis project already has an environment with these installed.")
        print("Re-run with it directly -- note the quotes, the path has spaces:\n")
        script = Path(sys.argv[0]).name
        rest = " ".join(sys.argv[1:])
        print(f'  & "{alts[0]}" scripts/{script} {rest}'.rstrip())
        print("\n  (PowerShell needs the leading &. In Git Bash, drop it.)")
    else:
        pkgs = " ".join(sorted({wanted[n] for n in gone}))
        print(f"\nInstall them here:\n\n  {sys.executable} -m pip install {pkgs}")

    if shutil.which("nvidia-smi") is None:
        print("\nNote: no GPU detected either. That is fine for this pipeline --")
        print("ResNet-50 on CPU is about 40 ms an image, so a twelve-class domain")
        print("embeds in a few minutes. Only the full fine-tune grid needs a GPU.")
    print()
    sys.exit(1)
