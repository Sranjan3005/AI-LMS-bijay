# Fine-Tuning — "Specialist School"

> ## ⚠️ AMENDED: this module now uses a CNN, not a Vision Transformer
>
> Everything below was written for a ViT-base backbone. The architecture
> decision has since been reversed: the module runs **ResNet-50**, exported
> once to ONNX by `scripts/export_backbone.py` and loaded by both Python and
> the browser from `public/models/resnet50/model.onnx`.
>
> Read [README.md](README.md) for the current architecture. The sections below
> are still correct about the **teaching design** — the ten steps, the gating,
> Chiti's beats, the honesty rules — and stale wherever they name a checkpoint,
> a parameter count or a feature dimension.
>
> Two substantive things changed with the model, not just names:
>
> 1. **Parity stopped being a risk.** Python and the browser load the same
>    `.onnx`. Section 8's anxiety about quantisation drift no longer applies.
> 2. **Lab A's curve exists now.** On ViT features a linear probe hit 88% on
>    flowers from *one image per class*, so "a small dataset fine-tunes badly"
>    never appeared on screen. ResNet-50's ImageNet-1k features are weaker and
>    the climb is real. That was the deciding reason for the swap.


The plan of record for the fifth module in **Track 03, Machine-Learning Models**.
Built standalone in `Fine-tuning/` on branch `feature/fine-tuning`, ported into
`Stage1/frontend` once it is tested.

Last updated 2026-08-07. Supersedes the ad-hoc decisions in the session
transcript; where this document and a comment in the code disagree, the code is
probably right and this should be corrected.

---

## 1. What it is

| | |
|---|---|
| **Module title** | `Fine-Tuning` |
| **Story codename** | Specialist School |
| **Ability** | `focus` — "Expertise" 🎓 |
| **Track** | 03 · Machine-Learning Models, after Computer Vision |
| **Route key** | `finetune` |
| **Teaches** | base models, fine-tuning, data sufficiency, augmentation, partial vs full tuning, multimodal |

One continuous guided flow — **not a tab bar**. The four submodule rows
StudentHome requires (theory / demo / hands / assign) all deep-link into
different steps of the same page, exactly the way `Maths for AI` already does
with `params: { initialStep: N }`.

Chiti narrates every step **with audio**. Steps 1–6 are deterministic templates
with no network call; the live coach is reserved for the labs where there are
real metrics to react to.

---

## 2. The three rules

Everything below follows from these. If a decision contradicts one of them, the
decision is wrong.

1. **Every number is measured.** No table of expected accuracies exists anywhere
   in this codebase. Whatever the student's data does is what gets displayed.
2. **Nothing pretends to train.** Precomputed is fine; *implying it just trained*
   is not. `run.provenance` is set on every precomputed result and the UI says so.
3. **The caption is the deliverable, the audio is the bonus.** Every line is
   readable with sound off. Audio never gates a button.

---

## 3. Architecture — Plan A, and the 15-cell model grid

Two artefact families, doing two different jobs. Both are real; neither
substitutes for the other.

| Role | What | Size | Where |
|---|---|---|---|
| The generalist (Acts 1–3) | `Xenova/vit-base-patch16-224` — 1,000 ImageNet labels | ~173 MB fp16 | browser, ONNX |
| The feature extractor (everything trainable) | `Xenova/vit-base-patch16-224-in21k` — 768-d `[CLS]` | ~173 MB fp16 | browser, ONNX |
| **Linear heads** — the *partial* fine-tune the student performs | 768 × N, one per (domain × rung) | ~300 KB | `public/heads/` |
| **Full fine-tunes** — the 15-cell grid, trained by us | all 86M weights tuned, one per (domain × volume) | ~330 MB | server-side |

### The 15 cells — 5 domains × 3 data volumes

**Decided 2026-08-07: the third axis is data volume, not data quality.**

| | `v10` | `v100` | `vall` |
|---|---|---|---|
| **Flowers** | ● | ● | ● |
| **Pets** | ● | ● | ● |
| **Butterflies** | ● | ● | ● |
| **Mushrooms** | ● | ● | ● |
| **Food** | ● | ● | ● |

- **`v10`** — 10 images per class
- **`v100`** — 100 images per class
- **`vall`** — everything available

All three are **clean images from the same pool**, differing only in how many.
Nested by construction: `v10 ⊂ v100 ⊂ vall`, and **all three are scored on one
shared held-out set** carved out before any subsampling. So the three numbers
are directly comparable and the only variable is volume.

> **This replaces "distorting the weights" completely.** Every weak model in the
> grid is weak because it saw less data. Nothing is perturbed after training, so
> the confusion matrices stay coherent, `diagnose.js` diagnoses the data rather
> than the noise, and a student who pokes at it finds a consistent story.

### What this buys, and what it gives up

**Buys — the full-vs-partial comparison at every volume.** For each of the 15
cells we have *both* a full fine-tune and a linear head on the same data and the
same split. That second axis is free, and the 10-per-class row is the money shot:

| 10 images/class | expected |
|---|---|
| Full fine-tune, all 86M weights | collapses — this is catastrophic forgetting, live |
| Linear head on the frozen backbone | holds up |
| Tiny CNN from scratch (Lab A's control) | barely above guessing |

Three models, same ten images, three completely different outcomes. That single
row is the strongest thing in the module and it is entirely measured.

**Gives up — the cross-condition matrix.** With volume as the only axis, every
cell trains and tests on the same kind of image. There is no degraded-data row,
so no 3×3 train-on-X / test-on-Y grid, and the distribution-mismatch lesson does
not come from the grid at all.

That lesson now rests entirely on **Act 6, the boundary test** — feed the flowers
specialist a mushroom and watch it be confidently wrong. That is already built,
it is qualitative rather than a matrix, and it is arguably the better moment
anyway. `diagnose.js` keeps `DISTRIBUTION_MISMATCH`; it simply will not fire from
the grid.

Consequence to accept: `CrossDatasetMatrix` is not needed for this module, and
the per-domain result is a **curve, not a matrix** — three rows, one shared test
column.

### Why both families, not just the grid

The 15 cells are **fixed artefacts** — three points per domain. They cannot serve
Lab A's slider (which needs a head at every rung), Lab B's augmentation toggles,
or anything trained on the student's own photos. Those need the head path, which
fits in ~1 second on cached embeddings.

Conversely the head path can never show *full* fine-tuning, because the browser
cannot unlock 86M weights. That is what the grid is for, and it is what finally
lets **Lab C run at real ViT scale** instead of substituting a 15k-parameter CNN:

- **partial** = the student's linear head → measured
- **full** = the corresponding grid cell → measured on the *same* held-out set
- **catastrophic forgetting** = fit a probe on domain B using the domain-A
  fine-tuned model's features, and compare against the base backbone's features
  on the same task. Standard linear-probe transfer, honestly measured.

### Why we train these rather than host the HF checkpoints

We were going to host the five HF checkpoints for the presentation. Training our
own 15 is better on every axis that matters here, and the audit in §6 is why:
the flowers checkpoint has no species names, the butterflies one is unusable,
the mushroom one has no licence. Training locally gives **real label names, a
held-out split we control, one consistent architecture and preprocessor, and the
`v10` / `v100` volume conditions that no public checkpoint can provide.**

Python must embed with `google/vit-base-patch16-224-in21k` — the same checkpoint
the browser's ONNX was converted from. Both sides naming the same model is not
optional; see §7.

### The compute bill — measured, and where it runs

Measured on this machine (6 threads, `torch 2.13.0+cpu`, **no CUDA**):

| | |
|---|---|
| ViT-base forward | **226 ms/image** |
| ViT-base full fine-tune step (fwd + bwd + AdamW) | **838 ms/image** |
| One `vall` cell — 1,200 imgs × 8 epochs | ≈ 2.2 h CPU |
| Embedding pass for the head path (all 6 variants, 1,200 imgs) | **27 minutes** |

**Decided 2026-08-07: the grid trains on a free Kaggle T4.** Roughly **1.5–2 hours
for all 15 cells**, versus ~24 h on this CPU — the volume split is cheaper than
the earlier estimate because `v10` and `v100` are small, so `vall` dominates.

**Not AWS or Azure.** Checked 2026-08-07: the only subscription is
**Azure for Students**, which caps at ~3 vCPUs and denies N-series quota by
offer policy; AWS free tier starts GPU quota at 0 and commonly declines new
accounts. Kaggle Notebooks give 30 GPU-hours/week with no card and no approval
step. See `GPU_RUNBOOK.md`. Save **fp16** — 165 MB/cell, ~2.5 GB total, which
also fits Kaggle's ~20 GB output cap.

The GPU is a **build-time convenience only**. No GPU is needed at runtime, ever;
the outputs are static weight files. It matters because it makes rebuilds cheap
— while the datasets are still moving, a two-night turnaround would set the pace
of everything downstream.

`train_full.py` must therefore be device-agnostic (`cuda` if available, else
`cpu`) and checkpoint per cell, so a dropped spot instance costs one cell rather
than the run.

The **head path stays on CPU** — 27 minutes of embedding per domain, then
seconds per head. It never needs the GPU.

Storage: 15 × 330 MB ≈ **5 GB** at fp32, ~2.5 GB at fp16.

**Serving them is a separate question from training them.** The lesson needs only
their *numbers*, which are computed once at build time. A live endpoint is needed
only for "run the real fine-tuned model on the photo I just took" — a bonus beat,
never the golden path. Lazy-load with LRU; do not hold 15 models resident.

---

## 4. The flow — ten gated steps

Forward-only on the first pass. Once cleared, a step stays reachable forever.

| # | Step | Gate | Built? |
|---|---|---|---|
| 1 | **Meet the generalist** — model card before any download | load the model | ✅ |
| 2 | **It works** — live ImageNet classification on their photo | one prediction | ✅ |
| 3 | **It fails** — search the model's own answers for the missing word | one search | ✅ |
| 4 | **Specialist school** — pick a dataset, fit a head | one training run | ✅ |
| 5 | **It is a specialist** — same photo, both answers side by side | one prediction | ✅ |
| 6 | **The boundary test** — predict first, then watch it be confidently wrong | guess + test | ✅ |
| 7 | **Lab A — how much data?** — the volume slider + from-scratch control | two sizes | ✅ head path + control; **grid column (B-7) to add** |
| 8 | **Lab B — augmentation** — flip / rotate / brightness vs a baseline | baseline + one aug run | ✅ |
| 9 | **Lab C — partial vs full** — measured forgetting | both modes | ✅ small-CNN version; **ViT-scale version once the grid lands (B-7)** |
| 10 | **Multimodal** — the reveal | — | ✅ (needs a backend) |

The grid (§3) upgrades two of these in place. Lab A's slider gains a **full
fine-tune column** beside the head column, so the same volume is shown two ways.
Lab C's small CNN stops being a stand-in and becomes the third row of the
comparison — from-scratch, partial, full — all on the same ten images.

### Step 3 is not the blueprint's version, deliberately

The original had the base model say "Dog" and fail to name the breed. **ImageNet
contains ~120 dog breeds**, so ViT says "golden retriever" and the hook collapses
on stage. It *is* genuinely thin on flower, butterfly and mushroom species —
hence those domains. The failure shown is the sharper one: *it answered
confidently in the only words it has, and the word you wanted was never among
them.* The student searches the vocabulary and finds the absence themselves.

### Lab A's numbers will not match the blueprint

"10 images → 20%" is a **from-scratch** curve. A linear probe on ViT features
reaches ~90% on Flowers-102 at *five* images per class. Do not hard-code 20%.

The honest replacement, and a better lesson: **the three-model comparison at ten
images.** Same ten photos, three ways of learning from them:

| | expected |
|---|---|
| Tiny CNN, from scratch | ~20% — barely above guessing |
| Linear head on the frozen ViT | ~75% |
| Full fine-tune of all 86M weights (`v10` grid cell) | collapses — too few images to rewrite a whole network |

That is the whole module in one table, and every number is measured. The
from-scratch control is **B-1**, the first build task; the full-tune column
arrives with the grid at **B-7**.

---

## 5. The build pipeline

Build-time only, runs against `Stage1/backend/venv` (torch 2.13, transformers
5.14, sklearn 1.7 — all present).

```bash
pip install -r scripts/requirements.txt

python scripts/embed_datasets.py                    # ViT features + all 6 augmentation variants   [CPU, 27 min/domain]
python scripts/train_heads.py                       # a real head at every rung of the slider      [CPU, seconds]
python scripts/train_full.py                        # NOT BUILT — the 15-cell grid                 [GPU, ~2 h total]
python scripts/evaluate_grid.py                     # NOT BUILT — the volume curve + forgetting probe
python scripts/check_parity.py --dataset <id>       # fp32 reference for the browser check
```

Source images live in `Fine-tuning/datasets/<domain>/<class>/*.jpg` —
git-ignored, never served. **One folder per domain, not per condition:** the
three volumes are subsets chosen at train time by the same deterministic
`subsample_per_class` that `train_heads.py` already uses, so `v10 ⊂ v100 ⊂ vall`
is guaranteed rather than hoped for, and the held-out set is carved out once and
shared by all three.

Output: `public/embeddings/` and `public/heads/` ship to the browser;
`models/full/` is server-side and never served.

### Why precomputed, and why that is still honest

A ViT forward pass is ~17.6 GFLOPs — about **a second per image in a browser**.
Fitting a head on the resulting vectors is **~1 second for the whole set**. That
ratio is the entire design:

- 500 images embedded live ≈ 8 minutes. Precomputed ≈ a 1.5 MB download.
- Lab B's transforms multiply that by six, so **all six variants are embedded at
  build time** and the toggles select among them. Still genuine embeddings of
  genuinely flipped images.
- `train_heads.py` fits a real head at **1, 2, 5, 10, 25, 50, 100, 250 and all**
  per class, scoring each on a held-out set it never saw.

**One held-out set is shared by every rung**, carved out before any subsampling,
so the curve isolates data volume rather than measuring a fresh split each time.
Subsampling is nested — the 10-per-class set contains the 5-per-class set — so
the curve shows the effect of *adding* data.

### Two leakage traps already handled — do not regress these

1. **Augment before embedding.** You cannot flip a 768-number vector.
2. **The held-out split is over source images**, and only un-augmented originals
   enter the test set. Otherwise Lab B shows augmentation "working" every single
   time, by marking its own homework.

---

## 6. Datasets

The module needs **10–15 classes × 60–100 images**, not 100,000. That is enough
for the slider to have reachable rungs, keeps the confusion matrix readable on a
projector, and keeps the embedding build to ~35 minutes.

| Scenario | Source | Licence | Action |
|---|---|---|---|
| **Pets** | Oxford-IIIT Pet — 37 breeds, 7,349 imgs | **CC BY-SA 4.0**, commercial OK | ✅ use as-is, take a 12-breed subset |
| **Flowers** | Oxford Flowers-102 | ❌ **none stated** | use for the demo; twin from GBIF |
| **Butterflies** | Kaggle *Butterfly Image Classification*, 75 species | CC0 1.0 (verify) | first choice |
| **Mushrooms** | Danish Fungi 2020 — zero ImageNet overlap | ⚠️ not declared | chase licence, or GBIF |
| **Food** | Food-101 | ⚠️ research/fair-use only | use for the demo; twin = photograph canteen food |

**For the gaps, build from GBIF / iNaturalist Open Data.** Genuinely
commercial-safe, you choose the species, and you can pick **species native to
India** — a flower set that looks like the school garden beats UK garden flowers.

> ⚠️ **The trap:** on iNaturalist/GBIF the *observation* licence and the *photo*
> licence are separate fields. Filter on the **photo** licence. Prefer the
> `inaturalist-open-data` AWS release, which carries per-photo licence.

Licensed sets are used behind a swap layer, matching the policy already set in
`Stage1/CV_AGENTIC_UPGRADE_PLAN.md`: `licence_class` is a field not a fork, every
research-only set has a commercial-safe twin wired from day one, and licensed raw
images stay out of `public/`.

### The five HF checkpoints, audited 2026-08-06

| Model | Status |
|---|---|
| `benvened/vit-base-oxford-flowers` | ✅ Apache-2.0 — but labels are `"1"…"102"`, **not species names** |
| `weileluc/vit-base-oxford-iiit-pets` | ✅ Apache-2.0 |
| `dima806/butterflies_image` | ❌ does not resolve |
| `RikeB/MaxViT_butterfly_identification` | ✅ **MIT** — but bare `.bin`, **no config.json, no preprocessor, no labels**, MaxViT-T not ViT, Austrian species. **Dropped from the presentation build.** |
| `elucidator8918/VIT-MUSH` | ⚠️ no licence declared; `.bin` not safetensors |
| `adhisetiawan/…-finetuned-food101` | ✅ Apache-2.0 |

**Demoted to an optional sanity check.** Since we train the 15-cell grid
ourselves (§3), none of these is load-bearing. Two of the four loadable ones can
be scored on our splits as a sense-check — *"a published full fine-tune gets 98%,
ours gets 96%"* is a reassuring line — but nothing in the module depends on them.

Hosting them would not have saved the work anyway:
1. `train_heads.py` is still needed — a checkpoint is one point on Lab A's curve.
2. The datasets are still needed — for the label names, and for a split we control.
3. Each has its own preprocessor; one shared pipeline silently degrades accuracy.
4. Each is one model trained on all the data — none of them gives you the
   `v10` or `v100` cells, which is where the whole 15-cell grid earns its keep.

The flowers checkpoint's label mapping was a **demo-visible bug risk**: get the
index convention wrong (1-based vs 0-based, or the wrong ordering) and the screen
confidently displays the wrong species, with no error. Training our own removes
that failure mode entirely — our label names come from the folder names.

---

## 7. The unverified risk: parity

Heads are fitted in Python on **fp32** features. The browser computes features
from a **quantised ONNX** export. If those drift, the head still loads, still
runs, and still returns a confident distribution — it is just wrong. No
exception, no warning, nothing on screen to notice.

The measured accuracies on the cards are safe either way (computed end to end in
Python). What is at risk is the **live prediction on the student's own photo** —
the most visible moment of the demo.

```bash
python scripts/check_parity.py --dataset <id>
# then in the browser console:
await window.__checkParity()
```

Pass = cosine ≥ 0.99 on every fixture **and** an identical predicted label.
`VITE_VIT_DTYPE` defaults to `fp16` (~173 MB); `q8` (~87 MB) is probably fine but
unproven. **Nobody has run this yet.**

The other half of this risk is already guarded: a cross-language fixture test
checks the JS `forward()` reproduces Python's `softmax(x @ W + b)` byte for byte.
A transposed weight matrix loads and runs perfectly happily — that test is the
only thing that catches it.

---

## 8. Chiti

`ChitiProvider` owns speech and captions. The one rule that matters: **`say()` is
keyed** — a line only speaks when its key changes, so a component can call it in
an effect without guarding and still not stutter.

- `voice.js` — ported from Stage1 so the port back is a delete, not a merge.
  Adds `speakSentences()` (interrupt at a sentence boundary, not mid-word) and
  `voiceQuality()` (en-IN Neerja is absent on most Chromebooks and Safari; the UI
  leans on captions rather than sounding bad silently).
- `guide/script.js` — per-step narration, deterministic, built from what actually
  happened on screen. No network.
- `guide/diagnose.js` — rules over real metrics. Same contract as Stage1's, plus
  `catastrophic_forgetting`, `augmentation_helped`, `augmentation_did_not_help`
  and the actions `set_data_volume`, `toggle_augmentation`, `set_tuning_mode`,
  `next_step`.
- `guide/templates.js` — fixed wording per diagnosis, numbers interpolated. This
  is the **contract the LLM layer is graded against**, not a consolation prize.

**Found in the main app:** `Stage1/.../workspace/ChitiCoachPanel.jsx` never
speaks — it imports `coachFor` but not `useChiti` or `voice`. Chiti's best
material is currently silent in Stage1. Fixing that is part of the port.

---

## 9. State — built vs left

### Built and verified

- All ten steps, the gated stepper, Chiti with audio and captions
- `backbone.js` (ViT via transformers.js), `heads.js` (precomputed loader +
  variant selection), `head.js` (live trainer), `tuningLab.js` (Lab C),
  `augment.js`, `datasets.js`, `metrics.js`, `parity.js`
- `embed_datasets.py`, `train_heads.py`, `check_parity.py`
- `npm run build` clean · **25 tests pass** · dev server boots · all three
  scripts compile

### Left to do, in order

| # | Task | Blocked on |
|---|---|---|
| ~~B-1~~ | ~~Lab A's control — from-scratch CNN vs ViT head on the same images~~ | **DONE 2026-08-07** |
| **B-2** | **Source domain 1** (Pets — cleanest licence) into `datasets/pets/` | a breed shortlist |
| **B-3** | **Run the head pipeline end to end** — embed → heads at every rung → read the real curve | B-2 |
| **B-4** | **Verify parity** in a real browser | B-3 |
| **B-5** | **`train_full.py`** — device-agnostic, per-cell checkpointing; proved on **one cell** first | B-2 |
| **B-6** | **Run the 15-cell grid** on a rented GPU (~2 h) | B-5, all 5 domains sourced |
| **B-7** | **`evaluate_grid.py`** — the volume curve + the forgetting probe; wire into Labs A and C | B-6 |
| **B-8** | Source the remaining four domains; wire the swap twins | species lists |
| **B-9** | Self-host the ViT ONNX weights; trim the ~23 MB onnxruntime WASM bundle | — |
| **B-10** | Optional live endpoint for the grid on `ailab-ml` | B-6 |
| **B-11** | Step 10's backend (Azure OpenAI vision) | port |
| **B-12** | Progress persistence | port |
| **B-13** | **Port into Stage1** | B-1…B-4 |

**B-5 before B-6 is the important ordering.** Prove the full-tune trainer end to
end on a single cell and confirm the resulting model actually beats its own
linear head before booking GPU time for the other fourteen. If it does not, the
grid is not worth training and that is much cheaper to discover on cell one.

**B-1 to B-4 need no GPU and no grid** — that is the whole demoable path, and it
is what unblocks the Stage1 port.

---

## 10. Porting into Stage1

Five registration points:

1. `pages/StudentHome.jsx` — new module object in track `03` `mods[]`, `open: 'finetune'`, after Computer Vision.
2. `content/flowTargets.js` — `FLOW['Fine-Tuning']`, four rows deep-linking into one view via `initialStep`.
3. `App.jsx` — route `finetune`.
4. `content/moduleStory.js` — ability between `eyes` and `hands`. **The spine's order is load-bearing**; check anything storing progress by index.
5. `utils/chitiProgress.js` — title → key mapping.

Then: move `say()`'s keying and `speakSentences` into Stage1's `ChitiProvider`
and delete this app's copies, and **add the new `KINDS`/`ACTIONS` to
`backend/chiti_coach/`** — the cross-language parity test will otherwise fail
*silently* into the template fallback, which reads as "Chiti got boring" rather
than as a bug.

### The one thing that is not a code problem

**Computer Vision runs 25 Aug – 05 Sep and Agentic Flow Studio starts 08 Sep.
There is no calendar room for a fifth module in track 03.** Either compress CV or
push Agentic. That is a scheduling decision, and the module card cannot render
without dates.

---

## 11. Open decisions

### Settled

| Decision | Answer |
|---|---|
| Architecture | **Plan A** — shared ViT backbone + linear heads; full fine-tunes as a separate server-side family |
| The 15 cells | **5 domains × 3 data volumes** (`v10` / `v100` / `vall`), all clean, nested, one shared held-out set |
| Weak models | **trained on less data, never perturbed after training** |
| Grid compute | **rented GPU, ~2 h**; build-time only, nothing at runtime |
| Head compute | stays on CPU, ~27 min/domain |

### Still open

| # | Decision | Recommendation |
|---|---|---|
| 1 | Breed/species shortlists per domain | Indian-native where the source allows, 12–15 classes each |
| 2 | `Fine-Tuning` or `Transfer Learning` as the title | Fine-Tuning — recognisable to a parent, and the word the blueprint uses |
| 3 | The date collision (§10) | push Agentic Flow Studio |
| 4 | Voice for the port | ship Web Speech, add pre-generated Azure neural audio for the fixed lines only — ~80% of the module sounds good for one script and no new runtime infrastructure |
| 5 | Live endpoint for the grid | do B-7's offline evaluation first; the container is a bonus beat, never the golden path |

Only **#1 blocks anything**, and only from B-2 onward. B-1 can start immediately.
