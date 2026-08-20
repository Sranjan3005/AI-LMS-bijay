/**
 * heads.js -- the precomputed specialists, and the build-time embedding cache.
 *
 * WHAT "PRECOMPUTED" MEANS HERE, AND WHAT IT DOES NOT MEAN
 *
 * `scripts/train_heads.py` fits a real logistic-regression head on real CNN
 * features at every rung of the data slider, evaluates each one on a held-out
 * set it never saw, and writes both the weights and the measured accuracy. This
 * module loads those artefacts.
 *
 * So when a student drags the slider to "10 per class", they get a head that
 * was genuinely fitted on ten images per class, and an accuracy that was
 * genuinely measured on images it never trained on. What they do not get is a
 * five-minute wait, because the fitting happened yesterday.
 *
 * The distinction that keeps this honest is small and non-negotiable: **the UI
 * must say the result was computed earlier.** `provenance` is on every result
 * for exactly that reason, and `TrainPanel` renders it. A screen that implies
 * the training just happened would be the same lie as replaying a loss curve,
 * only better disguised.
 *
 * The live in-browser trainer in `head.js` is still there and still used --
 * for the student's *own* photos, where no precomputed anything can exist.
 */

import { EMBED_DIM, backboneId } from './backbone.js';
import { argmax } from './metrics.js';

const EMB_INDEX = '/embeddings/index.json';
const HEAD_INDEX = '/heads/index.json';

const cache = new Map();

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * What has been built. Returns null when the build has not been run -- which is
 * the normal state of a fresh checkout, not an error, and the UI says so rather
 * than substituting anything.
 */
export async function fetchCatalogue() {
  try {
    const [embeddings, heads] = await Promise.all([
      getJson(EMB_INDEX),
      getJson(HEAD_INDEX).catch(() => ({ specialists: [] })),
    ]);
    if (embeddings.embed_dim !== EMBED_DIM) {
      throw new Error(
        `The built embeddings are ${embeddings.embed_dim}-d but the browser backbone `
        + `produces ${EMBED_DIM}-d. Re-run scripts/embed_datasets.py.`,
      );
    }
    return { ...embeddings, specialists: heads.specialists || [] };
  } catch {
    return null;
  }
}

/**
 * Installed datasets, shaped for the Data Library.
 *
 * The build pipeline ships **embeddings, not images**: `public/embeddings/` and
 * `public/heads/`, no `public/datasets/`. That is deliberate -- 26 MB of vectors
 * per domain instead of gigabytes of JPEGs, and licence-bound source imagery
 * never lands in a publicly served directory.
 *
 * The consequence is that an installed dataset has **no pixels**. Everything
 * that trains a head works fine, because that only ever needed the vectors.
 * Anything that needs the actual image -- Lab B's preview strip, Lab C's tiny
 * CNN -- has to check `hasPixels` and say so rather than rendering blanks.
 */
export async function installedCatalogue() {
  const cat = await fetchCatalogue();
  if (!cat?.datasets?.length) return [];
  const heads = new Map((cat.specialists || []).map((s) => [s.dataset_id, s]));

  // index.json is deliberately thin. The preview filenames live in each
  // dataset's meta.json, so fetch those too -- five small requests, and the
  // Data Library is unusable without pictures.
  return Promise.all(cat.datasets.map(async (d) => {
    let assets = null;
    try {
      const meta = await getJson(`/embeddings/${d.dataset_id}/meta.json`);
      assets = meta.assets || null;
    } catch { /* previews are optional; the list still works without them */ }
    return {
      ...d,
      origin: 'installed',
      hasPixels: false,
      name: d.dataset_id.replace(/_/g, ' '),
      assets,
      specialist: heads.get(d.dataset_id) || null,
    };
  }));
}

/**
 * A Dataset backed by an embedding pack, with no images.
 *
 * Shaped exactly like the one `datasetFromFiles` builds, so TrainPanel,
 * diagnose.js and the labs cannot tell the difference -- except for the empty
 * `images` array and `hasPixels: false`.
 */
export async function datasetFromPack(datasetId, onProgress) {
  const pack = await loadEmbeddingPack(datasetId, onProgress);
  return {
    dataset_id: datasetId,
    name: datasetId.replace(/_/g, ' '),
    labels: pack.labels,
    count: pack.count,
    origin: 'installed',
    hasPixels: false,
    images: [],
    imageLabels: pack.labelIndex,
    licence: 'Built locally — see the dataset ATTRIBUTION.md.',
  };
}

/**
 * The cached embeddings for one dataset.
 *
 * These are the vectors the heads were fitted on, so anything measured against
 * them is exactly reproducible. Typically 60-70 MB per domain (6 augmentation
 * variants x 2048 floats x count).
 */
export async function loadEmbeddingPack(datasetId, onProgress) {
  const key = `emb:${datasetId}`;
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    const meta = await getJson(`/embeddings/${datasetId}/meta.json`);
    onProgress?.(0.2);
    const res = await fetch(`/embeddings/${datasetId}/vectors.f32`);
    if (!res.ok) throw new Error(`vectors.f32 missing for ${datasetId}`);
    const buf = await res.arrayBuffer();
    onProgress?.(0.9);

    const [rows, dim] = meta.layout.shape;
    const nVariants = meta.layout.variants ?? 1;
    const count = rows / nVariants;
    const expected = rows * dim * 4;
    if (buf.byteLength !== expected) {
      throw new Error(
        `${datasetId}: vectors.f32 is ${buf.byteLength} bytes, expected ${expected}. `
        + 'The pack and its meta.json are out of step — re-run embed_datasets.py.',
      );
    }

    const flat = new Float32Array(buf);
    const at = (i, v = 0) => flat.subarray((i * nVariants + v) * dim, (i * nVariants + v + 1) * dim);

    // Was this pack produced by the model the browser is running?
    //
    // Everything else about this design makes drift impossible by construction
    // -- one .onnx, both sides. This is the one hole left: someone rebuilds the
    // embeddings on another machine (a Kaggle GPU, say), the export there comes
    // out slightly different, and the heads fitted on those vectors get applied
    // to features from this export. No error, no crash, just quietly wrong
    // predictions. So the packs carry the stamp and we check it.
    //
    // A pack with no stamp predates this check; warn rather than block, because
    // refusing to open a dataset a student already has is worse than saying so.
    const running = backboneId();
    if (meta.model_sha256 && running && meta.model_sha256 !== running) {
      throw new Error(
        `${datasetId} was embedded with backbone ${meta.model_sha256}, but the browser `
        + `is running ${running}. Those are different exports, so the heads fitted on `
        + 'this pack do not match the features being computed now. Re-run '
        + 'scripts/embed_datasets.py --force, or restore the matching model.onnx.',
      );
    }
    if (!meta.model_sha256) {
      /* eslint-disable-next-line no-console */
      console.warn(
        `[heads] ${datasetId} has no backbone stamp -- it was built before that check `
        + 'existed. Re-embed it to make the match verifiable.',
      );
    }

    onProgress?.(1);
    return {
      datasetId,
      labels: meta.labels,
      labelIndex: meta.label_index,
      files: meta.files,
      count,
      dim,
      nVariants,
      variantNames: meta.variants ?? ['original'],
      /** Variant 0 -- the untransformed originals. */
      vectors: Array.from({ length: count }, (_, i) => at(i)),
      /** Any image under any variant. */
      at,
      datasetHash: meta.dataset_hash,
      backbone: meta.backbone,
    };
  })();

  cache.set(key, promise);
  return promise;
}

/**
 * Which precomputed variants a set of augmentation toggles selects.
 *
 * MUST match the VARIANTS order in scripts/embed_datasets.py. If these drift,
 * "flip" starts selecting the brightened copy and Lab B measures the wrong
 * thing while looking entirely normal -- so the names are checked against the
 * pack rather than assumed.
 */
const VARIANT_FOR = {
  original: null,        // always included
  flip: 'flip',
  rotate: ['rotate_p20', 'rotate_m20'],
  brightness: ['bright_up', 'bright_down'],
};

export function variantIndicesFor(pack, active = {}) {
  const names = pack.variantNames;
  const wanted = ['original'];
  Object.entries(VARIANT_FOR).forEach(([toggle, mapped]) => {
    if (toggle === 'original' || !active[toggle]) return;
    (Array.isArray(mapped) ? mapped : [mapped]).forEach((n) => wanted.push(n));
  });

  const indices = wanted.map((n) => {
    const i = names.indexOf(n);
    if (i < 0) {
      throw new Error(
        `The embedding pack for ${pack.datasetId} has no "${n}" variant `
        + `(it has: ${names.join(', ')}). Re-run embed_datasets.py --force.`,
      );
    }
    return i;
  });
  return indices;
}

/**
 * Expand a pack into the flat shape TrainPanel expects, honouring the toggles.
 *
 * `sourceIndex` maps every row back to the real photo it came from, which is
 * what keeps augmented copies of a test image out of the training set.
 */
export function expandPack(pack, active = {}) {
  const variants = variantIndicesFor(pack, active);
  const vectors = [];
  const labels = [];
  const sourceIndex = [];

  for (let i = 0; i < pack.count; i++) {
    for (const v of variants) {
      vectors.push(pack.at(i, v));
      labels.push(pack.labelIndex[i]);
      sourceIndex.push(i);
    }
  }

  return {
    vectors,
    labels,
    sourceIndex,
    labelNames: pack.labels,
    realCount: pack.count,
    multiplier: variants.length,
    provenance: 'precomputed',
  };
}

/** The card: every rung, with the accuracy each one actually scored. */
export async function loadCard(datasetId) {
  const key = `card:${datasetId}`;
  if (!cache.has(key)) cache.set(key, getJson(`/heads/${datasetId}/card.json`));
  return cache.get(key);
}

/**
 * One head's weights.
 *
 * Layout is fixed by train_heads.py and asserted here rather than trusted:
 * (dim x classes) row-major, then (classes,) of bias, all float32. A transposed
 * head runs perfectly happily and returns nonsense, so the byte length is
 * checked before anything is allowed to use it.
 */
export async function loadHead(datasetId, perClass) {
  const key = `head:${datasetId}:${perClass}`;
  if (cache.has(key)) return cache.get(key);

  const promise = (async () => {
    const card = await loadCard(datasetId);
    const rung = card.rungs.find((r) => r.per_class === perClass);
    if (!rung) {
      throw new Error(
        `No head built at ${perClass} per class for ${datasetId}. `
        + `Available: ${card.rungs.map((r) => r.per_class).join(', ')}.`,
      );
    }

    const res = await fetch(`/heads/${datasetId}/${rung.weights}`);
    if (!res.ok) throw new Error(`${rung.weights} missing for ${datasetId}`);
    const buf = await res.arrayBuffer();

    const [dim, classes] = card.layout.weights_shape;
    const expected = (dim * classes + classes) * 4;
    if (buf.byteLength !== expected) {
      throw new Error(
        `${datasetId} rung ${perClass}: weights are ${buf.byteLength} bytes, expected `
        + `${expected} for a ${dim}x${classes} head. Re-run train_heads.py.`,
      );
    }

    const flat = new Float32Array(buf);
    return {
      datasetId,
      perClass,
      dim,
      classes,
      labels: card.labels,
      W: flat.subarray(0, dim * classes),
      b: flat.subarray(dim * classes),
      rung,
      card,
    };
  })();

  cache.set(key, promise);
  return promise;
}

/** softmax(x @ W + b). Must match train_heads.py's forward exactly. */
export function forward(head, embedding) {
  const { W, b, dim, classes } = head;
  if (embedding.length !== dim) {
    throw new Error(`Embedding is ${embedding.length}-d, head expects ${dim}-d.`);
  }

  const logits = new Float32Array(classes);
  for (let c = 0; c < classes; c++) logits[c] = b[c];
  for (let i = 0; i < dim; i++) {
    const x = embedding[i];
    if (x === 0) continue;
    const row = i * classes;
    for (let c = 0; c < classes; c++) logits[c] += x * W[row + c];
  }

  let max = -Infinity;
  for (let c = 0; c < classes; c++) if (logits[c] > max) max = logits[c];
  let sum = 0;
  for (let c = 0; c < classes; c++) { logits[c] = Math.exp(logits[c] - max); sum += logits[c]; }
  for (let c = 0; c < classes; c++) logits[c] /= sum;
  return logits;
}

/** @returns {{label:string, score:number}[]} sorted, highest first */
export function predictWithHead(head, embedding) {
  const probs = forward(head, embedding);
  return Array.from(probs)
    .map((score, i) => ({ label: head.labels[i], score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * A precomputed head, shaped like a live training run so the rest of the app --
 * diagnose.js, the stat row, the coach -- does not need to know the difference.
 *
 * `provenance` is the one field that differs, and the UI is required to show it.
 */
export async function runFromRung(datasetId, perClass) {
  const head = await loadHead(datasetId, perClass);
  const { rung, card } = head;

  return {
    runId: `${datasetId}:precomputed:${perClass}`,
    modelId: 'cnn_linear_head',
    modelLabel: 'Linear head on ResNet-50 features',
    datasetId,
    labels: card.labels,
    tuningMode: 'partial',
    paramCount: rung.param_count,
    featureLength: head.dim,
    trainCount: rung.train_count,
    testCount: rung.test_count,
    realCount: rung.train_count,
    perClass,
    augmentation: { active: false },
    accuracy: rung.accuracy,
    confusion: rung.confusion,
    perClassAccuracy: rung.per_class_accuracy,
    labelCounts: Object.fromEntries(card.labels.map((l, i) => [l, rung.per_class_accuracy[i] != null ? perClass : 0])),
    crossDataset: {},
    curve: [],
    trainSeconds: 0,
    provenance: {
      kind: 'precomputed',
      builtBy: 'scripts/train_heads.py',
      trainer: card.trainer,
      buildKey: card.build_key,
      note: `Fitted on ${rung.train_count} images and scored on ${rung.test_count} it `
          + 'never saw. Computed at build time, not just now.',
    },
    _head: head,
  };
}

/**
 * Score a precomputed head against another dataset's embeddings.
 * Returns null when the label sets differ -- the model has no way to be right,
 * and reporting zero would imply it tried.
 */
export function scoreAgainstPack(head, pack) {
  const sameLabels = pack.labels.length === head.labels.length
    && pack.labels.every((n, i) => n === head.labels[i]);
  if (!sameLabels) return null;

  let hits = 0;
  for (let i = 0; i < pack.count; i++) {
    if (argmax(forward(head, pack.vectors[i])) === pack.labelIndex[i]) hits += 1;
  }
  return hits / pack.count;
}
