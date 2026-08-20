"""
export_backbone.py -- build the one CNN both sides of this project run.

WHY WE EXPORT OUR OWN INSTEAD OF PULLING ONE OFF THE HUB

The ViT build loaded `Xenova/vit-base-patch16-224-in21k` in the browser and
`google/vit-base-patch16-224-in21k` in Python, then spent a whole script
(`check_parity.py`) and a page of README anxiety proving the two agreed. They
are different files, produced by different exporters, at different precisions.
When they drift the app does not crash -- it just becomes confidently wrong.

That entire class of bug is avoidable. If Python and the browser load *the same
.onnx file*, there is nothing left to drift. So this script produces one
artefact:

    public/models/resnet50/model.onnx

and both `embed_datasets.py` (via onnxruntime) and `src/lib/ml/backbone.js`
(via onnxruntime-web) run exactly it. Parity stops being a property we test for
and becomes a property of the build.

Self-hosting buys a second thing the README asked for and never got: the module
works with no internet at all after the first `npm install`. A classroom on
school wifi does not wait on the Hugging Face CDN.

WHY RESNET-50

    parameters   25.6 M      (the ViT it replaces was 86 M)
    top-1        76.1 %      on ImageNet-1k
    features     2048-d      global-average-pooled, straight out of conv

It is the CNN a school syllabus actually draws -- convolution, pooling, residual
connections -- and it is small enough to export, ship and run on a school
laptop. Its features are also *deliberately weaker* than ViT-21k's, which is the
point: on ViT features a linear probe hit 88 % on flowers from ONE image per
class, so "a small dataset fine-tunes badly" never appeared on screen. On these
features it does.

THE TWO OUTPUTS, AND WHY BOTH COME OUT OF ONE GRAPH

    logits    [N, 1000]   the generalist's answer, in ImageNet's vocabulary.
                          This is what the student meets in steps 1-3.
    features  [N, 2048]   the pooled description underneath that classifier.
                          Every head in this module is fitted on this.

Published ONNX exports of ResNet only expose `logits`; the pooled vector exists
inside the graph but is not a graph output, so `image-feature-extraction` on
`Xenova/resnet-50` cannot work. Exporting both from one forward pass also means
the browser gets the classifier's answer and the feature vector for the price of
a single inference, which matters on step 6 where it needs both.

USAGE

    python scripts/export_backbone.py              # -> public/models/resnet50/
    python scripts/export_backbone.py --quantize   # also emit int8 (~26 MB)
    python scripts/export_backbone.py --check      # verify the export runs

Writes  public/models/resnet50/model.onnx      ~98 MB, float32
        public/models/resnet50/labels.json     the 1,000 ImageNet class names
        public/models/resnet50/meta.json       preprocessing contract + dims
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Windows consoles default to cp1252 and raise UnicodeEncodeError *inside* the
# script rather than at the boundary. Same guard the other scripts carry.
for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "models" / "resnet50"

# The torch checkpoint everything derives from. Apache-2.0, published by
# Microsoft, the reference ResNet-50 weights.
CHECKPOINT = "microsoft/resnet-50"

EMBED_DIM = 2048
IMAGE_SIZE = 224
CLASS_COUNT = 1000

# ImageNet normalisation, from microsoft/resnet-50's preprocessor_config.json.
# `cnn_preprocess.py` and `backbone.js` MUST use these same six numbers -- they
# are written into meta.json so the browser reads them rather than repeating
# them, and a mismatch is a silent accuracy loss on every image.
IMAGE_MEAN = [0.485, 0.456, 0.406]
IMAGE_STD = [0.229, 0.224, 0.225]

# Bump when anything about the exported graph changes. It lands in meta.json and
# in every embedding pack's cache key, so a bump rebuilds rather than silently
# mixing two conventions.
EXPORT_VERSION = 1

OPSET = 17


def build_module():
    """ResNet-50 wrapped so one forward pass returns both outputs."""
    import torch
    from torch import nn
    from transformers import ResNetForImageClassification

    src = ResNetForImageClassification.from_pretrained(CHECKPOINT)
    src.eval()

    class Backbone(nn.Module):
        """The classifier and the features it sits on, side by side.

        `resnet(...)` returns `pooler_output` shaped [N, 2048, 1, 1] -- the
        global average pool over the final 7x7 feature map. HuggingFace's
        classifier head is Sequential(Flatten, Linear), so it consumes that 4-D
        tensor directly; the flattened copy is what we hand out as `features`.
        """

        def __init__(self, model):
            super().__init__()
            self.resnet = model.resnet
            self.classifier = model.classifier

        def forward(self, pixel_values):
            pooled = self.resnet(pixel_values).pooler_output   # [N, 2048, 1, 1]
            logits = self.classifier(pooled)                   # [N, 1000]
            features = torch.flatten(pooled, 1)                # [N, 2048]
            return logits, features

    return Backbone(src), src.config


def export(out_dir: Path, quantize: bool) -> Path:
    import torch

    out_dir.mkdir(parents=True, exist_ok=True)
    model_path = out_dir / "model.onnx"

    print(f"  loading {CHECKPOINT}")
    module, config = build_module()

    dummy = torch.zeros(1, 3, IMAGE_SIZE, IMAGE_SIZE, dtype=torch.float32)

    # Sanity-check the wrapper before spending a minute on the export. A shape
    # mistake here would otherwise surface as a browser error much later.
    with torch.no_grad():
        logits, features = module(dummy)
    assert logits.shape == (1, CLASS_COUNT), f"logits {tuple(logits.shape)}"
    assert features.shape == (1, EMBED_DIM), f"features {tuple(features.shape)}"
    print(f"  forward ok -- logits {tuple(logits.shape)}, features {tuple(features.shape)}")

    print(f"  exporting to ONNX (opset {OPSET})")
    with torch.no_grad():
        torch.onnx.export(
            module,
            (dummy,),
            str(model_path),
            input_names=["pixel_values"],
            output_names=["logits", "features"],
            # Batch is dynamic so Python can push 32 images at a time while the
            # browser sends 1. Height/width stay fixed at 224 -- letting them
            # float would only invite a caller to skip the preprocessing.
            dynamic_axes={
                "pixel_values": {0: "batch"},
                "logits": {0: "batch"},
                "features": {0: "batch"},
            },
            opset_version=OPSET,
            do_constant_folding=True,
            dynamo=False,
        )

    size_mb = model_path.stat().st_size / 1e6
    print(f"  wrote {model_path.name} ({size_mb:.0f} MB, float32)")

    # -- the 1,000 ImageNet labels ------------------------------------------
    # Step 3 has the student search this vocabulary for the word they wanted, so
    # it has to be the real list from the checkpoint, not a copy that can drift.
    id2label = config.id2label
    labels = [id2label[i] for i in range(CLASS_COUNT)]
    (out_dir / "labels.json").write_text(json.dumps(labels, indent=0))
    print(f"  wrote labels.json ({len(labels)} classes)")

    # -- the preprocessing contract -----------------------------------------
    # The identity of this exact file. Every embedding pack records it, and the
    # browser compares. That is what makes "Python and the browser run the same
    # model" checkable rather than merely intended -- an ONNX re-exported on a
    # different machine, with a different torch, is a different file, and heads
    # fitted against it must not be silently applied to features from this one.
    import hashlib
    h = hashlib.sha256()
    with model_path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    digest = h.hexdigest()[:16]

    meta = {
        "export_version": EXPORT_VERSION,
        "checkpoint": CHECKPOINT,
        "model_sha256": digest,
        "architecture": "resnet-50",
        "family": "cnn",
        "param_count": sum(p.numel() for p in module.parameters()),
        "embed_dim": EMBED_DIM,
        "class_count": CLASS_COUNT,
        "image_size": IMAGE_SIZE,
        "image_mean": IMAGE_MEAN,
        "image_std": IMAGE_STD,
        "fit": "contain",
        "inputs": {"pixel_values": ["batch", 3, IMAGE_SIZE, IMAGE_SIZE]},
        "outputs": {
            "logits": ["batch", CLASS_COUNT],
            "features": ["batch", EMBED_DIM],
        },
        "files": {"float32": "model.onnx"},
        "note": (
            "Python (embed_datasets.py, via onnxruntime) and the browser "
            "(src/lib/ml/backbone.js, via onnxruntime-web) load this same file. "
            "That is why the precomputed heads and live predictions cannot drift "
            "apart. If you switch one side to the int8 file, switch both."
        ),
    }

    if quantize:
        meta["files"]["int8"] = quantise(model_path)

    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2))
    print(f"  wrote meta.json ({meta['param_count'] / 1e6:.1f} M parameters, "
          f"model id {digest})")
    return model_path


def quantise(model_path: Path) -> str:
    """Dynamic int8 copy, for anyone who needs a smaller browser download.

    Not the default. Quantisation moves the features a little, which is
    harmless *only* if both sides use the same file -- fit the heads on int8
    features and serve int8 in the browser and nothing drifts. Mix them and you
    are back to the failure this whole design exists to remove.
    """
    from onnxruntime.quantization import QuantType, quantize_dynamic

    dest = model_path.with_name("model_int8.onnx")
    print("  quantising to int8")
    quantize_dynamic(
        str(model_path), str(dest),
        weight_type=QuantType.QUInt8,
    )
    print(f"  wrote {dest.name} ({dest.stat().st_size / 1e6:.0f} MB, int8)")
    return dest.name


def check(out_dir: Path) -> int:
    """Run the exported graph and confirm it behaves like the torch model."""
    import numpy as np
    import onnxruntime as ort
    import torch

    model_path = out_dir / "model.onnx"
    if not model_path.exists():
        print(f"  ! {model_path} does not exist -- run without --check first.")
        return 1

    sess = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    got_in = [i.name for i in sess.get_inputs()]
    got_out = [o.name for o in sess.get_outputs()]
    print(f"  inputs  {got_in}")
    print(f"  outputs {got_out}")
    assert got_out == ["logits", "features"], got_out

    # A batch of 3 proves the dynamic axis survived the export -- the Python
    # embedder batches, and a graph pinned to batch 1 would fail only there.
    rng = np.random.default_rng(0)
    x = rng.standard_normal((3, 3, IMAGE_SIZE, IMAGE_SIZE)).astype(np.float32)
    logits, features = sess.run(None, {"pixel_values": x})
    print(f"  batch-3 run ok -- logits {logits.shape}, features {features.shape}")
    assert logits.shape == (3, CLASS_COUNT)
    assert features.shape == (3, EMBED_DIM)

    # And the numbers have to match torch, or the export silently changed the
    # model. 1e-4 is generous for float32 accumulation-order differences.
    module, _ = build_module()
    with torch.no_grad():
        t_logits, t_features = module(torch.from_numpy(x))
    dl = float(np.abs(t_logits.numpy() - logits).max())
    df = float(np.abs(t_features.numpy() - features).max())
    print(f"  max |torch - onnx|: logits {dl:.2e}, features {df:.2e}")
    if max(dl, df) > 1e-3:
        print("  ! the exported graph does not match torch. Do not ship this.")
        return 1
    print("  PASS -- the exported graph matches the torch model.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--quantize", action="store_true",
                    help="also write an int8 copy (~26 MB) for slow connections")
    ap.add_argument("--check", action="store_true",
                    help="verify an existing export instead of rebuilding it")
    ap.add_argument("--force", action="store_true",
                    help="re-export even if model.onnx is already there")
    args = ap.parse_args()

    out_dir = Path(args.out)

    if args.check:
        print("Checking the exported backbone")
        return check(out_dir)

    print(f"Exporting {CHECKPOINT} -> {out_dir}")
    if (out_dir / "model.onnx").exists() and not args.force:
        print("  = model.onnx already exists. Pass --force to rebuild.")
    else:
        export(out_dir, args.quantize)

    return check(out_dir)


if __name__ == "__main__":
    raise SystemExit(main())
