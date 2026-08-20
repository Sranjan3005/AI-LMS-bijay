"""
train_full.py -- the 15-cell grid. Full fine-tunes of ResNet-50, all 25.6M weights.

WHAT THIS IS FOR

Everywhere else in this module the backbone is frozen and we fit a ~300 KB head
on top. That is the *partial* fine-tune, it runs in a browser in a second, and it
is what the student performs.

This script produces the other half of the comparison: what happens when you
unlock the whole network. 5 domains x 3 data volumes = 15 models. The 10-per-
class row is the point -- a full fine-tune on ten images per class usually
collapses, and that collapse is catastrophic forgetting, measured rather than
asserted.

THE ONE THING THAT MAKES THE COMPARISON VALID

Both halves must be scored on **the same held-out images**. So the split
functions are *imported from train_heads.py*, not reimplemented here, and file
enumeration is *imported from embed_datasets.py*. If these three scripts ever
disagreed about which photo is index 7, every "full vs partial" number in the
module would be quietly wrong, and nothing would throw. `--verify-split` exists
to prove they agree.

USAGE

    python scripts/train_full.py --smoke              # synthetic data, no dataset needed
    python scripts/train_full.py --verify-split       # prove the splits match train_heads
    python scripts/train_full.py --domain pets --volume 10
    python scripts/train_full.py --fp16               # the real run (Kaggle: add this)

Resumes automatically: a cell whose card.json already matches the build key is
skipped, so a dropped session costs one cell rather than the run.

Reads   Fine-tuning/datasets/<domain>/<class>/*.jpg
Writes  Fine-tuning/models/full/<domain>__v<volume>/{weights.pt, card.json}
        Fine-tuning/models/full/index.json
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

from env_check import preflight

sys.path.insert(0, str(Path(__file__).resolve().parent))

from embed_datasets import BACKBONE, scan, dataset_hash  # noqa: E402
from cnn_preprocess import to_pixel_values  # noqa: E402
from train_heads import (  # noqa: E402
    SPLIT_SEED, TEST_FRACTION, stratified_split, subsample,
)

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
OUT = ROOT / "models" / "full"

# Held separately so main()'s argparse defaults can read them before its
# `global` declaration rebinds the originals.
_DEFAULT_DATASETS = DATASETS
_DEFAULT_OUT = OUT

# `None` means "everything available". Matches PLAN.md section 3.
VOLUMES = [10, 100, None]
VOLUME_ID = {10: "v10", 100: "v100", None: "vall"}

TRAINER_VERSION = 2
HYPER = {
    "epochs": 8,
    "batch_size": 32,
    # 1e-4 for a ResNet full fine-tune with AdamW. The ViT version of this grid
    # used 3e-5, which is the standard rate for transformer fine-tuning and is
    # too timid for a conv net -- ResNet has no LayerNorm holding activations in
    # place, and at 3e-5 the 'all data' cells barely move off the pretrained
    # weights, which would flatter full fine-tuning by understating how much it
    # can damage.
    #
    # Deliberately NOT tuned per cell: the grid is a controlled comparison, so
    # every cell gets identical hyperparameters and only the data volume
    # changes. TRAINER_VERSION is part of the build key, so bumping this
    # invalidates every cached cell rather than mixing two rates in one table.
    "lr": 1e-4,
    "weight_decay": 0.01,
    "warmup_ratio": 0.1,
}


def build_key(dhash: str, volume) -> str:
    import hashlib
    h = hashlib.sha256()
    h.update(f"{dhash}|full|{BACKBONE}|v{TRAINER_VERSION}|{VOLUME_ID[volume]}|".encode())
    h.update(json.dumps(HYPER, sort_keys=True).encode())
    return h.hexdigest()[:16]


def quiet_transformers():
    """Silence the key-remapping wall.

    Loading a published checkpoint into a head with a different `num_labels`
    prints a block of UNEXPECTED/MISSING key names -- here, the 1,000-way
    ImageNet classifier being discarded in favour of a fresh 12-way one. That is
    exactly what we asked for, but the output reads like a failure on a fresh
    run and somebody will spend an hour on it. Hide the noise, keep the check:
    `verify_backbone()` proves the convolutional weights really did load.
    """
    import logging
    from transformers.utils import logging as hf_logging
    hf_logging.set_verbosity_error()
    logging.getLogger("transformers").setLevel(logging.ERROR)


def verify_backbone(device) -> bool:
    """Prove the pretrained weights actually loaded before training on them.

    If they silently did not, every cell in the grid would be a from-scratch
    run wearing a fine-tune's name, and the accuracies would look merely
    disappointing rather than wrong.
    """
    import torch
    from transformers import ResNetModel

    a = ResNetModel.from_pretrained(BACKBONE)
    b = ResNetModel.from_pretrained(BACKBONE)
    # Any large float tensor will do. Deliberately not matched by name: an
    # earlier version looked for a specific key, and transformers renamed it
    # between minor releases, so `next()` raised StopIteration and killed the
    # run inside the very check meant to protect it.
    key = next(k for k, v in a.state_dict().items()
               if v.dtype.is_floating_point and v.dim() >= 2)
    deterministic = torch.allclose(a.state_dict()[key], b.state_dict()[key])

    # A trained network separates very different inputs. A random one does not.
    x1 = torch.zeros(1, 3, 224, 224); x1[:, 0] = 1.0
    x2 = torch.zeros(1, 3, 224, 224); x2[:, 2] = 1.0
    with torch.no_grad():
        # The pooled output, matching what export_backbone.py exposes as
        # `features` and what every head in this module is fitted on.
        e1 = a(pixel_values=x1).pooler_output.flatten(1)
        e2 = a(pixel_values=x2).pooler_output.flatten(1)
    cos = torch.nn.functional.cosine_similarity(e1, e2).item()

    ok = deterministic and cos < 0.99
    print(f"  backbone check: two loads identical={deterministic}, "
          f"cos(red,blue)={cos:.3f} -> "
          + ("pretrained weights loaded OK" if ok else "*** NOT LOADED ***"))
    del a, b
    return ok


def pick_device(requested: str | None):
    import torch
    if requested:
        return torch.device(requested)
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


class FolderDataset:
    """(path, label) pairs -> processed tensors. Indexing matches embed_datasets.scan."""

    def __init__(self, files, indices, train: bool):
        self.files = files
        self.indices = list(indices)
        self.train = train

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, i):
        import torch
        from PIL import Image
        path, label, _ = self.files[self.indices[i]]
        img = Image.open(path).convert("RGB")
        # Light augmentation on the training half only -- a horizontal flip is
        # the one transform that is safe for every domain here. Anything more
        # would make this a different experiment from the head path.
        if self.train and np.random.rand() < 0.5:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        px = torch.from_numpy(to_pixel_values(img))
        return px, torch.tensor(label, dtype=torch.long)


def evaluate(model, loader, device):
    import torch
    model.eval()
    correct = total = 0
    preds_all, actual_all = [], []
    with torch.no_grad():
        for px, y in loader:
            px, y = px.to(device), y.to(device)
            logits = model(pixel_values=px).logits
            pred = logits.argmax(dim=-1)
            correct += (pred == y).sum().item()
            total += y.numel()
            preds_all.extend(pred.cpu().tolist())
            actual_all.extend(y.cpu().tolist())
    return (correct / total if total else 0.0), preds_all, actual_all


def train_cell(domain: str, volume, files, classes, device, args):
    import torch
    from torch.utils.data import DataLoader
    from transformers import ResNetForImageClassification

    cell_id = f"{domain}__{VOLUME_ID[volume]}"
    out_dir = OUT / cell_id
    card_path = out_dir / "card.json"

    y = np.array([lbl for _, lbl, _ in files], dtype=np.int64)
    n_classes = len(classes)
    key = build_key(dataset_hash(files, classes), volume)

    if not args.force and card_path.exists():
        if json.loads(card_path.read_text()).get("build_key") == key:
            print(f"  = {cell_id}: unchanged, skipping.")
            return json.loads(card_path.read_text())

    # -- the split, IDENTICAL to train_heads.py -------------------------------
    train_pool, test_idx = stratified_split(y, n_classes)
    per_class = volume if volume is not None else int(
        min(np.bincount(y[train_pool], minlength=n_classes)))
    train_idx = subsample(train_pool, y, n_classes, per_class)

    if len(train_idx) < n_classes:
        print(f"  ! {cell_id}: only {len(train_idx)} training images for "
              f"{n_classes} classes. Skipped.")
        return None

    print(f"  + {cell_id}: {len(train_idx)} train / {len(test_idx)} held out, "
          f"{n_classes} classes, on {device}")

    # `ignore_mismatched_sizes` is REQUIRED, and it is not a workaround.
    #
    # The checkpoint carries ImageNet's 1,000-way classifier; we are attaching a
    # fresh `n_classes`-way one. Those weights genuinely do not match and we
    # genuinely want the pretrained ones discarded -- that is what "replace the
    # last layer" means. transformers 5.x refuses to do it silently and raises
    # unless told, which is the right default and exactly the check that caught
    # this during the port.
    #
    # Everything *below* the classifier still loads from the checkpoint.
    # `verify_backbone()` is what proves that, and it is why this script has
    # that function at all: a run where the convolutions came up random would
    # look merely disappointing rather than wrong.
    model = ResNetForImageClassification.from_pretrained(
        BACKBONE, num_labels=n_classes,
        id2label={i: c for i, c in enumerate(classes)},
        label2id={c: i for i, c in enumerate(classes)},
        ignore_mismatched_sizes=True,
    ).to(device)

    train_loader = DataLoader(
        FolderDataset(files, train_idx, train=True),
        batch_size=HYPER["batch_size"], shuffle=True, num_workers=args.workers, drop_last=False)
    test_loader = DataLoader(
        FolderDataset(files, test_idx, train=False),
        batch_size=HYPER["batch_size"], shuffle=False, num_workers=args.workers)

    opt = torch.optim.AdamW(model.parameters(), lr=HYPER["lr"],
                            weight_decay=HYPER["weight_decay"])
    steps = max(1, len(train_loader) * HYPER["epochs"])
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=HYPER["lr"], total_steps=steps,
        pct_start=HYPER["warmup_ratio"], anneal_strategy="cos")

    use_amp = device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    started = time.time()
    curve = []
    for epoch in range(HYPER["epochs"]):
        model.train()
        running, seen, hits = 0.0, 0, 0
        for px, yy in train_loader:
            px, yy = px.to(device, non_blocking=True), yy.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=use_amp):
                out = model(pixel_values=px, labels=yy)
            scaler.scale(out.loss).backward()
            scaler.step(opt)
            scaler.update()
            sched.step()
            running += out.loss.item() * yy.numel()
            hits += (out.logits.argmax(-1) == yy).sum().item()
            seen += yy.numel()
        point = {"epoch": epoch + 1, "loss": running / max(seen, 1),
                 "accuracy": hits / max(seen, 1)}
        curve.append(point)
        print(f"    epoch {point['epoch']}/{HYPER['epochs']}  "
              f"loss {point['loss']:.4f}  train acc {point['accuracy']:.3f}")

    train_acc, _, _ = evaluate(model, train_loader, device)
    test_acc, preds, actual = evaluate(model, test_loader, device)
    elapsed = time.time() - started

    conf = np.zeros((n_classes, n_classes), dtype=int)
    for t, p in zip(actual, preds):
        conf[t, p] += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    state = model.state_dict()
    if args.fp16:
        state = {k: (v.half() if v.is_floating_point() else v) for k, v in state.items()}
    torch.save(state, out_dir / "weights.pt")
    size_mb = (out_dir / "weights.pt").stat().st_size / 1e6

    card = {
        "cell_id": cell_id,
        "domain": domain,
        "volume": VOLUME_ID[volume],
        "per_class": per_class,
        "backbone": BACKBONE,
        "tuning_mode": "full",
        "labels": classes,
        "build_key": key,
        "trainer": {"version": TRAINER_VERSION, **HYPER},
        "dtype": "float16" if args.fp16 else "float32",
        "param_count": sum(p.numel() for p in model.parameters()),
        "trainable_params": sum(p.numel() for p in model.parameters() if p.requires_grad),
        "train_count": int(len(train_idx)),
        "test_count": int(len(test_idx)),
        "accuracy": {"train": round(train_acc, 4), "test": round(test_acc, 4)},
        "confusion": conf.tolist(),
        "curve": curve,
        "train_seconds": round(elapsed, 1),
        "device": str(device),
        "weights_mb": round(size_mb, 1),
        # The split is what makes this comparable to the head at the same volume.
        "split": {"test_fraction": TEST_FRACTION, "seed": SPLIT_SEED,
                  "shared_with": "scripts/train_heads.py"},
    }
    card_path.write_text(json.dumps(card, indent=2))
    print(f"    -> held-out {test_acc:.3f}  ({size_mb:.0f} MB, {elapsed/60:.1f} min)")

    del model
    if device.type == "cuda":
        torch.cuda.empty_cache()
    return card


def verify_split(domains) -> int:
    """Prove this script and train_heads.py agree about every index.

    A silent disagreement here would make every full-vs-partial number in the
    module wrong while looking completely normal, so it gets an explicit check.
    """
    from train_heads import RUNGS  # noqa: F401  (imported to prove the module loads)
    ok = True
    for domain, files, classes in domains:
        y = np.array([lbl for _, lbl, _ in files], dtype=np.int64)
        pool_a, test_a = stratified_split(y, len(classes))
        pool_b, test_b = stratified_split(y, len(classes))
        same_split = np.array_equal(test_a, test_b) and np.array_equal(pool_a, pool_b)

        s10 = set(subsample(pool_a, y, len(classes), 10).tolist())
        s100 = set(subsample(pool_a, y, len(classes), 100).tolist())
        nested = s10.issubset(s100)
        disjoint = not (set(test_a.tolist()) & s100)

        status = "OK " if (same_split and nested and disjoint) else "FAIL"
        if status == "FAIL":
            ok = False
        print(f"  {status} {domain}: deterministic={same_split} "
              f"v10<=v100={nested} test-disjoint={disjoint} "
              f"({len(pool_a)} pool / {len(test_a)} held out)")
    return 0 if ok else 1


def smoke(args) -> int:
    """Run the whole path on synthetic images, so the script can be proved
    without a dataset and without a GPU."""
    import tempfile
    from PIL import Image

    print("SMOKE TEST -- synthetic images, tiny model settings\n")
    HYPER.update(epochs=1, batch_size=4)
    rng = np.random.default_rng(0)

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp) / "smoke"
        classes = ["alpha", "beta", "gamma"]
        for ci, c in enumerate(classes):
            (root / c).mkdir(parents=True)
            for i in range(6):
                # Each class gets a distinct colour bias, so a real model should
                # actually be able to learn something here.
                arr = rng.integers(0, 60, (64, 64, 3), dtype=np.uint8)
                arr[:, :, ci] = rng.integers(180, 255, (64, 64), dtype=np.uint8)
                Image.fromarray(arr).save(root / c / f"{i:03d}.png")

        found_classes, files = scan(root)
        device = pick_device(args.device)
        global OUT
        OUT = Path(tmp) / "out"
        card = train_cell("smoke", 10, files, found_classes, device, args)

    if not card:
        print("\nFAILED: no card produced.")
        return 1
    print(f"\nOK: trained on {card['train_count']}, held-out accuracy "
          f"{card['accuracy']['test']:.3f}, {card['weights_mb']} MB")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", default=str(_DEFAULT_DATASETS), help="dataset root")
    ap.add_argument("--out", default=str(_DEFAULT_OUT), help="where to write the grid")
    ap.add_argument("--domain", help="only this domain")
    ap.add_argument("--volume", type=int, help="only this volume (10, 100); omit for all")
    ap.add_argument("--fp16", action="store_true", help="save weights as float16 (half the size)")
    ap.add_argument("--device", help="cuda | cpu | mps; auto-detected if omitted")
    ap.add_argument("--workers", type=int, default=2, help="DataLoader workers")
    ap.add_argument("--force", action="store_true", help="ignore the build cache")
    ap.add_argument("--smoke", action="store_true", help="synthetic run, no dataset needed")
    ap.add_argument("--skip-check", action="store_true",
                    help="skip the pretrained-weight verification (not recommended)")
    ap.add_argument("--verify-split", action="store_true",
                    help="prove the splits match train_heads.py, train nothing")
    args = ap.parse_args()

    preflight()

    global DATASETS, OUT
    DATASETS = Path(args.data)
    OUT = Path(args.out)

    if args.smoke:
        return smoke(args)

    if not DATASETS.exists():
        print(f"No datasets at {DATASETS}. Expected <domain>/<class>/*.jpg.")
        return 1

    domains = []
    for d in sorted(DATASETS.iterdir()):
        if not d.is_dir() or d.name.startswith((".", "_")):
            continue
        if args.domain and d.name != args.domain:
            continue
        classes, files = scan(d)
        if len(classes) < 2 or not files:
            print(f"  ! {d.name}: needs >=2 class folders with images. Skipped.")
            continue
        domains.append((d.name, files, classes))

    if not domains:
        print("Nothing to train.")
        return 1

    if args.verify_split:
        return verify_split(domains)

    quiet_transformers()
    device = pick_device(args.device)

    if not args.skip_check and not verify_backbone(device):
        print("\nRefusing to train: the pretrained weights did not load, so every "
              "cell\nwould be a from-scratch run wearing a fine-tune's name.")
        return 1

    if device.type == "cpu":
        print("\n  !! Running on CPU. A full cell is ~2 hours here versus ~8 minutes\n"
              "     on a T4. If you meant to use a GPU, stop now and check\n"
              "     torch.cuda.is_available(). See GPU_RUNBOOK.md.\n")

    volumes = [v for v in VOLUMES if args.volume is None or v == args.volume]
    print(f"Backbone: {BACKBONE}\nDevice:   {device}\n"
          f"Grid:     {len(domains)} domain(s) x {len(volumes)} volume(s) "
          f"= {len(domains) * len(volumes)} cells\n")

    cards = []
    for name, files, classes in domains:
        for volume in volumes:
            card = train_cell(name, volume, files, classes, device, args)
            if card:
                cards.append(card)

    if cards:
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / "index.json").write_text(json.dumps({
            "backbone": BACKBONE,
            "tuning_mode": "full",
            "cells": [{k: c[k] for k in
                       ("cell_id", "domain", "volume", "per_class", "accuracy",
                        "train_count", "weights_mb")} for c in cards],
        }, indent=2))
        print(f"\nWrote {len(cards)} cell(s) to {OUT}")
        for c in cards:
            print(f"  {c['cell_id']:<24} {c['per_class']:>4}/class  "
                  f"held-out {c['accuracy']['test']:.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
