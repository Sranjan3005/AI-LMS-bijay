"""
check_parity.py -- the one thing that can still silently disagree.

WHAT USED TO BE AT RISK, AND WHY IT NO LONGER IS

The ViT build fitted heads in Python on features from a Google checkpoint and
applied them in the browser to features from a separately converted, possibly
int8-quantised Xenova export. Two different files. If they drifted, a head
fitted on one was being applied to the other, and the failure was quiet: the
model still returned confident-looking probabilities, they were just wrong.

That is gone. `embed_datasets.py` and `src/lib/ml/backbone.js` now load the same
`public/models/resnet50/model.onnx` -- same weights, same graph, both through
onnxruntime. The model cannot drift from itself.

WHAT IS STILL WORTH PROVING

Preprocessing, because that really is two separate implementations. Python
letterboxes with PIL and normalises with numpy (`cnn_preprocess.py`); the
browser letterboxes onto a canvas and normalises in a loop over `getImageData`
(`containFit` / `preprocess` in backbone.js). A wrong channel mean, an RGB/BGR
flip, a stretch where there should be a letterbox, a resampling filter that
rounds differently -- any of those shifts every feature vector a little and some
predictions a lot, with nothing on screen to notice.

So this writes a fixture: a handful of images, their exact embeddings, and the
head's prediction for each. `parity.js` loads the same images in the browser,
embeds them through the real path, and reports cosine similarity plus whether
the predicted label still matches.

    python scripts/check_parity.py --dataset flowers
    # then, in the app, open the console and run  await window.__checkParity()

Passing means cosine >= 0.999 and an identical predicted label on every fixture.
The threshold is tighter than the ViT build's 0.99 because there is no longer a
quantisation gap to absorb -- only canvas resampling versus PIL bicubic. A
failure points at the preprocessing, not the weights.

USAGE

    python scripts/check_parity.py --dataset flowers --n 8
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

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
EMB = ROOT / "public" / "embeddings"
HEADS = ROOT / "public" / "heads"
OUT = ROOT / "public" / "parity"


def show(path: Path) -> str:
    """Repo-relative when possible, absolute otherwise -- see embed_datasets."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True, help="dataset id to sample from")
    ap.add_argument("--n", type=int, default=8, help="how many fixture images")
    args = ap.parse_args()

    meta_path = EMB / args.dataset / "meta.json"
    if not meta_path.exists():
        print(f"No embeddings for {args.dataset}. Run embed_datasets.py first.")
        return 1

    meta = json.loads(meta_path.read_text())
    # The pack is (count * variants, dim), not (count, dim). Variant 0 is the
    # untransformed original -- the only one that can be compared against a
    # browser that was handed the plain JPEG. Reshaping to (count, dim) is what
    # the ViT version of this script did, and it is why it had never once run
    # to completion: it throws on any pack built with augmentation variants,
    # which is all of them.
    n_variants = meta["layout"].get("variants", 1)
    vectors = np.frombuffer((EMB / args.dataset / "vectors.f32").read_bytes(), dtype=np.float32)
    vectors = vectors.reshape(meta["count"] * n_variants, meta["embed_dim"])[::n_variants]

    # Spread the sample across classes rather than taking the first n, which
    # would all be class 0 and would not exercise the head at all.
    labels = np.array(meta["label_index"])
    picked = []
    for c in range(len(meta["labels"])):
        idx = np.where(labels == c)[0]
        if len(idx):
            picked.append(int(idx[0]))
        if len(picked) >= args.n:
            break

    # The head, if one has been trained, so parity can be checked on the thing
    # that actually matters: the predicted label, not just the vector.
    card_path = HEADS / args.dataset / "card.json"
    head = None
    if card_path.exists():
        card = json.loads(card_path.read_text())
        best = max(card["rungs"], key=lambda r: r["accuracy"]["test"])
        dim, n_classes = card["layout"]["weights_shape"]
        raw = np.frombuffer((HEADS / args.dataset / best["weights"]).read_bytes(), dtype=np.float32)
        W = raw[: dim * n_classes].reshape(dim, n_classes)
        b = raw[dim * n_classes:]
        head = {"rung": best["per_class"], "W": W, "b": b}
        print(f"Using the {best['per_class']}-per-class head "
              f"(held-out {best['accuracy']['test']:.3f}) for the label check.")

    OUT.mkdir(parents=True, exist_ok=True)

    # Copy the fixture images somewhere the dev server can actually serve them.
    #
    # `datasets/` is git-ignored and never served -- that is the whole reason the
    # pipeline ships vectors instead of gigabytes of licence-bound photos. The
    # previous version of this script emitted /datasets/... URLs that 404ed, and
    # left a note at the end telling the reader to copy the files by hand. Nobody
    # ever did, so the browser half of the check had never once been run.
    img_dir = OUT / "images"
    img_dir.mkdir(parents=True, exist_ok=True)

    fixtures = []
    for i in picked:
        rel = meta["files"][i]
        vec = vectors[i]

        src = DATASETS / args.dataset / rel
        dest_name = f"{args.dataset}__{Path(rel).name}"
        if src.exists():
            (img_dir / dest_name).write_bytes(src.read_bytes())
        else:
            print(f"  ! source image missing, skipping: {src}")
            continue

        entry = {
            "image": f"/parity/images/{dest_name}",
            "true_label": meta["labels"][labels[i]],
            "embedding": [round(float(v), 6) for v in vec],
        }
        if head is not None:
            probs = softmax(vec @ head["W"] + head["b"])
            entry["expected_label"] = meta["labels"][int(probs.argmax())]
            entry["expected_confidence"] = round(float(probs.max()), 6)
        fixtures.append(entry)

    payload = {
        "dataset_id": args.dataset,
        "backbone": meta["backbone"],
        "embed_dim": meta["embed_dim"],
        "preprocess_version": meta["preprocess_version"],
        "head_rung": head["rung"] if head else None,
        "note": "Reference from onnxruntime on public/models/resnet50/model.onnx -- "
                "the same file the browser loads. Any disagreement is therefore a "
                "preprocessing difference, not a weights difference. Thresholds "
                "live in src/lib/ml/parity.js.",
        "fixtures": fixtures,
    }
    (OUT / "reference.json").write_text(json.dumps(payload, indent=2))

    print(f"Wrote {len(fixtures)} fixture(s) to {show(OUT / 'reference.json')}")
    print(f"Copied {len(fixtures)} image(s) to {show(img_dir)}")
    print()
    print("Now start the app and run this in the browser console:")
    print()
    print("    await window.__checkParity()")
    print()
    print("It compares the browser's embedding of those same images against the")
    print("numbers above. Both sides run the identical ONNX, so a failure means")
    print("the two preprocessors disagree -- compare containFit() in backbone.js")
    print("with contain_fit() in cnn_preprocess.py.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
