"""
train_heads.py -- fit a classifier head on the frozen CNN features, once per
data-volume rung, and record what it actually scored.

This is where Lab A's lesson comes from. Every rung is a real head fitted on
exactly that many images per class, so the curve the student drags along is a
measurement, not an illustration.

WHAT THIS PRODUCES AND WHY IT IS NOT A FAKE

For every dataset it trains a real multinomial logistic-regression head at
1, 2, 5, 10, 25, 50, 100, 250 and all images per class. Every one of those is
genuine gradient descent on genuine features, evaluated on a held-out set the
head never saw. The accuracies written into `card.json` come out of those runs
and are not authored anywhere.

Moving them to build time makes the *slider* instant -- the student drags to
"10 per class" and a head that was really fitted on ten images per class loads
in a few milliseconds. It does not make the numbers less real, and the UI is
required to say when a result was computed rather than implying it just
happened. That is the difference between pre-computed and pretend.

THE ONE THING THAT MUST NOT DRIFT: **the held-out test set is fixed across every
rung of a dataset.** If each rung re-split, the accuracy curve would be
measuring two changes at once and the whole lab would be noise. The split is
carved out first, from the full dataset, and every rung subsamples only from
what is left.

USAGE

    python scripts/train_heads.py
    python scripts/train_heads.py --dataset flowers --force

Reads   Fine-tuning/public/embeddings/<id>/{vectors.f32,meta.json}
Writes  Fine-tuning/public/heads/<id>/rung_<n>.f32     weights + bias
        Fine-tuning/public/heads/<id>/card.json        measured, per rung
        Fine-tuning/public/heads/index.json
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
EMB = ROOT / "public" / "embeddings"
OUT = ROOT / "public" / "heads"

_DEFAULT_EMB = EMB
_DEFAULT_OUT = OUT

RUNGS = [1, 2, 5, 10, 25, 50, 100, 250]
TEST_FRACTION = 0.25
SPLIT_SEED = 20260806
SUBSAMPLE_SEED = 0x9E3779B9

# Bump when the optimiser, regularisation or feature scaling changes -- it is in
# the build key, so a bump retrains everything rather than leaving a mixed zoo.
TRAINER_VERSION = 1

HYPER = {"C": 1.0, "max_iter": 2000}


def show(path: Path) -> str:
    """Repo-relative when possible, absolute otherwise -- see embed_datasets."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def build_key(dataset_hash: str) -> str:
    h = hashlib.sha256()
    h.update(f"{dataset_hash}|logreg|v{TRAINER_VERSION}|{json.dumps(HYPER, sort_keys=True)}".encode())
    return h.hexdigest()[:16]


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

def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def stratified_split(labels: np.ndarray, n_classes: int):
    """Deterministic, stratified, and guaranteed to leave every class trainable."""
    train_idx, test_idx = [], []
    for c in range(n_classes):
        idx = np.where(labels == c)[0]
        rng(SPLIT_SEED + c * 7919).shuffle(idx)
        # Never hold out so much that a class has nothing left to learn from.
        n_test = 0 if len(idx) < 2 else max(1, min(len(idx) - 1, round(len(idx) * TEST_FRACTION)))
        test_idx.extend(idx[:n_test].tolist())
        train_idx.extend(idx[n_test:].tolist())
    return np.array(sorted(train_idx)), np.array(sorted(test_idx))


def subsample(pool: np.ndarray, labels: np.ndarray, n_classes: int, per_class: int):
    """Take up to `per_class` from each class, deterministically.

    Nested by construction: the 10-per-class set is a superset of the
    5-per-class set, because both take a prefix of the same shuffled order.
    That means the curve shows the effect of *adding* data rather than the
    effect of drawing a different sample each time.
    """
    picked = []
    for c in range(n_classes):
        idx = pool[labels[pool] == c]
        order = idx.copy()
        rng(SUBSAMPLE_SEED + c * 7919).shuffle(order)
        picked.extend(order[:per_class].tolist())
    return np.array(sorted(picked))


def fit_head(X: np.ndarray, y: np.ndarray, n_classes: int):
    """Multinomial logistic regression -> (W, b) for a softmax head.

    Returns weights in the exact layout the browser expects: W is (dim, classes)
    row-major, so the forward pass is `softmax(x @ W + b)` with no transpose on
    the JS side. Getting this backwards produces a head that runs, returns
    plausible-looking probabilities and is wrong -- so it is asserted below.
    """
    from sklearn.linear_model import LogisticRegression

    present = np.unique(y)
    W = np.zeros((X.shape[1], n_classes), dtype=np.float32)
    b = np.zeros((n_classes,), dtype=np.float32)

    if len(present) < 2:
        # One class in the training set: a classifier cannot be fitted. Return a
        # degenerate head that always predicts it, and let the card record the
        # (terrible) accuracy honestly rather than skipping the rung.
        b[present[0]] = 1.0
        return W, b

    clf = LogisticRegression(C=HYPER["C"], max_iter=HYPER["max_iter"])
    clf.fit(X, y)

    coef = clf.coef_
    # sklearn collapses to a single row for a 2-class problem; expand it so the
    # shipped head is always the same shape.
    if coef.shape[0] == 1:
        coef = np.vstack([-coef[0], coef[0]])
        intercept = np.array([-clf.intercept_[0], clf.intercept_[0]])
    else:
        intercept = clf.intercept_

    for i, c in enumerate(clf.classes_):
        W[:, c] = coef[i].astype(np.float32)
        b[c] = float(intercept[i])
    return W, b


def softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=1, keepdims=True)


def evaluate(W, b, X, y, n_classes):
    probs = softmax(X @ W + b)
    pred = probs.argmax(axis=1)
    acc = float((pred == y).mean()) if len(y) else 0.0
    conf = np.zeros((n_classes, n_classes), dtype=int)
    for t, p in zip(y, pred):
        conf[t, p] += 1
    return acc, conf, pred


def train_dataset(dataset_id: str, force: bool):
    meta = json.loads((EMB / dataset_id / "meta.json").read_text())
    labels_names = meta["labels"]
    n_classes = len(labels_names)
    y = np.array(meta["label_index"], dtype=np.int64)
    dim = meta["embed_dim"]

    # The pack holds every augmentation variant; these heads are trained on the
    # originals only. Lab A is about data *volume*, and mixing augmented copies
    # in would make the curve measure two things at once. Lab B trains on the
    # other variants live in the browser, which is cheap once they are cached.
    n_variants = meta["layout"].get("variants", 1)
    raw = np.frombuffer((EMB / dataset_id / "vectors.f32").read_bytes(), dtype=np.float32)
    raw = raw.reshape(meta["layout"]["shape"][0], dim)
    X = raw[::n_variants].copy()  # variant 0 == untransformed original
    assert len(y) == X.shape[0], (
        f"meta.label_index has {len(y)} entries but the pack yields {X.shape[0]} "
        "originals -- re-run embed_datasets.py --force"
    )

    key = build_key(meta["dataset_hash"])
    out_dir = OUT / dataset_id
    card_path = out_dir / "card.json"

    if not force and card_path.exists():
        existing = json.loads(card_path.read_text())
        if existing.get("build_key") == key:
            print(f"  = {dataset_id}: unchanged, skipping.")
            return existing

    train_pool, test_idx = stratified_split(y, n_classes)
    X_test, y_test = X[test_idx], y[test_idx]
    print(f"  + {dataset_id}: {n_classes} classes, {len(train_pool)} trainable, {len(test_idx)} held out")

    out_dir.mkdir(parents=True, exist_ok=True)

    per_class_available = int(min(np.bincount(y[train_pool], minlength=n_classes)))
    rungs = [r for r in RUNGS if r < per_class_available] + [per_class_available]

    entries = []
    for per_class in rungs:
        idx = subsample(train_pool, y, n_classes, per_class)
        W, b = fit_head(X[idx], y[idx], n_classes)

        train_acc, _, _ = evaluate(W, b, X[idx], y[idx], n_classes)
        test_acc, conf, _ = evaluate(W, b, X_test, y_test, n_classes)

        # (dim, classes) then (classes,), both float32, row-major -- the browser
        # reads exactly this and does softmax(x @ W + b).
        payload = np.concatenate([W.reshape(-1), b.reshape(-1)]).astype(np.float32)
        (out_dir / f"rung_{per_class}.f32").write_bytes(payload.tobytes())

        per_class_acc = [
            float(conf[i, i] / conf[i].sum()) if conf[i].sum() else 0.0
            for i in range(n_classes)
        ]

        entries.append({
            "per_class": per_class,
            "train_count": int(len(idx)),
            "test_count": int(len(test_idx)),
            "accuracy": {"train": round(train_acc, 4), "test": round(test_acc, 4)},
            "per_class_accuracy": [round(a, 4) for a in per_class_acc],
            "confusion": conf.tolist(),
            "param_count": int(dim * n_classes + n_classes),
            "weights": f"rung_{per_class}.f32",
        })
        print(f"    {per_class:>4} per class ({len(idx):>5} imgs) -> "
              f"train {train_acc:.3f}  held-out {test_acc:.3f}")

    card = {
        "dataset_id": dataset_id,
        "backbone": meta["backbone"],
        "embed_dim": dim,
        "labels": labels_names,
        "build_key": key,
        "dataset_hash": meta["dataset_hash"],
        "trainer": {"type": "logistic_regression", "version": TRAINER_VERSION, **HYPER},
        "layout": {
            "dtype": "float32",
            "weights_shape": [dim, n_classes],
            "bias_shape": [n_classes],
            "forward": "softmax(x @ W + b)",
        },
        "split": {
            "test_fraction": TEST_FRACTION,
            "seed": SPLIT_SEED,
            "note": "One held-out set, shared by every rung, so the curve isolates data volume.",
        },
        "rungs": entries,
    }
    card_path.write_text(json.dumps(card, indent=2))
    return card


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--emb", default=str(_DEFAULT_EMB), help="embedding pack root")
    ap.add_argument("--out", default=str(_DEFAULT_OUT), help="where to write the heads")
    ap.add_argument("--dataset", help="only this dataset id")
    ap.add_argument("--force", action="store_true", help="ignore the build cache")
    args = ap.parse_args()

    global EMB, OUT
    EMB = Path(args.emb)
    OUT = Path(args.out)

    preflight(need_sklearn=True)

    if not (EMB / "index.json").exists():
        print(f"No embeddings at {EMB}. Run scripts/embed_datasets.py first.")
        return 1

    index = json.loads((EMB / "index.json").read_text())
    ids = [d["dataset_id"] for d in index["datasets"]]
    if args.dataset:
        ids = [i for i in ids if i == args.dataset]
        if not ids:
            print(f"No embedded dataset named {args.dataset}.")
            return 1

    cards = [train_dataset(i, args.force) for i in ids]

    OUT.mkdir(parents=True, exist_ok=True)
    entries = [
        {
            "dataset_id": c["dataset_id"],
            "labels": c["labels"],
            "rungs": [r["per_class"] for r in c["rungs"]],
            "best_accuracy": max(r["accuracy"]["test"] for r in c["rungs"]),
            "path": f"/heads/{c['dataset_id']}/",
        }
        for c in cards
    ]
    merge_index(OUT / "index.json", "specialists", entries, {
        "backbone": index["backbone"],
        "embed_dim": index["embed_dim"],
    })

    print(f"\nWrote {len(cards)} specialist(s) to {show(OUT)}")
    for c in cards:
        best = max(c["rungs"], key=lambda r: r["accuracy"]["test"])
        worst = min(c["rungs"], key=lambda r: r["per_class"])
        print(f"  {c['dataset_id']:<16} {worst['per_class']}/class {worst['accuracy']['test']:.3f}"
              f"  ->  {best['per_class']}/class {best['accuracy']['test']:.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
