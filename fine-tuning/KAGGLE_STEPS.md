# Build the whole thing on Kaggle

Everything — download, embed, heads, and the 15-cell grid — runs on Kaggle's free
GPU. You download a few MB of artefacts at the end.

**Why:** embedding is ~226 ms/image on this laptop's CPU and roughly 15 ms on a
T4. Five domains × 2,400 images × 6 augmentation variants is 72,000 forward
passes: **~2.5 hours locally, ~10 minutes there.** The full fine-tune grid is
~24 h locally and ~2 h there. The outputs are small. So: compute remote,
artefacts local.

| Stage | What | Kaggle | This laptop |
|---|---|---|---|
| `fetch` | download 5 domains | ~15 min | ~15 min |
| `embed` | CNN features + 6 variants | **~4 min** | ~45 min |
| `heads` | a real head at every data rung | ~1 min | ~1 min |
| `grid` | 15 full fine-tunes | **~2 h** | ~24 h |

---

## Step 0 — Two things, once

**Phone-verify your Kaggle account.** kaggle.com → avatar → **Settings** →
**Phone Verification**. Without it the Accelerator dropdown stays greyed out and
you will not understand why. You get **30 GPU-hours/week**; this uses ~2.5.

**Get an API token.** Same Settings page → **API** → **Create New Token**. Save
`kaggle.json` to `C:\Users\<you>\.kaggle\kaggle.json`. The mushroom fetcher
needs it, and it is the same account either way.

---

## Step 1 — Upload the scripts as a private Kaggle Dataset

Neater than pasting eight files into `%%writefile` cells, and it versions.

```bash
cd "c:/Users/Bijaya kumar Behera/Desktop/AI_model_dynamic/Fine-tuning"
python -c "import shutil; shutil.make_archive('finetune-scripts','zip','scripts')"
```

kaggle.com → **Datasets** → **New Dataset** → drop in `finetune-scripts.zip` →
title **`finetune-scripts`** → keep it **Private** → Create.

Re-upload a new version whenever the scripts change.

---

## Step 2 — New notebook

**Code** → **New Notebook**, then in the right-hand panel:

- **Accelerator** → **GPU T4 x2**
- **Internet** → **On** ← required; the fetchers download from Oxford, GBIF and Kaggle
- **Persistence** → **Files only**
- **Input** → **Add Input** → your `finetune-scripts`

---

## Step 3 — Cell 1: set up and check the GPU

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

**It must print a GPU name and `ready: 12 scripts`.** Two hours of silent CPU
training is the only unrecoverable mistake here — stop if the GPU line says
`*** NONE ***`.

*(Safer than pasting your key inline: Kaggle **Add-ons → Secrets**, then read it
with `UserSecretsClient`.)*

---

## Step 4 — Cell 2: prove it before spending two hours

```python
!python /kaggle/working/scripts/build_all.py --kaggle --dry-run
!python /kaggle/working/scripts/train_full.py --smoke --workers 0 --fp16
```

The smoke test trains a real ResNet-50 on synthetic images in ~15 s and ends:

```
OK: trained on 12, held-out accuracy 0.667, 94.4 MB
```

The accuracy there is meaningless — three synthetic classes, six held-out
images. What is being proved is that the pipeline runs end to end.

### ⚠️ Ignore the MISMATCH report

Loading the checkpoint prints a load report ending in two `MISMATCH` rows:

```
classifier.1.weight | MISMATCH | ckpt: torch.Size([1000, 2048]) vs model: torch.Size([12, 2048])
classifier.1.bias   | MISMATCH | ckpt: torch.Size([1000])      vs model: torch.Size([12])
```

**This is not an error — it is the whole point.** ImageNet's 1,000-way
classifier is being thrown away and replaced with a 12-way one. That is what
"replace the last layer" means. Everything *below* the classifier loads from
the checkpoint.

You do not have to take my word for it. Every run checks:

```
backbone check: two loads identical=True, cos(red,blue)=0.673 -> pretrained weights loaded OK
```

If that ever said `*** NOT LOADED ***`, `train_full.py` **refuses to train**,
because otherwise all 15 cells would be from-scratch runs wearing a fine-tune's
name.

---

## ⚠️ Before anything: ship the ONNX, do not rebuild it there

Put your local `public/models/resnet50/` into the uploaded dataset, and copy it
into place on Kaggle **before** running any stage:

```python
import shutil, pathlib
dst = pathlib.Path("/kaggle/working/public/models/resnet50")
dst.mkdir(parents=True, exist_ok=True)
src = pathlib.Path("/kaggle/input/<your-dataset>/public/models/resnet50")
for f in ("model.onnx", "labels.json", "meta.json"):
    shutil.copy(src / f, dst / f)
print("backbone id:", __import__("json").loads((dst/"meta.json").read_text())["model_sha256"])
```

It must print:

```
backbone id: 06dd333a0f2af03b
```

**Why this matters more than it looks.** `export_backbone.py` skips if
`model.onnx` is already there, so copying it in makes the `export` stage a
no-op and every embedding on Kaggle is computed by the *same file the browser
runs at home*. Let Kaggle export its own instead — different torch, different
transformers — and you may get a subtly different graph. The heads fitted there
would then be applied to features from your local export. Nothing would crash;
the demo would just be quietly wrong, which is the exact failure this whole
build was restructured to remove.

Every pack now records which export produced it, and `src/lib/ml/heads.js`
refuses a pack whose stamp does not match the running model — so if you skip
this step you get a clear error rather than bad predictions. Still: copy the
file.

---

## Step 5 — Cell 3: fetch, embed, heads

```python
!python /kaggle/working/scripts/build_all.py --kaggle --stage export fetch embed heads --keep-going
```

~25 minutes for all five domains. `--keep-going` means one domain failing to
download does not abandon the other four.

### ⚠️ `export` must be in that list

`export` builds `public/models/resnet50/model.onnx` from `microsoft/resnet-50`.
It takes about a minute, it is idempotent, and **every later stage is
meaningless without it** — `embed` loads that exact file, and so does the
browser. Leave it out and `embed` fails on the first domain with a missing-file
error, after you have already waited for the downloads.

`--stage all` includes it. The only reason to omit it is if you are re-running
`embed` in the same session and the file is already there, in which case it is a
no-op anyway. Just leave it in.

Check what landed:

```python
!du -sh /kaggle/working/embeddings /kaggle/working/heads
!cat /kaggle/working/heads/index.json
```

**Read the accuracies here.** If `v10` is not clearly worse than the full set,
something is wrong with the data and the grid will not fix it.

---

## Step 6 — Cell 4: the 15-cell grid

```python
!python /kaggle/working/scripts/build_all.py --kaggle --stage grid
```

~2 hours. Leave the tab open — Kaggle stops the session if the browser
disconnects too long.

**It resumes.** Each finished cell writes a `card.json` with a build key, and a
re-run skips anything already done. A dropped session costs one cell, not the run.

---

## Step 7 — Download

`build_all.py --kaggle` zips the small artefacts for you:

```python
!ls -lh /kaggle/working/artefacts.zip     # embeddings + heads, a few MB
!du -sh /kaggle/working/models/full       # the grid, ~2.5 GB at fp16
```

Then **Save Version → Save & Run All (Commit)** and take the files from the
notebook's **Output** tab, or pull them straight from the file browser.

Locally:

```bash
# artefacts.zip -> Fine-tuning/public/   (creates embeddings/ and heads/)
# models/full   -> Fine-tuning/models/full/
npm run dev
```

Both are git-ignored — they are build outputs, not source.

---

## Running only part of it

`build_all.py` takes any subset of stages and domains, locally or on Kaggle:

```bash
python scripts/build_all.py --stage all
python scripts/build_all.py --stage embed heads --domains pets flowers
python scripts/build_all.py --stage fetch --domains mushrooms --mushroom-source gbif
python scripts/build_all.py --dry-run
```

Every stage caches on a content hash, so re-running is cheap. Change one image
and only what depends on it rebuilds.

---

## Limits and gotchas

| | |
|---|---|
| Money | **₹0** |
| GPU allowance | 30 h/week, resets weekly. This uses ~2.5. |
| Session length | ~12 h, and it stops if the tab is closed too long |
| Output cap | ~20 GB — `--kaggle` implies `--fp16`, keeping the grid at ~2.5 GB |
| Internet | must be **On**, or no fetcher works |
| Phone verification | required for GPU, and easy to miss |

**Nothing about where these were built reaches the product.** Embeddings, heads
and weights are static files. Kaggle is a build machine, not a dependency.
