# The build, explained simply

## The one idea that makes this make sense

**The datasets never touch your laptop.**

Kaggle notebooks have their own internet connection. So the download scripts run
*on Kaggle*, pulling images straight from Oxford, GBIF and Kaggle's own servers.
Your laptop is not in that path at all.

```
     YOUR LAPTOP                          KAGGLE
     ───────────                          ──────
                                          
  1. zip scripts/  ──── upload 50 KB ──►  scripts land here
                                                │
                                                ▼
                                          2. fetch: downloads ~1.5 GB
                                             of images from the internet
                                                │
                                                ▼
                                          3. embed: GPU turns images
                                             into number-vectors
                                                │
                                                ▼
                                          4. heads: trains the small
                                             classifiers
                                                │
                                                ▼
                                          5. grid: trains 15 big models
                                                │
  6. unzip into public/ ◄── download ─────┘
     npm run dev              ~5 MB
```

You upload **50 KB** and download **~5 MB**. The gigabytes stay on Kaggle.

---

## What runs where

| | Runs on | Why |
|---|---|---|
| Zipping `scripts/` | **Laptop** | It is your code |
| Downloading the 5 datasets | **Kaggle** | Kaggle has internet; saves your bandwidth |
| Embedding (images → vectors) | **Kaggle** | Needs the GPU. 10 min there, 2.5 h here |
| Training the heads | **Kaggle** | It is already there; takes a minute |
| The 15-cell grid | **Kaggle** | Needs the GPU. 2 h there, 24 h here |
| `npm run dev` — seeing it work | **Laptop** | It is a website |

**You do not need Python working on your laptop for any of this.** The only
local step is making a zip file, and Windows can do that by right-clicking.

---

## Before you start — three prerequisites

### 1. A Kaggle account with phone verification

kaggle.com → your avatar → **Settings** → **Phone Verification**.

**Why:** without it, the GPU option in a notebook is greyed out. There is no
error message explaining this, which is why it is first on the list.

### 2. A Kaggle API token

Same **Settings** page → **API** section → **Create New Token**. A file called
`kaggle.json` downloads. Open it in Notepad; it looks like:

```json
{"username":"yourname","key":"a1b2c3d4e5f6..."}
```

Keep it somewhere you can copy from.

**Why:** only one of the five fetchers needs it — the mushroom one, which pulls
from a Kaggle-hosted dataset. Everything else downloads from public URLs.

### 3. Node.js on your laptop

Only for the last step (`npm run dev`) to actually look at the module. Nothing
in the build needs it.

---

# The steps

## Step 1 — Zip the scripts (laptop, 1 minute)

In File Explorer, go to:

```
Desktop\AI_model_dynamic\Fine-tuning\
```

Right-click the **`scripts`** folder → **Send to** → **Compressed (zipped)
folder**. You get `scripts.zip`, about 50 KB.

*(Or in a terminal: `cd Fine-tuning` then
`python -c "import shutil; shutil.make_archive('scripts','zip','scripts')"`)*

**What this contains:** the twelve `.py` files that do the work. No images, no
models — just code.

---

## Step 2 — Upload it to Kaggle (browser, 2 minutes)

1. kaggle.com → **Datasets** (left sidebar) → **New Dataset**
2. Drag `scripts.zip` in
3. Title: **`finetune-scripts`**
4. Leave it **Private**
5. **Create**

Kaggle unzips it automatically. It will be readable at
`/kaggle/input/finetune-scripts/` inside any notebook.

**Why a Dataset and not just pasting the code?** Twelve files is too many to
paste, and this way updating them later is one re-upload instead of twelve
copy-pastes.

---

## Step 3 — Make the notebook (browser, 2 minutes)

1. kaggle.com → **Code** → **New Notebook**
2. On the right-hand panel (click `⋮` if you cannot see it):

| Setting | Set it to | Why |
|---|---|---|
| **Accelerator** | **GPU T4 x2** | Otherwise everything is 10× slower |
| **Internet** | **On** | Otherwise no dataset can download |
| **Persistence** | **Files only** | Keeps your output between sessions |

3. **Input** → **Add Input** → search your `finetune-scripts` → **Add**

---

## Step 4 — Cell 1: set up (2 minutes)

Paste this and press ▶.

```python
import torch, shutil, os, glob
from pathlib import Path

print("GPU:", torch.cuda.get_device_name(0) if torch.cuda.is_available() else "*** NONE ***")

!pip -q install "transformers>=4.40" kaggle

# Kaggle mounts a dataset under its URL *slug*, not the title you typed, and the
# nesting varies -- an observed real path was
#   /kaggle/input/datasets/<username>/finetune-scripts/
# which is two levels deeper than the documented /kaggle/input/<slug>/. So find
# build_all.py rather than assuming where it lives.
hits = glob.glob("/kaggle/input/**/build_all.py", recursive=True)
if not hits:
    print("Could not find build_all.py. What is actually mounted:")
    for p in sorted(Path("/kaggle/input").rglob("*"))[:40]:
        print("   ", p)
    raise SystemExit("Add the finetune-scripts dataset under Input, then re-run.")

src = Path(hits[0]).parent
print("scripts found in:", src)
shutil.copytree(src, "/kaggle/working/scripts", dirs_exist_ok=True)

# Kaggle credentials -- only the mushroom fetcher needs these.
os.makedirs("/root/.kaggle", exist_ok=True)
open("/root/.kaggle/kaggle.json","w").write('{"username":"YOURNAME","key":"YOURKEY"}')
os.chmod("/root/.kaggle/kaggle.json", 0o600)

n = len(list(Path("/kaggle/working/scripts").glob("*.py")))
print(f"ready: {n} scripts")   # expect 12
```

### 🛑 It must print a GPU name

If it prints `*** NONE ***`, the accelerator is not attached. Go back to the
right-hand panel and fix it before doing anything else — the rest will silently
run on CPU and take a day instead of two hours.

**What each line does:**
- `torch.cuda.get_device_name` — asks which GPU we got. Should say `Tesla T4`.
- `pip install` — Kaggle has torch and numpy already, but not `transformers`.
- `copytree` — `/kaggle/input/` is read-only, so the scripts are copied to
  `/kaggle/working/` where Python can import them.
- the `kaggle.json` lines — writes your token where the Kaggle library looks.

---

## Step 5 — Cell 2: a 15-second sanity check

```python
!python /kaggle/working/scripts/build_all.py --kaggle --dry-run
!python /kaggle/working/scripts/train_full.py --smoke --workers 0 --fp16
```

**What this does:** `--dry-run` prints the plan without doing anything.
`--smoke` invents 18 fake images and trains a real model on them, end to end,
in about 15 seconds.

**Why bother:** it proves the whole chain works before you spend two hours on it.

Expected last line:

```
OK: trained on 12, held-out accuracy 1.000, 171.7 MB
```

### ⚠️ You will see ~200 lines of red text. Ignore them.

They look like this and say `MISSING` / `UNEXPECTED`:

```
vit.layers.{0...11}.attention.q_proj.weight   | MISSING |
```

**This is not an error.** The `transformers` library renamed some internal parts
of ViT, so it prints every part name while it renames them back. The model loads
correctly.

You do not have to trust that. Every run prints its own check:

```
backbone check: two loads identical=True, cos(red,blue)=0.673 -> pretrained weights loaded OK
```

If that ever said `*** NOT LOADED ***`, the script stops instead of training.

---

## Step 6 — Cell 3: download + embed + heads (~25 minutes)

```python
!python /kaggle/working/scripts/build_all.py --kaggle --stage fetch embed heads --keep-going
```

This is the big one. It does three things for each of the five domains:

| Stage | What actually happens |
|---|---|
| **fetch** | Downloads images. Pets from Oxford (792 MB), Flowers from Oxford (345 MB), Food streams a 5 GB archive and keeps only 12 dishes, Butterflies from GBIF, Mushrooms from a Kaggle dataset. Sorted into `<domain>/<class>/*.jpg`. |
| **embed** | Runs every image through the frozen ResNet-50 once, turning each into 2,048 numbers. Also does the 6 augmentation variants (flip, two rotations, two brightness). ~72,000 passes — about 45 min on a laptop CPU, minutes on a GPU. Uses `public/models/resnet50/model.onnx`, so **run `export_backbone.py` first**. |
| **heads** | Trains a small classifier on those numbers, once for each data amount (1, 2, 5, 10, 25, 50, 100, 250, all per class). Each is real training, evaluated on images it never saw. |

**`--kaggle`** — puts everything under `/kaggle/working/` and saves the big
models at half size.
**`--keep-going`** — if one download fails, the other four still finish.

Then look at what you got:

```python
!cat /kaggle/working/heads/index.json
```

### 👀 Read these numbers before continuing

You are looking for accuracy that **climbs with more data**. If 10-per-class is
already as good as everything-per-class, that domain will not teach anything,
and the next step will not fix it. Cheaper to find out now than after two hours.

---

## Step 7 — Cell 4: the 15 big models (~2 hours)

```python
!python /kaggle/working/scripts/build_all.py --kaggle --stage grid
```

**What this does:** trains 15 complete models — 5 domains × 3 data amounts
(10 per class, 100 per class, everything) — changing every weight each

> ⚠️ **`train_full.py` has not been re-pointed at ResNet-50.** It is still
> ViT-shaped, and it feeds only the third row of Lab A's comparison table,
> which renders as "—" until it is built. Everything else in this workflow
> is current.
time. This is the "full fine-tuning" the module compares against.

Leave the browser tab open. Kaggle stops the session if you disconnect too long.

**If it dies partway, just run the cell again.** Each finished model is recorded,
and a re-run skips what is already done. You lose one model, not the run.

---

## Step 8 — Download the results (laptop)

In the notebook:

```python
!ls -lh /kaggle/working/artefacts.zip     # embeddings + heads, a few MB
!du -sh /kaggle/working/models/full       # the 15 models, ~2.5 GB
```

Click **Save Version** → **Save & Run All (Commit)**. When it finishes, the
**Output** tab has your files. Download:

- `artefacts.zip` → unzip into `Fine-tuning/public/`
  *(gives you `public/embeddings/` and `public/heads/`)*
- `models/full/` → put in `Fine-tuning/models/full/`
  *(only needed for the "full fine-tune" comparison — the module works without it)*

Then, on your laptop:

```bash
cd Fine-tuning
npm run dev
```

Open http://localhost:5180.

---

## Common problems

| Symptom | Cause | Fix |
|---|---|---|
| Accelerator greyed out | Phone not verified | Settings → Phone Verification |
| `CUDA: False` | GPU not attached | Right panel → Accelerator → GPU T4 x2 |
| Every fetcher fails | Internet is Off | Right panel → Internet → On |
| Only mushrooms fails | Bad/missing Kaggle token | Re-check the `kaggle.json` line in Cell 1 |
| 200 lines of red `MISSING` | Nothing — cosmetic | Ignore; check the `backbone check:` line |
| Session died mid-grid | 12 h limit or tab closed | Re-run Cell 4; it resumes |
| `ModuleNotFoundError` | Cell 1 not run | Run Cell 1 first |

---

## Doing it locally instead

Everything works on your laptop too — it is just slower, and you must use the
Python that has torch:

```bash
cd Fine-tuning
PY="../Stage1/backend/venv/Scripts/python.exe"

$PY scripts/build_all.py --stage fetch embed heads
$PY scripts/build_all.py --stage grid          # ~24 hours; use Kaggle
```

If you use the wrong Python you get `ModuleNotFoundError: No module named
'torch'`. The scripts detect this and print the exact command to use instead.

**Pets is already downloaded locally** (2,400 images), so `--stage fetch
--domains pets` will skip straight past it.
