# Fine-Tuning — "Specialist School" (CNN build)

A ten-step lesson that teaches a school student what fine-tuning is by making
them do it. A general model names a thousand things badly; they give it a
subject; it names a dozen things well. Then they measure what that cost, and how
much data it took.

Chiti — the guide — talks them through every step, out loud and in captions,
and **waits** for them to actually do the thing before continuing.

> **This build uses a CNN.** It previously used a Vision Transformer. What
> changed and why is in [What changed from the ViT build](#what-changed-from-the-vit-build).

---

## ⚡ Quick start

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10

```bash
cd fine-tuning
npm install                 # also copies the ONNX Runtime WASM into public/ort/
pip install -r scripts/requirements.txt

python scripts/export_backbone.py     # ONCE — builds the model both sides load
npm run dev                           # → http://localhost:5180
```

`export_backbone.py` writes `public/models/resnet50/model.onnx` (~102 MB). The
app cannot run without it, and it is the only setup step that is not `npm`.

To get the installed datasets working, see [Building the data](#building-the-data).

### Shortcut: the prebuilt assets zip

Everything under `public/` — the exported backbone, the embeddings, the trained
heads, the dataset images and the videos — is gitignored, because it is ~414 MB
and one file alone is over GitHub's 100 MB per-file limit. A fresh clone will
therefore start with an empty Data Library and no model.

If you were sent a `fine-tuning-public.zip`, you can skip both `export_backbone.py`
and `build_all.py`:

```bash
git clone https://github.com/Sranjan3005/AI-LMS-bijay.git
cd AI-LMS-bijay/fine-tuning
npm install

# unzip the archive here, letting it overwrite public/
unzip -o ../../fine-tuning-public.zip

npm run dev                           # -> http://localhost:5180
```

Python is not needed on that path. Without the zip, build the assets yourself
with the commands above.

---

## The model

**One CNN, one file, two outputs.**

| | |
|---|---|
| Architecture | ResNet-50 |
| Weights | `microsoft/resnet-50`, Apache-2.0 |
| Parameters | 25.6 M |
| Trained on | ImageNet-1k, 1.2 million photographs, 1,000 classes |
| Top-1 | 76.1 % |
| Features | 2,048-d, global-average-pooled |
| Served from | `public/models/resnet50/model.onnx` — **not a CDN** |

`scripts/export_backbone.py` wraps the checkpoint so a single forward pass
returns both things the module needs:

```
pixel_values [N,3,224,224]
        │
        ├──► logits    [N, 1000]   the generalist's answer (steps 1–3)
        └──► features  [N, 2048]   what every head is fitted on (steps 4–8)
```

Published ONNX exports of ResNet only expose `logits`; the pooled vector is
inside the graph but is not a graph output, which is why we export our own.

### Why this is better than the ViT arrangement it replaces

**Parity is structural, not aspirational.** `scripts/embed_datasets.py` runs
that exact `.onnx` through onnxruntime, and `src/lib/ml/backbone.js` runs the
same file through onnxruntime-web. Same weights, same graph, same operators. The
ViT build loaded a Google checkpoint in Python and a separately converted,
quantised Xenova export in the browser, and needed `check_parity.py` plus a page
of README to argue they had not drifted. There is nothing left to drift.

**It works offline.** Nothing is fetched from the Hugging Face CDN. After
`npm install`, the module runs with the network unplugged — which is the
difference between working and not working on school wifi.

**The narrative gets simpler.** With ViT, the classifier the student met in step
1 was a *different checkpoint* from the feature extractor being fine-tuned in
step 4, and explaining that was the most awkward paragraph in the module. Here
"the thing that names photos sits directly on top of the thing that sees them,
and fine-tuning replaces only the first" is literally two tensors out of one
forward pass.

**Lab A's lesson actually appears.** See below — this is the important one.

---

## The finding that drove the model choice

The old README carried this warning, and it was correct:

> The blueprint says 10 images → 20% accuracy and 1,000 → 92%. **That is a
> from-scratch training curve, and it is not what happens on ViT features.**

Measured, on the ViT build, on flowers:

| Images per class | 1 | 2 | 5 | 10 | 25 | 44 |
|---|---|---|---|---|---|---|
| Held-out accuracy | 88.0% | 95.9% | 98.7% | **100%** | 100% | 100% |

ViT-21k features are so strong that a linear probe is essentially perfect from
**one image per class**. So the lesson the module exists to teach — *a small
dataset fine-tunes badly, a bigger one fine-tunes better* — never appeared on
screen. The curve was flat before the student touched the slider.

ResNet-50's ImageNet-1k features are deliberately weaker. The climb is real, so
the slider does something, so Lab A teaches what it claims to.

This is why the model choice was not just "a CNN instead of a transformer" — it
was picked to make the data-volume lesson visible.

---

## What it teaches, in one flow

Ten gated steps, forward-only on the first pass, because every hook depends on
not having seen the answer yet.

| # | Step | What is real |
|---|---|---|
| 1 | Meet the generalist | The model card, shown *before* anything loads |
| 2 | It works | Live ImageNet classification on the student's photo |
| 3 | It fails | They search the model's own answers for the word they wanted |
| 4 | Specialist school | Freeze 25.6M weights, fit a head — real gradient descent |
| 5 | It is a specialist | Same photo, both answers side by side |
| 6 | The boundary test | Predict-first, then watch it be confidently wrong |
| 7 | **Lab A — data volume** | Log slider, measured accuracy at each size |
| 8 | Lab B — augmentation | Flip / rotate / brightness, with a controlled baseline |
| 9 | Lab C — partial vs full | Both modes genuinely run; forgetting is measured |
| 10 | Multimodal | The reveal — needs a backend, says so rather than faking it |

Step 7 is the one this build was tuned for. Chiti's script there now walks
through it in eight beats: train at the smallest setting, *read the failure*,
add data, read the curve, watch the train/test gap close, then find where the
climb flattens out.

---

## Chiti

The guide is a beat machine, not a subtitle track. A step is a list of beats,
and a beat can **wait**:

```js
{
  id: 'train-small',
  say: 'Slide it all the way down to the smallest setting and train. One '
     + 'picture of each butterfly. That is all it gets.',
  point: ['lab-controls', 'Start at the smallest'],
  waitFor: TASKS.TRAINED,          // ← does not advance until they do it
  waiting: 'Waiting for the first run…',
}
```

- `say` — spoken via Web Speech **and** shown as a caption
- `point` — spotlights the element being talked about, following it on scroll
- `waitFor` — a gate; the step reports `done(TASKS.TRAINED)` when it happens
- `ask` — a curiosity question, posed before the answer exists
- `{placeholders}` — interpolated from real measured state, never authored

**The caption is the deliverable, the audio is the bonus.** Every line is
readable with the sound off. Audio never gates a button. On a device with no
Indian-English voice, Chiti says so and leans on the captions.

46 beats across the ten steps. All of them rewritten for the CNN.

Files: [`src/lib/chiti/lesson.js`](src/lib/chiti/lesson.js) (the script),
[`LessonProvider.jsx`](src/lib/chiti/LessonProvider.jsx) (the engine),
[`Spotlight.jsx`](src/lib/chiti/Spotlight.jsx) (the pointing),
[`voice.js`](src/lib/voice.js) (speech),
[`ChitiDock.jsx`](src/components/ChitiDock.jsx) (the dock).

---

## Building the data

Source images go in `datasets/<domain>/<class>/*.jpg` — git-ignored, never
served. Outputs land in `public/embeddings/` and `public/heads/`.

```bash
python scripts/export_backbone.py            # once
python scripts/fetch_flowers.py              # 345 MB, no login
python scripts/embed_datasets.py --dataset flowers
python scripts/train_heads.py   --dataset flowers
python scripts/check_parity.py  --dataset flowers
npm run dev
```

Or the whole thing:

```bash
python scripts/build_all.py --stage all
```

### The five domains

| Domain | Source | Login? | Size |
|---|---|---|---|
| flowers | Oxford Flowers-102 | no | 345 MB |
| pets | Oxford-IIIT Pets | no | 792 MB |
| butterflies | GBIF API (`--preset butterflies_in`) | no | slow, many small files |
| mushrooms | GBIF API (`--preset mushrooms`) | no | slow, many small files |
| food | Food-101, streamed | no | streams a 5 GB tar, keeps ~1,440 images |

`fetch_food.py` reads the tarball as it downloads and stops as soon as all
twelve classes are full, so it never writes 5 GB to disk.

### Why the embeddings are precomputed

A ResNet-50 forward pass is ~4.1 GFLOPs — around 40 ms per image on a laptop
CPU, ~0.3 s in single-threaded browser WASM. Fitting a head on the resulting
vectors is ~1 second for the whole set. So the forward passes move to build
time and the result ships as a binary.

Lab B's transforms multiply the count by six, so all six variants are embedded
at build time too and the toggles select among them. Those are genuine
embeddings of genuinely flipped and rotated images — not a transform applied to
a vector, which would be meaningless.

**The heads are precomputed, not pretend.** `train_heads.py` fits a real head at
1, 2, 5, 10, 25, 50, 100, 250 and all images per class, and records what each
one actually scored on a held-out set it never saw. `run.provenance` is set on
every precomputed result and the UI is required to say the result was computed
earlier.

---

---

## Verification — what has actually been run

Not a plan. These were executed on this machine, in this state.

| Check | Command | Result |
|---|---|---|
| ONNX export matches torch | `export_backbone.py --check` | PASS — max abs diff 9.1e-06 (logits), 3.0e-06 (features) |
| Dynamic batch survives export | same | PASS — batch-3 run, `logits (3,1000)`, `features (3,2048)` |
| Flowers embedded | `embed_datasets.py --dataset flowers` | 1,267 images × 6 variants → 62.3 MB, shape `[7602, 2048]` |
| Heads fitted at every rung | `train_heads.py --dataset flowers` | 6 rungs, held-out 0.530 → 0.975 |
| Full fine-tune port | `train_full.py --smoke` | PASS — only `classifier.1.*` reinitialised |
| Frontend builds | `vite build` | PASS — 340 KB app JS |
| App boots + model loads in Chrome | `browser_check.mjs` | PASS |
| `embed()` in browser | same | PASS — 2048-d |
| **Preprocessing parity** | `check_parity.py` + `browser_check.mjs --parity` | **PASS — worst cosine 1.000000 over 8 fixtures** |
| No console/network errors | same | PASS |

### The browser check

Two bugs in this port were invisible to `vite build` and to every Python test,
because they only exist in a browser. Both were found by driving the real app:

1. **onnxruntime `import()`s its WASM loader**, and Vite's dev server refuses to
   serve a `public/` file as a source module. The session never started — and
   because the failure was inside a dynamic import, the UI showed a spinner
   forever rather than an error. Fixed by resolving `wasmPaths` to a
   fully-qualified URL; see the comment in `backbone.js`, and do not "simplify"
   it back to `/ort/`.

2. **Canvas resize disagreed with Pillow.** Cosine against the Python reference
   ran as low as **0.949**, with `maxAbsDelta` 0.44 — a head fitted in Python
   being applied to features the browser never produces. Naive `drawImage`
   samples where Pillow averages, so it aliases hardest on exactly the detailed
   images that matter. Halving steps got it to 0.976; reimplementing Pillow's
   bicubic filter in [`src/lib/ml/resample.js`](src/lib/ml/resample.js) got it
   to **1.000000**.

```bash
npm install --no-save playwright-core     # needs a local Chrome or Edge
npm run dev
node scripts/browser_check.mjs --parity
```

`playwright-core` is deliberately **not** a dependency — it is a diagnostic, and
setting this up for a classroom should not require a browser driver.

> `check_parity.py` also had a latent bug: it reshaped the vector pack to
> `(count, dim)`, ignoring the six augmentation variants, so it threw on every
> pack ever built. That is why the old README said "Nobody has run this yet" —
> it could not be run. Fixed.


## What changed from the ViT build

| | Before | Now |
|---|---|---|
| Generalist | `Xenova/vit-base-patch16-224` | `microsoft/resnet-50`, self-exported |
| Features | `Xenova/vit-base-patch16-224-in21k`, 768-d | same model, 2,048-d |
| Downloads | two checkpoints from the HF CDN | one local file, no network |
| Parameters | 86 M | 25.6 M |
| Browser runtime | transformers.js (+23 MB WASM bundle) | `onnxruntime-web/wasm` (48 KB loader) |
| Python runtime | torch + transformers | onnxruntime (torch only for the one-time export) |
| Parity | checked, and never actually verified | structural — same file both sides |
| Lab A curve | flat (88% at 1 image/class) | a real climb |
| `dist/` JS | 692 KB | 338 KB |

Deleted: `scripts/vit_preprocess.py` → replaced by `scripts/cnn_preprocess.py`.
Added: `scripts/export_backbone.py`, `scripts/copy_ort.mjs`.

Lab C and Lab A's control condition were **already** a small hand-built CNN
(`tuningLab.js`, `scratchNet.js`) — those needed only their wording updated,
since the backbone they contrast against is now also a CNN.

---

## The rules this build follows

**Every number is measured.** There is no table of expected accuracies anywhere
in this codebase. Whatever the student's data does is what gets displayed, and
`diagnose.js` reacts to that rather than to a script.

**Nothing pretends to train.** The blueprint suggested shipping pre-computed
loss curves for full fine-tuning and playing them back behind a spinner. That is
not done here — see the header comment in
[`src/lib/ml/tuningLab.js`](src/lib/ml/tuningLab.js) for what replaced it.

**Nothing is uploaded.** Images, embeddings and trained weights stay in the tab.
This build makes **no network calls at all** during a lesson.

---

## How it is put together

```
public/
  models/resnet50/       model.onnx + labels.json + meta.json  ← the backbone
  ort/                   onnxruntime-web's .wasm               ← copied on install
  embeddings/<id>/       vectors.f32 + meta.json + previews
  heads/<id>/            rung_N.f32 + card.json
src/
  lib/
    voice.js             Web Speech wrapper, sentence-at-a-time
    chiti/               the beat engine, the script, the spotlight
    guide/
      diagnose.js        rules over real metrics
      templates.js       fixed wording per diagnosis, numbers interpolated
    ml/
      backbone.js        ResNet-50 via onnxruntime-web: run/classify/embed
      head.js            the frozen-backbone trainer (steps 4, 7, 8)
      heads.js           precomputed heads + the embedding cache
      tuningLab.js       Lab C's own small CNN — partial vs full, measured
      scratchNet.js      Lab A's from-scratch control
      augment.js         image transforms (before embedding, never after)
      metrics.js         deterministic stratified split, accuracy, confusion
  components/
    steps/               one file per step
    TrainPanel.jsx       embed → fit → evaluate → diagnose (shared by 4, 7, 8)
    ChitiDock.jsx        the guide + captions + mute
scripts/
  export_backbone.py     microsoft/resnet-50 → the ONNX both sides load
  cnn_preprocess.py      the preprocessing contract, in Python
  copy_ort.mjs           onnxruntime-web's WASM → public/ort/
  embed_datasets.py      images → vectors, 6 augmentation variants
  train_heads.py         a real head at every rung of the slider
  check_parity.py        writes the fixtures the browser check compares against
  browser_check.mjs      drives the real app in a real browser (diagnostic)
  build_all.py           all of the above, one command
```

---

## Known gaps

- **Only `flowers` is built so far.** Pets is embedding, butterflies and
  mushrooms are downloading from GBIF, food is not started. The Data Library
  shows only what genuinely exists — stale ViT-era packs and heads were deleted
  rather than left to 404 or dimension-mismatch at the student. Run
  `build_all.py --stage embed heads --domains <id>` as each one lands.
- **Step 10 has no backend.** By design in standalone. It says so rather than
  faking a response.
- **Chiti's coach is template-only.** The live LLM layer exists in Stage1 and
  gets wired at port time; `templates.js` is the contract it will be graded
  against.
- **Progress is not persisted.** Reloading restarts the flow.
- **The full fine-tune grid (`train_full.py`) is still ViT-shaped** and has not
  been re-pointed at ResNet-50. It is GPU-bound and feeds only the third row of
  Lab A's comparison table, which currently renders as "—" rather than
  inventing anything.
- **Single-threaded WASM.** Multi-threading needs COOP/COEP headers, which
  would break the optional step-10 endpoint. ~0.3 s per image is fine for the
  handful of live embeddings the flow actually does.
