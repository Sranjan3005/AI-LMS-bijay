"""
embed_datasets.py -- run every dataset image through the frozen CNN once.

WHY THIS EXISTS

Fitting a classifier head on cached embeddings takes about a second. *Producing*
those embeddings does not: ResNet-50 is 4.1 GFLOPs per image, which is a few
hundred milliseconds each in a browser. Fifteen hundred images across six
augmentation variants is therefore a coffee break of forward passes and one
second of actual learning.

So the forward passes move to build time, where nobody is waiting, and the
result ships as a small binary. A 2048-float vector at fp32 is 8 KB; a
twelve-class domain is around 70 MB of vectors, which the browser fetches once
and then re-trains on instantly.

THE MODEL IS THE ONE THE BROWSER LOADS, BYTE FOR BYTE

This script runs `public/models/resnet50/model.onnx` through onnxruntime, and
`src/lib/ml/backbone.js` runs that same file through onnxruntime-web. The ViT
build could not do this -- it loaded a Google checkpoint here and a separately
converted Xenova checkpoint there, and needed check_parity.py to prove the two
had not drifted. Same file on both sides removes the question.

The embedding of a given image never changes, so this is a pure cache -- not a
shortcut. Everything downstream still trains for real.

USAGE

    python scripts/embed_datasets.py                    # everything stale
    python scripts/embed_datasets.py --dataset flowers  # just one
    python scripts/embed_datasets.py --force            # ignore the cache

Requires  python scripts/export_backbone.py   (once, builds the ONNX)

Reads   Fine-tuning/datasets/<id>/<class>/*.jpg     (git-ignored, never served)
Writes  Fine-tuning/public/embeddings/<id>/vectors.f32
        Fine-tuning/public/embeddings/<id>/meta.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

from env_check import preflight

# Windows consoles default to cp1252, and printing anything outside it raises
# UnicodeEncodeError *inside* the script rather than at the boundary -- the same
# trap Stage1/config/settings/base.py already had to fix for the Celery worker.
# Kaggle and CI are UTF-8; this only matters locally.
for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001 -- a non-reconfigurable stream is fine
        pass


ROOT = Path(__file__).resolve().parent.parent
DATASETS = ROOT / "datasets"
OUT = ROOT / "public" / "embeddings"

# Held separately so argparse defaults can read them before main()'s `global`
# declaration rebinds the originals.
_DEFAULT_DATASETS = DATASETS
_DEFAULT_OUT = OUT

# THE BACKBONE: ONE FILE, TWO CONSUMERS.
#
# `public/models/resnet50/model.onnx` is built by scripts/export_backbone.py
# from microsoft/resnet-50, and it exposes two outputs from a single forward
# pass:
#
#   logits    [N, 1000]   the generalist's answer in ImageNet's vocabulary.
#                         Not used here -- the browser uses it for steps 1-3.
#   features  [N, 2048]   the global-average-pooled output of the last
#                         convolution block. This is the description every head
#                         in this module is fitted on.
#
# The browser loads this identical file via onnxruntime-web. That is the whole
# reason the precomputed heads can be trusted on live photos: there is no second
# conversion step for the two sides to disagree about.
MODEL_DIR = ROOT / "public" / "models" / "resnet50"
BACKBONE = "microsoft/resnet-50"
EMBED_DIM = 2048

PREPROCESS_VERSION = 2

# Bumped on every upload -- see build_all.PIPELINE_VERSION.
SCRIPTS_BUILD = "2026-08-19.cnn.1"

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Set from --device in main(); None means auto-detect.
DEVICE = None

# AUGMENTATION VARIANTS -- AND WHY THEY ARE BUILT HERE RATHER THAN IN THE BROWSER
#
# You cannot augment an embedding. A 2048-number vector has no left or right, so
# flipping has to happen to the *image* and the flipped image needs its own
# forward pass. ResNet-50 is ~4.1 GFLOPs -- far cheaper than the ViT this
# replaced, but a 1,400-image set with all three transforms on is still 8,400
# forward passes, which is minutes in a browser tab rather than seconds.
#
# So every variant is embedded once, here, and the six vectors per image ship
# together. Any combination of toggles in Lab B is then a *subset* of what is
# already loaded, which makes every toggle instant and still completely real:
# these are genuine embeddings of genuine flipped and rotated images.
#
# Order is fixed and mirrors src/lib/ml/augment.js exactly. Index 0 must stay
# the untransformed original -- the held-out test set is built from it.
VARIANTS = [
    ("original", dict()),
    ("flip", dict(flip=True)),
    ("rotate_p20", dict(rotate=20)),
    ("rotate_m20", dict(rotate=-20)),
    ("bright_up", dict(brightness=1.35)),
    ("bright_down", dict(brightness=0.7)),
]


def apply_variant(img, spec):
    """Match src/lib/ml/augment.js render() -- contain-fit onto a black square."""
    from PIL import Image, ImageEnhance
    from cnn_preprocess import IMAGE_SIZE, contain_fit

    size = IMAGE_SIZE
    work = img
    if spec.get("rotate"):
        work = work.rotate(spec["rotate"], resample=Image.BICUBIC, expand=True)
    if spec.get("flip"):
        work = work.transpose(Image.FLIP_LEFT_RIGHT)
    if spec.get("brightness"):
        work = ImageEnhance.Brightness(work).enhance(spec["brightness"])

    return contain_fit(work, size)


def show(path: Path) -> str:
    """Repo-relative when possible, absolute otherwise.

    `Path.relative_to` raises rather than falling back, so a --out pointing
    anywhere outside the project (a temp dir, /kaggle/working) would crash the
    run at the very last print, after all the work was done.
    """
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def merge_index(path, key, new_entries, header):
    """Merge into an existing index instead of replacing it.

    build_all.py invokes these scripts once per domain, so a plain overwrite
    leaves the index describing only whichever domain ran last -- and the next
    stage then reports every other domain as missing, despite the artefacts
    sitting right there on disk. Silent, and it cost a full pipeline run.
    """
    existing = []
    if path.exists():
        try:
            existing = json.loads(path.read_text()).get(key, [])
        except (json.JSONDecodeError, OSError):
            existing = []
    by_id = {e.get("dataset_id"): e for e in existing}
    for e in new_entries:
        by_id[e.get("dataset_id")] = e
    ordered = sorted(by_id.values(), key=lambda e: e.get("dataset_id", ""))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({**header, key: ordered}, indent=2))
    return ordered

def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def scan(dataset_dir: Path):
    """One sub-folder per class; the folder name is the label."""
    classes = sorted(p.name for p in dataset_dir.iterdir() if p.is_dir() and not p.name.startswith("_"))
    files = []
    for ci, cls in enumerate(classes):
        for f in sorted((dataset_dir / cls).iterdir()):
            if f.suffix.lower() in IMAGE_SUFFIXES:
                files.append((f, ci, cls))
    return classes, files


def dataset_hash(files, classes) -> str:
    """Content hash. Change one pixel of one image and every artefact rebuilds."""
    h = hashlib.sha256()
    h.update(f"v{PREPROCESS_VERSION}|{BACKBONE}|".encode())
    h.update("|".join(classes).encode())
    for path, _, _ in files:
        h.update(sha256_of(path).encode())
    return h.hexdigest()[:16]


def load_backbone(device_arg=None):
    """Open an onnxruntime session on the exported CNN.

    Imported lazily so --help and the cache check work without onnxruntime.

    THE PROVIDER MATTERS. On CPU, ResNet-50 is roughly 40 ms per image; on CUDA
    it is closer to 4 ms. The ViT version of this script once ran a whole Kaggle
    job on CPU because nobody called `.to(device)` -- nothing warned, the run
    just took thirty-three minutes per domain instead of two. onnxruntime has
    the same trap in a different shape: it silently falls back to
    CPUExecutionProvider when the CUDA one is not installed. So the provider
    that actually got used is printed every run.
    """
    import onnxruntime as ort

    # Preprocessing is hand-written rather than AutoImageProcessor -- see
    # cnn_preprocess.py for why (browser parity, mostly).
    import cnn_preprocess as cp

    contract = cp.load_contract(MODEL_DIR)
    model_path = MODEL_DIR / contract["files"]["float32"]
    if not model_path.exists():
        raise SystemExit(
            f"{model_path} is missing.\n"
            "Run:  python scripts/export_backbone.py"
        )

    available = ort.get_available_providers()
    if device_arg == "cpu":
        wanted = ["CPUExecutionProvider"]
    elif device_arg == "cuda":
        if "CUDAExecutionProvider" not in available:
            raise SystemExit(
                "--device cuda was requested but onnxruntime has no CUDA provider.\n"
                f"Available: {', '.join(available)}\n"
                "Install onnxruntime-gpu, or drop the flag to run on CPU."
            )
        wanted = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    else:
        wanted = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider")
                  if p in available]

    session = ort.InferenceSession(str(model_path), providers=wanted)
    used = session.get_providers()[0]

    rate = "~4 ms/image" if used.startswith("CUDA") else "~40 ms/image"
    print(f"  running on {used} ({rate})")
    if used == "CPUExecutionProvider" and "CUDAExecutionProvider" in available:
        print("  !! a CUDA provider is installed but was not selected -- pass --device cuda")

    # Assert the graph is the one we think it is. A model exported without the
    # `features` output would still load, still run, and still return logits --
    # and every head fitted afterwards would be fitted on nothing.
    outputs = [o.name for o in session.get_outputs()]
    if "features" not in outputs:
        raise SystemExit(
            f"{model_path.name} has outputs {outputs} -- no 'features'.\n"
            "Re-run scripts/export_backbone.py --force."
        )

    return cp, session, contract


PREVIEW_PX = 320
PREVIEWS_PER_CLASS = 3
TEST_IMAGES = 8


def write_previews(dataset_dir: Path, out_dir: Path, classes, files) -> dict:
    """Ship a handful of real JPEGs alongside the vectors.

    The pipeline deliberately does NOT publish the source imagery -- that is how
    a 26 MB vector pack replaces gigabytes of licence-bound photos. But a Data
    Library with no pictures in it is unusable, and the prediction step needs
    something to test against. So: three thumbnails per class for the preview,
    plus a few held-back images for "try it yourself".

    ~12 classes x 3 x 25 KB is under a megabyte, and it runs even when the
    embeddings are cached -- otherwise adding this feature would silently do
    nothing for every dataset already built.
    """
    from PIL import Image

    prev_dir = out_dir / "previews"
    test_dir = out_dir / "test"
    manifest = {"previews": {}, "test": []}

    by_class = {}
    for path, ci, name in files:
        by_class.setdefault(name, []).append(path)

    prev_dir.mkdir(parents=True, exist_ok=True)
    for name, paths in by_class.items():
        kept = []
        for src in paths[:PREVIEWS_PER_CLASS]:
            dest = prev_dir / f"{name}__{src.stem}.jpg"
            if not dest.exists():
                with Image.open(src) as im:
                    im = im.convert("RGB")
                    im.thumbnail((PREVIEW_PX, PREVIEW_PX))
                    im.save(dest, "JPEG", quality=82)
            kept.append(dest.name)
        manifest["previews"][name] = kept

    # Test images come from the END of each class, so they are the least likely
    # to be among the previews the student has already stared at.
    test_dir.mkdir(parents=True, exist_ok=True)
    picks = []
    for name, paths in by_class.items():
        if len(paths) > PREVIEWS_PER_CLASS:
            picks.append((name, paths[-1]))
    for name, src in picks[:TEST_IMAGES]:
        dest = test_dir / f"{name}__{src.stem}.jpg"
        if not dest.exists():
            with Image.open(src) as im:
                im = im.convert("RGB")
                im.thumbnail((PREVIEW_PX, PREVIEW_PX))
                im.save(dest, "JPEG", quality=82)
        manifest["test"].append({"file": dest.name, "label": name})

    return manifest


def embed_dataset(dataset_dir: Path, force: bool) -> dict | None:
    dataset_id = dataset_dir.name
    classes, files = scan(dataset_dir)

    if len(classes) < 2:
        print(f"  ! {dataset_id}: needs at least 2 class folders, found {len(classes)}. Skipped.")
        return None
    if not files:
        print(f"  ! {dataset_id}: no images. Skipped.")
        return None

    dhash = dataset_hash(files, classes)
    out_dir = OUT / dataset_id
    meta_path = out_dir / "meta.json"

    if not force and meta_path.exists():
        existing = json.loads(meta_path.read_text())
        if existing.get("dataset_hash") == dhash:
            # Still (re)write previews -- they are cheap, and gating them behind
            # the embedding cache means a dataset built before this existed
            # would never get any.
            if "previews" not in existing:
                out_dir.mkdir(parents=True, exist_ok=True)
                existing["assets"] = write_previews(dataset_dir, out_dir, classes, files)
                existing["previews"] = True
                meta_path.write_text(json.dumps(existing, indent=2))
                print(f"  = {dataset_id}: unchanged, added previews.")
            else:
                print(f"  = {dataset_id}: unchanged ({len(files)} images), skipping.")
            return existing

    # Create the output directory NOW, not after the forward passes. The first
    # run of this on Kaggle spent 33 minutes embedding and then died on mkdir
    # because the disk was full -- every one of those GPU-minutes was thrown
    # away for a check that costs nothing up front.
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
        probe = out_dir / ".writable"
        probe.write_bytes(b"x")
        probe.unlink()
    except OSError as e:
        print(f"  ! {dataset_id}: cannot write to {out_dir} -- {e}")
        print("    Free some space before embedding; the work would be discarded.")
        return None

    n_variants = len(VARIANTS)
    total = len(files) * n_variants
    print(f"  + {dataset_id}: {len(files)} images x {n_variants} variants "
          f"= {total} forward passes, {len(classes)} classes")
    preprocess, session, contract = load_backbone(DEVICE)

    from PIL import Image

    # Layout: image-major, variant-minor. Row (i * n_variants + v) is image i
    # under variant v. Variant 0 is always the untransformed original, which is
    # what the held-out split and every un-augmented run use.
    vectors = np.zeros((total, EMBED_DIM), dtype=np.float32)

    # Batch across images, not just across one image's variants. ResNet-50 on
    # CPU is dominated by per-call overhead at batch 6; at batch 48 the same
    # work runs roughly twice as fast. Rows are written by absolute index, so
    # the batching boundary has no effect on the layout.
    batch_size = 48
    pending_px = []      # preprocessed CHW arrays, in row order
    pending_rows = []    # the row each one belongs to

    def flush():
        """Run whatever has accumulated and write it into `vectors`."""
        if not pending_px:
            return
        batch = np.stack(pending_px)
        features = session.run(["features"], {"pixel_values": batch})[0]
        for row, vec in zip(pending_rows, features):
            vectors[row] = vec
        pending_px.clear()
        pending_rows.clear()

    done = 0
    for i, (path, _, _) in enumerate(files):
        with Image.open(path) as handle:
            src = handle.convert("RGB")
        for v, (_, spec) in enumerate(VARIANTS):
            pending_px.append(preprocess.to_pixel_values(apply_variant(src, spec)))
            pending_rows.append(i * n_variants + v)
            if len(pending_px) >= batch_size:
                flush()

        done += n_variants
        if i % 5 == 0 or i == len(files) - 1:
            print(f"    {done}/{total}", end="\r", flush=True)

    flush()

    print(f"    {total}/{total} done.       ")

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "vectors.f32").write_bytes(vectors.tobytes())

    meta = {
        "dataset_id": dataset_id,
        "backbone": BACKBONE,
        "backbone_family": "cnn",
        "model_file": contract["files"]["float32"],
        "export_version": contract["export_version"],
        # Which exact ONNX produced these vectors. heads.js refuses a pack whose
        # stamp does not match the model the browser loaded.
        "model_sha256": contract.get("model_sha256"),
        "embed_dim": EMBED_DIM,
        "preprocess_version": PREPROCESS_VERSION,
        "dataset_hash": dhash,
        "count": len(files),
        "labels": classes,
        "label_index": [ci for _, ci, _ in files],
        "files": [str(p.relative_to(dataset_dir)).replace("\\", "/") for p, _, _ in files],
        "variants": [name for name, _ in VARIANTS],
        "previews": True,
        "assets": write_previews(dataset_dir, out_dir, classes, files),
        # Row-major float32, shape (count * variants, 2048). Row i*V+v is image i
        # under variant v. The browser reads this directly; dtype, order and the
        # variant ordering are all part of the contract.
        "layout": {
            "dtype": "float32",
            "order": "row-major",
            "shape": [total, EMBED_DIM],
            "variants": n_variants,
            "index": "row = image_index * variants + variant_index",
        },
    }
    meta_path.write_text(json.dumps(meta, indent=2))
    print(f"    -> {show(out_dir)}  ({vectors.nbytes / 1e6:.1f} MB)")
    return meta


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=str(_DEFAULT_DATASETS),
                    help="dataset root (default: Fine-tuning/datasets)")
    ap.add_argument("--out", default=str(_DEFAULT_OUT),
                    help="where to write the embedding packs")
    ap.add_argument("--device", help="cuda | cpu; auto-detected if omitted")
    ap.add_argument("--dataset", help="only this dataset folder name")
    ap.add_argument("--force", action="store_true", help="ignore the cache")
    args = ap.parse_args()

    global DATASETS, OUT, DEVICE
    DATASETS = Path(args.data)
    OUT = Path(args.out)
    DEVICE = args.device

    preflight()

    if not DATASETS.exists():
        print(f"No datasets directory at {DATASETS}.")
        print("Create it with one folder per dataset, and one sub-folder per class inside:")
        print("  Fine-tuning/datasets/flowers/rose/*.jpg")
        print("See public/datasets/README.md.")
        return 1

    dirs = [d for d in sorted(DATASETS.iterdir()) if d.is_dir() and not d.name.startswith(("_", "."))]
    if args.dataset:
        dirs = [d for d in dirs if d.name == args.dataset]
        if not dirs:
            print(f"No dataset folder named {args.dataset}.")
            return 1

    if not dirs:
        print(f"No dataset folders inside {DATASETS}.")
        return 1

    print(f"Backbone: {BACKBONE} (frozen CNN, {EMBED_DIM}-d features)")
    print(f"  scripts build {SCRIPTS_BUILD}")
    built = [m for d in dirs if (m := embed_dataset(d, args.force))]

    if built:
        OUT.mkdir(parents=True, exist_ok=True)
        entries = [{k: m[k] for k in ("dataset_id", "count", "labels", "dataset_hash")}
                   for m in built]
        allof = merge_index(OUT / "index.json", "datasets", entries, {
            "backbone": BACKBONE,
            "embed_dim": EMBED_DIM,
            "preprocess_version": PREPROCESS_VERSION,
        })
        print(f"\nWrote {len(built)} dataset(s) to {show(OUT)} "
              f"({len(allof)} in the index: "
              f"{', '.join(e['dataset_id'] for e in allof)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
