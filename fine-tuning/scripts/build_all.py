"""
build_all.py -- the whole build pipeline, one command.

Written so the Kaggle notebook is three cells instead of twenty, but it runs
identically on a laptop. Every stage is resumable: the underlying scripts each
cache on a content hash, so re-running skips whatever is already current.

    export  build the ONNX both sides load     ~1 min    (once, ever)
    fetch   download the five domains          ~15 min   (network-bound)
    embed   CNN features + 6 augment variants  ~4 min GPU / ~45 min CPU
    heads   a real head at every data rung     ~1 min
    grid    the 15 full fine-tunes             ~2 h GPU  / ~24 h CPU

THE EXPORT STAGE RUNS ONCE AND THEN NEVER AGAIN

`export_backbone.py` turns microsoft/resnet-50 into
`public/models/resnet50/model.onnx`. Both this pipeline and the browser load
that exact file, which is what makes the precomputed heads trustworthy on live
photos. Once it exists it is a no-op, so leaving it in `--stage all` costs
nothing and forgetting it costs an afternoon of confusing failures.

WHY THIS MATTERS ON KAGGLE

Embedding is ~40 ms/image on this laptop's CPU and roughly 4 ms on a T4 -- a lot
cheaper than the ViT this replaced, which was ~226 ms on the same laptop. Five
domains x 2,400 images x 6 variants is 72,000 forward passes: about forty-five
minutes locally, a few minutes there. The outputs are small, so the sensible
split is still *compute remote, artefacts local*.

USAGE

    python scripts/build_all.py --stage all
    python scripts/build_all.py --stage embed heads --domains pets flowers
    python scripts/build_all.py --stage all --kaggle      # Kaggle paths + fp16
    python scripts/build_all.py --dry-run                 # print the plan only
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


HERE = Path(__file__).resolve().parent
ROOT = HERE.parent

# Printed on every run so a stale copy of the scripts identifies itself. Kaggle
# mounts datasets read-only and a notebook can easily keep pointing at an older
# version -- which looks exactly like "my fix did not work". Bump on every
# upload.
PIPELINE_VERSION = "2026-08-19.cnn.1"

# How each domain is sourced. `args` are appended to the fetch command.
DOMAINS = {
    "pets":        ("fetch_pets.py", []),
    "flowers":     ("fetch_flowers.py", []),
    "food":        ("fetch_food.py", []),
    "butterflies": ("fetch_gbif.py", ["--preset", "butterflies_in"]),
    # Kaggle's mushroom sets are far better populated than the GBIF API per
    # species. Needs the kaggle token; --mushroom-source gbif avoids that.
    "mushrooms":   ("fetch_kaggle.py", ["--dataset", "thehir0/mushroom-species",
                                        "--name", "mushrooms", "--top-classes", "12"]),
}

STAGES = ["export", "fetch", "embed", "heads", "grid"]


def run(cmd: list[str], label: str, allow_fail: bool = False) -> bool:
    print(f"\n{'=' * 70}\n{label}\n{'=' * 70}")
    print("  $ " + " ".join(str(c) for c in cmd) + "\n", flush=True)
    started = time.time()
    result = subprocess.run([sys.executable, *cmd], cwd=ROOT)
    mins = (time.time() - started) / 60
    if result.returncode != 0:
        msg = f"  !! {label} exited {result.returncode} after {mins:.1f} min"
        if allow_fail:
            print(f"{msg} -- continuing")
            return False
        print(f"{msg} -- stopping")
        sys.exit(result.returncode)
    print(f"  done in {mins:.1f} min")
    return True


def free_gb(path) -> float:
    return shutil.disk_usage(path).free / 1e9


def check_space(paths, need_gb: float = 3.0) -> bool:
    """Refuse to start a long stage with no room to write the result.

    The first Kaggle run embedded four domains -- about two hours of GPU -- and
    then failed on `mkdir` because a 9.45 GB archive had filled the disk. The
    compute was unrecoverable. A check that takes microseconds now guards it.
    """
    root = next((Path(p) for p in paths if Path(p).exists()),
                Path(paths[0]).parent if paths else Path("."))
    while not root.exists() and root != root.parent:
        root = root.parent
    free = free_gb(root)
    print(f"  disk free at {root}: {free:.1f} GB")
    if free < need_gb:
        print(f"\n  !! Only {free:.1f} GB free -- need at least {need_gb} GB.")
        print("     Largest offenders are usually cached archives:")
        print("       rm -rf /kaggle/working/.cache")
        return False
    return True


def describe_device():
    """What onnxruntime will actually use -- not what hardware exists.

    Asking torch whether CUDA is available answered the wrong question: the
    embedding stage runs on onnxruntime now, and onnxruntime falls back to CPU
    whenever its CUDA provider is not installed, regardless of what torch can
    see. Reporting "cuda" while the run crawls on CPU is exactly the failure
    this banner exists to prevent.
    """
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        if "CUDAExecutionProvider" in providers:
            return "cuda (onnxruntime CUDA provider)"
        return "cpu"
    except ImportError:
        return "unknown (onnxruntime not importable)"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--stage", nargs="+", default=["all"],
                    choices=[*STAGES, "all"])
    ap.add_argument("--domains", nargs="+", default=list(DOMAINS),
                    choices=list(DOMAINS))
    ap.add_argument("--per-class", type=int, default=120)
    ap.add_argument("--data", default=str(ROOT / "datasets"))
    ap.add_argument("--emb", default=str(ROOT / "public" / "embeddings"))
    ap.add_argument("--heads", default=str(ROOT / "public" / "heads"))
    ap.add_argument("--models", default=str(ROOT / "models" / "full"))
    ap.add_argument("--fp16", action="store_true", help="half-size grid weights")
    ap.add_argument("--kaggle", action="store_true",
                    help="write everything under /kaggle/working and imply --fp16")
    ap.add_argument("--mushroom-source", choices=["kaggle", "gbif"], default="kaggle")
    ap.add_argument("--keep-going", action="store_true",
                    help="a failed domain does not stop the run")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if args.kaggle:
        work = Path("/kaggle/working")
        args.data = str(work / "datasets")
        args.emb = str(work / "embeddings")
        args.heads = str(work / "heads")
        args.models = str(work / "models" / "full")
        args.fp16 = True

    stages = STAGES if "all" in args.stage else [s for s in STAGES if s in args.stage]

    print(f"Fine-Tuning module -- build pipeline (scripts {PIPELINE_VERSION})")
    dev = describe_device()
    print(f"  device   {dev}")
    if dev == "cpu" and "embed" in stages:
        print("           note: CPU embedding is ~40 ms/image -- roughly 45 min for")
        print("           all five domains. Workable locally; a GPU makes it minutes.")
    print(f"  stages   {', '.join(stages)}")
    print(f"  domains  {', '.join(args.domains)}")
    print(f"  data     {args.data}")
    print(f"  output   {args.emb}\n           {args.heads}\n           {args.models}")

    if args.dry_run:
        print("\n(dry run -- nothing executed)")
        return 0

    if not args.dry_run and not check_space([args.emb, args.data, "."]):
        return 1

    started = time.time()
    built = []

    # -- export --------------------------------------------------------------
    # Cheap and idempotent: export_backbone.py returns immediately if
    # model.onnx is already there. Everything downstream is meaningless without
    # it, so it is not allow_fail even under --keep-going.
    if "export" in stages:
        run([str(HERE / "export_backbone.py")], "EXPORT resnet-50 -> ONNX")

    # -- fetch ---------------------------------------------------------------
    if "fetch" in stages:
        for domain in args.domains:
            script, extra = DOMAINS[domain]
            if domain == "mushrooms" and args.mushroom_source == "gbif":
                script, extra = "fetch_gbif.py", ["--preset", "mushrooms"]
            cmd = [str(HERE / script), *extra,
                   "--per-class", str(args.per_class), "--out", args.data]
            # fetch_gbif/fetch_kaggle take --out as the datasets ROOT; the
            # others take it as the domain folder. Normalise here rather than
            # making every fetcher agree, which would churn four files.
            if script in ("fetch_pets.py", "fetch_flowers.py", "fetch_food.py"):
                cmd[-1] = str(Path(args.data) / domain)
            ok = run(cmd, f"FETCH  {domain}", allow_fail=args.keep_going)
            if ok:
                built.append(domain)
    else:
        built = list(args.domains)

    present = [d for d in built if (Path(args.data) / d).is_dir()]
    missing = [d for d in built if d not in present]

    # Nothing at all usually means the working directory was cleared -- a Kaggle
    # session restart wipes /kaggle/working unless the notebook was committed.
    # Reporting that as a quiet "note" and then exiting 0 makes a wasted run look
    # like a successful one.
    if not present and "fetch" not in stages:
        bar = "!" * 70
        print(f"\n{bar}")
        print("  NO DATASETS ON DISK.")
        print(f"  Looked in: {args.data}")
        print()
        print("  On Kaggle this almost always means the working directory was")
        print("  cleared -- a session restart wipes /kaggle/working unless the")
        print("  notebook has been committed with Save Version.")
        print()
        print("  Rebuild everything (about 30 minutes):")
        print("    build_all.py --kaggle --stage fetch embed heads --keep-going")
        print(bar)
        return 1

    if missing:
        print(f"\n  note: no data on disk for {', '.join(missing)} -- skipping downstream")

    # -- embed ---------------------------------------------------------------
    if "embed" in stages:
        for domain in present:
            run([str(HERE / "embed_datasets.py"), "--dataset", domain,
                 "--data", args.data, "--out", args.emb],
                f"EMBED  {domain}", allow_fail=args.keep_going)

    # -- heads ---------------------------------------------------------------
    if "heads" in stages:
        for domain in present:
            run([str(HERE / "train_heads.py"), "--dataset", domain,
                 "--emb", args.emb, "--out", args.heads],
                f"HEADS  {domain}", allow_fail=args.keep_going)

    # -- grid ----------------------------------------------------------------
    if "grid" in stages:
        cmd = [str(HERE / "train_full.py"), "--data", args.data, "--out", args.models]
        if args.fp16:
            cmd.append("--fp16")
        run(cmd, "GRID   15 full fine-tunes", allow_fail=args.keep_going)

    # -- summary -------------------------------------------------------------
    total = (time.time() - started) / 60
    print(f"\n{'=' * 70}\nBUILD COMPLETE -- {total:.1f} min\n{'=' * 70}")
    for label, path in [("embeddings", args.emb), ("heads", args.heads),
                        ("full grid", args.models)]:
        p = Path(path)
        if not p.exists():
            continue
        size = sum(f.stat().st_size for f in p.rglob("*") if f.is_file())
        print(f"  {label:<12} {size / 1e6:>8.1f} MB  {p}")

    if args.kaggle:
        bundle = Path("/kaggle/working/artefacts.zip")
        print(f"\n  packaging the small artefacts -> {bundle}")
        staging = Path("/kaggle/working/_artefacts")
        shutil.rmtree(staging, ignore_errors=True)
        for name, src in [("embeddings", args.emb), ("heads", args.heads)]:
            if Path(src).exists():
                shutil.copytree(src, staging / name)
        if staging.exists():
            shutil.make_archive(str(bundle.with_suffix("")), "zip", staging)
            print(f"  {bundle.stat().st_size / 1e6:.1f} MB -- download this and unzip "
                  "into Fine-tuning/public/")
        print("\n  The 15-cell grid stays under models/ -- download it separately,")
        print("  it is ~2.5 GB and only the demo's 'full fine-tune' column needs it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
