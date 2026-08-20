/**
 * parity.js -- prove the browser and Python agree about what an image *is*.
 *
 * WHAT CHANGED, AND WHY THIS FILE GOT SMALLER
 *
 * The ViT build had a real and frightening problem: heads were fitted in Python
 * on fp32 features from a Google checkpoint, then applied in the browser to
 * features from a separately converted, quantised Xenova export. Two different
 * files. If they drifted the app did not crash, did not warn, and did not look
 * broken -- it just became confidently wrong, which for *this* module is the
 * worst available failure. Half of that file was arguing about quantisation.
 *
 * That is gone. `scripts/embed_datasets.py` and `backbone.js` now load the same
 * `public/models/resnet50/model.onnx`. Same weights, same graph, same
 * operators, both through onnxruntime. There is nothing left for the *model* to
 * disagree about.
 *
 * WHAT IS STILL WORTH CHECKING, BECAUSE IT IS STILL TWO IMPLEMENTATIONS
 *
 * Preprocessing. Python letterboxes with PIL and normalises with numpy;
 * the browser letterboxes onto a `<canvas>` and normalises in a loop over
 * `getImageData`. Those are genuinely separate pieces of code and they can
 * genuinely diverge -- a wrong mean, a BGR/RGB flip, a stretch where there
 * should be a letterbox, a resampling filter that rounds differently. Any of
 * those shifts every feature vector by a little and every prediction by a lot,
 * silently.
 *
 * So this checks the one thing that can still be wrong.
 *
 *     python scripts/check_parity.py --dataset flowers
 *     # then, in the browser console:
 *     await window.__checkParity()
 *
 * THRESHOLDS
 *
 *   cosine >= 0.999  Tighter than the ViT build's 0.99, because we are no
 *                    longer absorbing a quantisation gap -- only canvas
 *                    resampling versus PIL bicubic. Anything below this means
 *                    the two preprocessors are doing different things, not that
 *                    floats rounded differently.
 *   argmax identical The number that actually matters. A vector can move a
 *                    little and still land on the same side of every decision
 *                    boundary; if the predicted label changes on even one
 *                    fixture, something real is wrong.
 *
 * If it fails, the fault is almost certainly in `containFit()` in backbone.js or
 * `contain_fit()` in cnn_preprocess.py. Compare them line by line before
 * suspecting anything else.
 */

import { embed, EMBED_DIM } from './backbone.js';
import { loadHead, predictWithHead } from './heads.js';

export const THRESHOLDS = { cosine: 0.999, maxAbsDelta: 0.25 };

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

function maxAbsDelta(a, b) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

/**
 * @returns {Promise<{ok:boolean, results:Array, summary:string}>}
 */
export async function checkParity() {
  const res = await fetch('/parity/reference.json', { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error('No /parity/reference.json. Run scripts/check_parity.py first.');
  }
  const ref = await res.json();

  if (ref.embed_dim !== EMBED_DIM) {
    throw new Error(
      `The reference was built at ${ref.embed_dim}-d but this build produces `
      + `${EMBED_DIM}-d. Re-run scripts/check_parity.py.`,
    );
  }

  let head = null;
  if (ref.head_rung != null) {
    head = await loadHead(ref.dataset_id, ref.head_rung);
  }

  const results = [];
  for (const fx of ref.fixtures) {
    /* eslint-disable no-await-in-loop */
    let row;
    try {
      const img = await loadImage(fx.image);
      const got = await embed(img);
      const want = Float32Array.from(fx.embedding);

      row = {
        image: fx.image,
        cosine: cosine(got, want),
        maxAbsDelta: maxAbsDelta(got, want),
        labelMatch: null,
        expectedLabel: fx.expected_label ?? null,
        gotLabel: null,
      };

      if (head && fx.expected_label) {
        row.gotLabel = predictWithHead(head, got)[0].label;
        row.labelMatch = row.gotLabel === fx.expected_label;
      }
    } catch (e) {
      row = { image: fx.image, error: e.message };
    }
    results.push(row);
    /* eslint-enable no-await-in-loop */
  }

  const usable = results.filter((r) => !r.error);
  const failedCosine = usable.filter((r) => r.cosine < THRESHOLDS.cosine);
  const failedLabel = usable.filter((r) => r.labelMatch === false);
  const ok = usable.length > 0 && !failedCosine.length && !failedLabel.length;

  const worst = usable.length ? Math.min(...usable.map((r) => r.cosine)) : 0;
  const summary = ok
    ? `PASS — ${usable.length} fixtures, worst cosine ${worst.toFixed(6)}, every `
      + 'predicted label matches Python. Canvas and PIL preprocessing agree.'
    : `FAIL — ${failedCosine.length} below cosine ${THRESHOLDS.cosine} (worst `
      + `${worst.toFixed(6)}), ${failedLabel.length} predicted a different label. `
      + 'The model is the same file on both sides, so look at the preprocessing: '
      + 'containFit() in backbone.js vs contain_fit() in cnn_preprocess.py.';

  /* eslint-disable-next-line no-console */
  console[ok ? 'log' : 'error'](summary, results);
  return { ok, results, summary };
}

// Exposed in dev so the check is one line in the console rather than a build step.
if (import.meta.env?.DEV && typeof window !== 'undefined') {
  window.__checkParity = checkParity;
}
