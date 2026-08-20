"""
cnn_preprocess.py -- how an image becomes ResNet input, written out explicitly.

Replaces vit_preprocess.py. Same job, two changed numbers and one changed
reason for caring.

WHY THIS IS HAND-WRITTEN RATHER THAN `AutoImageProcessor`

**The browser has to do the same thing, and `AutoImageProcessor` does not exist
there.** `src/lib/ml/backbone.js` builds its pixel tensor from a canvas, and
this file builds one from PIL. Those two implementations have to agree to about
six decimal places or the precomputed heads are fitted to features the browser
never produces -- and that failure is silent, not loud. When the preprocessing
is four lines of numpy you can read both versions side by side and check. When
it is a config-driven library you are trusting that two independent
implementations of a spec happen to match.

VALUES, from microsoft/resnet-50's preprocessor_config.json:

    size        224 x 224
    rescale     x / 255
    normalize   (x - mean) / std   with ImageNet's per-channel statistics

Note this is *not* the ViT convention. ViT used mean = std = 0.5 on every
channel, giving output in [-1, 1]. ResNet uses the real ImageNet channel
statistics, which are different per channel and do not produce a symmetric
range. Feeding ResNet ViT-normalised pixels does not error -- it just quietly
costs several points of accuracy. The numbers live in
`public/models/resnet50/meta.json` and both sides read them from there.

THE FITTING RULE, which is the part that actually bites:

    Contain-fit onto a black 224x224 square, preserving aspect ratio.

HuggingFace's processor would resize the short edge and centre-crop instead. We
deliberately do not, because `augment.js` contain-fits when it renders variants
-- and it has to, since rotating an image needs a canvas anyway. Both sides must
letterbox or both must crop; mixing them is a silent accuracy loss on every
non-square photo, which is most photos.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MODEL_DIR = ROOT / "public" / "models" / "resnet50"

IMAGE_SIZE = 224

# ImageNet per-channel statistics. Kept as module constants so this file can be
# read on its own, but `load_contract()` re-reads them from the exported
# meta.json and asserts they match -- so an edit to the export cannot leave this
# file quietly disagreeing with the model it feeds.
IMAGE_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGE_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

EMBED_DIM = 2048


def load_contract(model_dir: Path = MODEL_DIR) -> dict:
    """Read the exported model's preprocessing contract, and check we match it.

    Raises rather than warns. A mismatch here means every embedding this script
    produces is wrong in a way nothing downstream can detect.
    """
    meta_path = model_dir / "meta.json"
    if not meta_path.exists():
        raise SystemExit(
            f"{meta_path} is missing.\n"
            "Run:  python scripts/export_backbone.py\n"
            "That builds the ONNX both Python and the browser load."
        )
    meta = json.loads(meta_path.read_text())

    if meta["image_size"] != IMAGE_SIZE:
        raise SystemExit(
            f"cnn_preprocess.IMAGE_SIZE is {IMAGE_SIZE} but the exported model "
            f"wants {meta['image_size']}."
        )
    if not np.allclose(meta["image_mean"], IMAGE_MEAN):
        raise SystemExit(
            f"cnn_preprocess.IMAGE_MEAN is {IMAGE_MEAN.tolist()} but the exported "
            f"model was built with {meta['image_mean']}."
        )
    if not np.allclose(meta["image_std"], IMAGE_STD):
        raise SystemExit(
            f"cnn_preprocess.IMAGE_STD is {IMAGE_STD.tolist()} but the exported "
            f"model was built with {meta['image_std']}."
        )
    if meta["embed_dim"] != EMBED_DIM:
        raise SystemExit(
            f"cnn_preprocess.EMBED_DIM is {EMBED_DIM} but the exported model "
            f"produces {meta['embed_dim']}."
        )
    return meta


def contain_fit(img, size: int = IMAGE_SIZE):
    """Aspect-preserving fit onto a black square. Mirrors augment.js render()."""
    from PIL import Image

    canvas = Image.new("RGB", (size, size), (0, 0, 0))
    if img.width == 0 or img.height == 0:
        return canvas
    scale = min(size / img.width, size / img.height)
    w = max(1, round(img.width * scale))
    h = max(1, round(img.height * scale))
    canvas.paste(img.resize((w, h), Image.BICUBIC), ((size - w) // 2, (size - h) // 2))
    return canvas


def to_pixel_values(img) -> np.ndarray:
    """PIL image -> (3, 224, 224) float32, ImageNet-normalised, channels-first.

    Accepts any size; contain-fits first if it is not already 224x224.
    """
    if img.mode != "RGB":
        img = img.convert("RGB")
    if img.size != (IMAGE_SIZE, IMAGE_SIZE):
        img = contain_fit(img)

    arr = np.asarray(img, dtype=np.float32) / 255.0        # HWC, [0, 1]
    arr = (arr - IMAGE_MEAN) / IMAGE_STD                    # HWC, standardised
    return np.transpose(arr, (2, 0, 1)).copy()              # CHW


def batch_pixel_values(images) -> np.ndarray:
    """List of PIL images -> (n, 3, 224, 224) float32."""
    if not images:
        return np.zeros((0, 3, IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32)
    return np.stack([to_pixel_values(im) for im in images])
