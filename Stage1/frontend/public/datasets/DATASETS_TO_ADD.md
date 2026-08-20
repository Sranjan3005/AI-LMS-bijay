# Datasets to add — sourcing spec

This is the shopping list for the datasets **you** download and drop in. Every path
below is already wired up in code: the moment the files exist, the Computer Vision
module starts training on them for real and the Data Library starts serving them.

Until then the app still runs — it shows a clear "dataset not installed yet" card
instead of silently faking it.

> **Rule of thumb:** put raw downloads under `_raw/` (git-ignored, any size), then run
> the pack script. Only the small packed output is committed.

---

## 1. Digit datasets — REQUIRED (powers real in-browser training)

### What the code needs

```
public/datasets/mnist/
  clean.png      # sprite: N tiles of 28x28, laid out in one column-strip
  messy.png      # same layout
  noisy.png      # same layout
  labels.json    # { "clean": [7,2,1,...], "messy": [...], "noisy": [...] }
```

You do **not** create these by hand. You drop raw images here:

```
public/datasets/mnist/_raw/clean/<digit>/*.png     # <digit> = 0..9
public/datasets/mnist/_raw/messy/<digit>/*.png     # optional (see below)
public/datasets/mnist/_raw/noisy/<digit>/*.png     # optional (see below)
```

…then run:

```bash
python Stage1/scripts/pack_digit_sprites.py
```

It samples ~700 images per variant (balanced across the 10 digits), normalises them
to 28×28 white-on-black, and writes the sprites + labels. Target output is ~1.5 MB total.

### Where to download

**`clean/` — required. Pick ONE:**

| Source | Link | Notes |
|---|---|---|
| **mnist_png** (easiest) | https://github.com/myleott/mnist_png | Download `mnist_png.tar.gz`, extract, copy `mnist_png/training/<0-9>/` into `_raw/clean/<0-9>/`. Already PNG, already foldered by digit. **This is the one I'd grab.** |
| Kaggle MNIST | https://www.kaggle.com/datasets/hojjatk/mnist-dataset | Original idx binaries — needs an extra conversion step. |
| MNIST homepage | https://yann.lecun.com/exdb/mnist/ | The canonical source, idx format. |

You only need ~100 images per digit (1000 total). Copying the whole 60k set is fine
too — the pack script subsamples.

**`messy/` — strongly preferred, real sloppy handwriting.** If you skip it, the pack
script derives it by applying **real augmentation** (rotation ±18°, shear, stroke
thickening/thinning, random translation) to the clean set, and the UI honestly labels
it "derived by augmentation" rather than claiming it's a separate collection.

| Source | Link | Notes |
|---|---|---|
| **EMNIST-Digits** | https://www.nist.gov/itl/products-and-services/emnist-dataset | Same 28×28 format as MNIST, noticeably more variable handwriting. Grab `emnist-digits`. |
| Kaggle: Handwritten Digits | https://www.kaggle.com/datasets/jcprogjava/handwritten-digits-dataset-not-in-mnist | Explicitly *not* MNIST — different writers, messier. |
| USPS digits | https://www.kaggle.com/datasets/bistaumanga/usps-dataset | Scanned from real postal envelopes — genuinely messy. |

**`noisy/` — optional.** Best left to the pack script, which adds real salt-and-pepper
noise, Gaussian blur and contrast knock-down. That is exactly how noise robustness is
studied in practice, so deriving it here is legitimate, not a shortcut. Supply your own
only if you have genuinely scanned/photographed low-quality digits.

---

## 2. Handwriting (word/line) datasets — REQUIRED for The Handwriting Decoder

```
public/datasets/handwriting/clean/01.jpg .. 08.jpg    # neat print
public/datasets/handwriting/messy/01.jpg .. 08.jpg    # sloppy cursive
public/datasets/handwriting/noisy/01.jpg .. 08.jpg    # faded / smudged / low-contrast scans
```

You already have **5 images in each** of these folders — that is enough to ship. Adding
3 more each makes the preview strip and the accuracy measurement more convincing.

These drive a **measured**, not simulated, result: the app runs the real Tesseract OCR
engine over each variant and reports the accuracy it actually achieves. Tesseract
genuinely degrades on messy and noisy input, so no faking is needed anywhere.

| Source | Link | Notes |
|---|---|---|
| **IAM Handwriting DB** | https://fki.tic.heia-fr.ch/databases/iam-handwriting-database | The standard academic set. Free, but requires registration. Best quality. |
| Kaggle: Handwriting Recognition | https://www.kaggle.com/datasets/landlord/handwriting-recognition | 400k handwritten name images, no registration wall. |
| GNHK (goodnotes) | https://www.goodnotes.com/gnhk | Real-world handwritten notes, CC BY-NC. Check the licence fits your use. |
| Wikimedia Commons | https://commons.wikimedia.org/wiki/Category:Handwriting | Hand-pick a few CC-licensed samples, like the existing sets. |

**Please append every new file to `ATTRIBUTIONS.md`** in the same format as the existing
entries — licence, author, source URL. The mushroom/trash/wildlife/signs sets are all
recorded there and I'd like to keep that clean.

---

## 3. Already present — nothing to do

These are installed and working; listed so you don't go hunting for them:

- `mushroom/{red,brown}_{safe,poison}/` — 16 images
- `trash/{good,bad}/` — 10 images
- `wildlife/{endangered,common,scene}/` — 9 images
- `signs/` — 5 images
- `edge/` — 3 images
- `restaurant_records.txt`, `sample_reviews.txt`

---

## 4. Generated by me — nothing to do

- `attendance/` — the class register sheet and student arrival photos for the new
  Auto-Attendance scenario. These are procedurally drawn illustrated avatars, not
  photos of real people, so there is no privacy or licensing issue and the vision
  model will actually describe them distinctly.

---

## Checklist

- [x] `mnist/_raw/clean/<0-9>/` filled from **mnist_png** — 200 real MNIST images per digit
- [ ] `mnist/_raw/messy/<0-9>/` from EMNIST or USPS *(optional — currently derived)*
- [x] `python Stage1/scripts/pack_digit_sprites.py --per-variant 900` run — sprites committed (676 KB)
- [ ] `handwriting/{clean,messy,noisy}/` topped up to ~8 images each *(optional — 5 each works)*
- [x] Sources recorded in `ATTRIBUTIONS.md`

**Installed on 2026-07-29.** Measured result of training on these, per variant
(from `lib/cv/digitTrainer.js`, held-out test splits):

|  trained ↓ / tested → | clean | messy | noisy |
|---|---|---|---|
| **clean** | 94% | 88% | 44% |
| **messy** | 96% | 91% | 54% |
| **noisy** | 78% | 73% | 81% |

A clean-trained model loses 51 points on noisy input; the noisy-trained one wins
there (81%) but gives up ground on clean. That is the whole lesson, measured.

To swap in genuinely-collected messy digits later, drop them into
`mnist/_raw/messy/<0-9>/` and re-run the pack script — nothing else changes, and
the "derived by augmentation" note disappears from the UI on its own.
