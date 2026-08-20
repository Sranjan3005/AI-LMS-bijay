"""
vit_preprocess.py -- how an image becomes ViT input, written out explicitly.

WHY THIS IS HAND-WRITTEN RATHER THAN `AutoImageProcessor`

Two reasons, and the second one is the important one.

1. `AutoImageProcessor` requires torchvision. The only Python environment on
   this machine is `Stage1/backend/venv`, which is the live backend environment
   for the whole platform -- installing into it to run a build script is a bad
   trade.

2. **The browser has to do the same thing, and `AutoImageProcessor` is not
   available there.** transformers.js has its own processor, `augment.js` has
   its own canvas rendering, and this file has to agree with both. When the
   preprocessing is three lines of numpy you can read them side by side and
   check. When it is a config-driven library you are trusting that two
   independent implementations of a spec happen to match, and a mismatch shows
   up as heads that quietly misclassify rather than as an error.

VALUES, from google/vit-base-patch16-224-in21k's preprocessor_config.json:

    size        224 x 224
    rescale     x / 255
    normalize   (x - 0.5) / 0.5     ->  output range [-1, 1]

THE FITTING RULE, which is the part that actually bites:

    Contain-fit onto a black 224x224 square, preserving aspect ratio.

`ViTImageProcessor` would *stretch* to 224x224 instead. We deliberately do not,
because `augment.js` contain-fits when it renders variants -- and it has to,
since rotation needs a canvas anyway. Both sides must letterbox or both must
stretch; mixing them is a silent accuracy loss on every non-square photo.

`backbone.js: embed()` enforces the browser half by contain-fitting internally,
so no caller can forget. This file is the Python half. `check_parity.py` is what
proves they agree.
"""

from __future__ import annotations

import numpy as np

IMAGE_SIZE = 224
IMAGE_MEAN = np.array([0.5, 0.5, 0.5], dtype=np.float32)
IMAGE_STD = np.array([0.5, 0.5, 0.5], dtype=np.float32)


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
    """PIL image -> (3, 224, 224) float32 in [-1, 1], channels-first.

    Accepts any size; contain-fits first if it is not already 224x224.
    """
    from PIL import Image

    if img.mode != "RGB":
        img = img.convert("RGB")
    if img.size != (IMAGE_SIZE, IMAGE_SIZE):
        img = contain_fit(img)

    arr = np.asarray(img, dtype=np.float32) / 255.0        # HWC, [0, 1]
    arr = (arr - IMAGE_MEAN) / IMAGE_STD                    # HWC, [-1, 1]
    return np.transpose(arr, (2, 0, 1)).copy()              # CHW


def batch_pixel_values(images) -> np.ndarray:
    """List of PIL images -> (n, 3, 224, 224) float32."""
    if not images:
        return np.zeros((0, 3, IMAGE_SIZE, IMAGE_SIZE), dtype=np.float32)
    return np.stack([to_pixel_values(im) for im in images])


def as_torch(images):
    """Same, as a torch tensor -- the only place torch is touched."""
    import torch
    return torch.from_numpy(batch_pixel_values(images))
