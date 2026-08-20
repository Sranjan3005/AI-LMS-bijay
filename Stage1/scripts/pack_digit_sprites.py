#!/usr/bin/env python3
"""
pack_digit_sprites.py — turn a folder of raw digit PNGs into the three small
sprite sheets the browser trains on.

Input  (git-ignored, any size):
    frontend/public/datasets/mnist/_raw/<variant>/<digit>/*.png
    variant = clean | messy | noisy      digit = 0..9

Output (committed, ~1.5 MB total):
    frontend/public/datasets/mnist/clean.png   28 x (28*N) vertical strip
    frontend/public/datasets/mnist/messy.png
    frontend/public/datasets/mnist/noisy.png
    frontend/public/datasets/mnist/labels.json
    frontend/public/datasets/mnist/meta.json

`clean` is required. If `messy` or `noisy` is missing we DERIVE it from clean by
real augmentation and record that fact in meta.json, so the UI can say so rather
than pretending it is a separately collected dataset.

Every tile is normalised exactly the way lib/cv/imageOps.js:extractInput28()
normalises a drawing at prediction time — crop to ink, scale the long side to 20,
centre by centre-of-mass in a 28x28 frame. Training and inference must see the
same distribution or the accuracy numbers mean nothing.

Usage:  python Stage1/scripts/pack_digit_sprites.py [--per-variant 700]
"""

import argparse
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "frontend" / "public" / "datasets" / "mnist"
RAW = ROOT / "_raw"
VARIANTS = ("clean", "messy", "noisy")
TILE = 28
BOX = 20  # MNIST leaves a 4px margin, so the ink fits a 20x20 box

random.seed(20260729)
rng = np.random.default_rng(20260729)


# ── normalisation (mirrors extractInput28 in imageOps.js) ───────────────────────

def normalise(arr: np.ndarray) -> np.ndarray | None:
    """float array in [0,1], white ink on black → centred 28x28, or None if blank."""
    ys, xs = np.nonzero(arr > 0.15)
    if len(xs) == 0:
        return None

    crop = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    bh, bw = crop.shape
    scale = BOX / max(bw, bh)
    sw, sh = max(1, round(bw * scale)), max(1, round(bh * scale))

    small = np.asarray(
        Image.fromarray((crop * 255).astype(np.uint8)).resize((sw, sh), Image.BILINEAR),
        dtype=np.float32,
    ) / 255.0

    mass = small.sum()
    if mass > 0:
        yy, xx = np.mgrid[0:sh, 0:sw]
        cy, cx = (small * yy).sum() / mass, (small * xx).sum() / mass
    else:
        cy, cx = sh / 2, sw / 2

    out = np.zeros((TILE, TILE), dtype=np.float32)
    off_y, off_x = round(14 - cy), round(14 - cx)
    for y in range(sh):
        ty = y + off_y
        if not (0 <= ty < TILE):
            continue
        for x in range(sw):
            tx = x + off_x
            if 0 <= tx < TILE:
                out[ty, tx] = small[y, x]
    return out


def load_gray(path: Path) -> np.ndarray:
    """Read any image as float [0,1], white ink on black (auto-inverts dark-on-light)."""
    arr = np.asarray(Image.open(path).convert("L"), dtype=np.float32) / 255.0
    # A scan of ink on paper is mostly bright; MNIST is mostly dark. Flip if needed.
    if arr.mean() > 0.5:
        arr = 1.0 - arr
    return arr


# ── augmentation used only when a variant is not supplied ──────────────────────

def make_messy(arr: np.ndarray) -> np.ndarray:
    """Rotation + shear + stroke-weight change: distortions that SURVIVE the
    crop-and-recentre in normalise(), so they genuinely challenge the model."""
    img = Image.fromarray((arr * 255).astype(np.uint8))
    img = img.rotate(rng.uniform(-18, 18), resample=Image.BILINEAR, expand=True)

    shear = rng.uniform(-0.35, 0.35)
    w, h = img.size
    img = img.transform(
        (w + int(abs(shear) * h), h),
        Image.AFFINE,
        (1, shear, -shear * h if shear > 0 else 0, 0, 1, 0),
        resample=Image.BILINEAR,
    )

    out = np.asarray(img, dtype=np.float32) / 255.0
    weight = rng.uniform(0.6, 1.6)  # thin, or fatten, the stroke
    out = np.clip(out * weight, 0, 1)
    return out


def make_noisy(arr: np.ndarray) -> np.ndarray:
    """Blur + contrast loss + sensor noise, applied BEFORE normalisation so the
    noise also blows out the ink bounding box — exactly what a bad scan does."""
    img = Image.fromarray((arr * 255).astype(np.uint8))
    img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.4, 1.1)))
    out = np.asarray(img, dtype=np.float32) / 255.0

    # The background lift stays under normalise()'s 0.15 ink threshold on
    # average. Push it higher and the grain itself becomes "ink", so the crop
    # grabs the whole frame and every digit comes out shrunk to a dot.
    out = out * rng.uniform(0.55, 0.8) + rng.uniform(0.02, 0.07)   # washed out
    out = np.clip(out + rng.normal(0, 0.07, out.shape), 0, 1)      # gaussian grain

    pepper = rng.random(out.shape) < 0.012                         # salt & pepper
    out[pepper] = rng.random(pepper.sum())
    return out


# ── collection ─────────────────────────────────────────────────────────────────

def score_cleanliness(arr: np.ndarray) -> float:
    ys, xs = np.nonzero(arr > 0.15)
    if len(xs) < 10:
        return 999.0
    cov = np.cov(xs, ys)[0, 1]
    return abs(float(cov))

def collect(variant: str, per_digit: int) -> tuple[list[np.ndarray], list[int]]:
    """Read up to per_digit images for each label 0-9 from _raw/<variant>/<d>/."""
    base = RAW / variant
    if not base.is_dir():
        return [], []

    tiles: list[np.ndarray] = []
    labels: list[int] = []
    for digit in range(10):
        folder = base / str(digit)
        if not folder.is_dir():
            continue
        files = sorted(p for p in folder.iterdir()
                       if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp"})
        random.shuffle(files)
        
        # Load all valid tiles for this digit
        candidates = []
        for path in files:
            try:
                tile = normalise(load_gray(path))
            except Exception as exc:
                print(f"  ! skipped {path.name}: {exc}")
                continue
            if tile is not None:
                candidates.append((tile, path))

        # Sort candidates by cleanliness if variant is 'clean'
        if variant == 'clean':
            candidates.sort(key=lambda x: score_cleanliness(x[0]))
        else:
            random.shuffle(candidates)

        taken = 0
        for tile, path in candidates[:per_digit]:
            tiles.append(tile)
            labels.append(digit)
            taken += 1
        print(f"  {variant}/{digit}: {taken} (from {len(candidates)})")
    return tiles, labels


def derive(source_paths: list[Path], labels: list[int], fn) -> list[np.ndarray]:
    out = []
    for path in source_paths:
        tile = normalise(fn(load_gray(path)))
        out.append(tile if tile is not None else np.zeros((TILE, TILE), np.float32))
    return out


def write_sprite(tiles: list[np.ndarray], path: Path) -> None:
    """Stack tiles into one 28-wide vertical strip — trivial to slice with
    drawImage(sprite, 0, i*28, 28, 28, ...) in the browser."""
    strip = (np.vstack(tiles) * 255).astype(np.uint8)
    Image.fromarray(strip, mode="L").save(path, optimize=True)
    print(f"  wrote {path.name}  ({len(tiles)} tiles, {path.stat().st_size // 1024} KB)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-variant", type=int, default=700,
                    help="total tiles per variant (split evenly across the 10 digits)")
    args = ap.parse_args()
    per_digit = max(1, args.per_variant // 10)

    if not (RAW / "clean").is_dir():
        raise SystemExit(
            f"No clean digits found.\n"
            f"Expected: {RAW / 'clean'}/<0-9>/*.png\n"
            f"See datasets/DATASETS_TO_ADD.md for where to download them."
        )

    ROOT.mkdir(parents=True, exist_ok=True)
    labels_out: dict[str, list[int]] = {}
    meta: dict[str, dict] = {}

    print("clean:")
    clean_tiles, clean_labels = collect("clean", per_digit)
    if not clean_tiles:
        raise SystemExit(f"{RAW / 'clean'} exists but held no readable images.")
    write_sprite(clean_tiles, ROOT / "clean.png")
    labels_out["clean"] = clean_labels
    meta["clean"] = {"source": "real", "count": len(clean_tiles)}

    # Source paths are needed again to derive a variant from the ORIGINAL image
    # rather than from an already-normalised tile.
    clean_files: list[Path] = []
    clean_file_labels: list[int] = []
    for digit in range(10):
        folder = RAW / "clean" / str(digit)
        if not folder.is_dir():
            continue
        files = sorted(p for p in folder.iterdir()
                       if p.suffix.lower() in {".png", ".jpg", ".jpeg", ".bmp"})
        random.shuffle(files)
        for path in files[:per_digit]:
            clean_files.append(path)
            clean_file_labels.append(digit)

    for variant, fn in (("messy", make_messy), ("noisy", make_noisy)):
        print(f"{variant}:")
        tiles, labels = collect(variant, per_digit)
        if tiles:
            meta[variant] = {"source": "real", "count": len(tiles)}
        else:
            print(f"  no _raw/{variant} — deriving by augmentation from clean")
            tiles = derive(clean_files, clean_file_labels, fn)
            labels = list(clean_file_labels)
            meta[variant] = {"source": "derived", "count": len(tiles),
                             "from": "clean", "method": fn.__name__}
        write_sprite(tiles, ROOT / f"{variant}.png")
        labels_out[variant] = labels

    (ROOT / "labels.json").write_text(json.dumps(labels_out), encoding="utf-8")
    (ROOT / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"\nDone. {ROOT}")
    for variant, info in meta.items():
        print(f"  {variant:6s} {info['count']:5d} tiles  ({info['source']})")


if __name__ == "__main__":
    main()
