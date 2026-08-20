/**
 * backbone.js -- the convolutional network, in the browser.
 *
 * ONE MODEL, ONE FILE, TWO ANSWERS.
 *
 * The ViT build this replaces needed two separate checkpoints: a 1,000-class
 * classifier for Acts 1-3, and a *different* published checkpoint for the
 * features every head was fitted on. Explaining why the model the student just
 * met was not quite the model being fine-tuned was the single most awkward
 * paragraph in the module.
 *
 * A CNN does not need that. `public/models/resnet50/model.onnx` is one graph
 * with two outputs, produced by one forward pass:
 *
 *   logits    [N, 1000]   the generalist's answer, in ImageNet's vocabulary.
 *   features  [N, 2048]   the global-average-pooled output of the last
 *                         convolution block -- the description that classifier
 *                         is reading. Every head in this module is fitted here.
 *
 * So "the thing that names photos sits directly on top of the thing that sees
 * them, and fine-tuning replaces only the first" stops being a claim in a
 * diagram and becomes literally two tensors out of the same run. Step 6 also
 * gets both answers for the price of one inference.
 *
 * PARITY IS NO LONGER A RISK, BECAUSE IT IS NO LONGER A QUESTION.
 *
 * `scripts/embed_datasets.py` runs this exact file through onnxruntime; this
 * module runs it through onnxruntime-web. Same weights, same graph, same
 * operators. The ViT build loaded a Google checkpoint on one side and a
 * separately converted, quantised Xenova export on the other, and needed
 * `check_parity.py` plus a page of README to argue they had not drifted. There
 * is nothing here to drift.
 *
 * It also means the module runs with no internet. Nothing is fetched from a
 * CDN -- which is the difference between working and not working on school
 * wifi.
 */

// The `/wasm` subpath, not the package root.
//
// The root entry bundles every backend onnxruntime-web can do, which drags the
// 22 MB WebGPU (.jsep) binary into `dist/` as an emitted asset -- for a build
// that pins `executionProviders: ['wasm']` and never touches it. This entry is
// the WASM-only build: same API, 48 KB of loader, and the only .wasm it knows
// about is the one scripts/copy_ort.mjs puts in public/ort/.
import * as ort from 'onnxruntime-web/wasm';
import { containFitPixels } from './resample.js';

const MODEL_DIR = '/models/resnet50';

export const EMBED_DIM = 2048;
export const IMAGE_SIZE = 224;
export const CLASS_COUNT = 1000;

/**
 * ImageNet's per-channel statistics, and the reason this file cannot guess them.
 *
 * These are read from the exported meta.json rather than typed in here, because
 * `cnn_preprocess.py` asserts against the same file. If someone re-exports with
 * a different normalisation, both sides move together or the export fails loud.
 * They are only defaulted so that `preprocess()` has something to work with if
 * it is called before the model has loaded, which no code path currently does.
 *
 * Note these are NOT the ViT values. ViT used mean = std = 0.5 on every channel.
 * Feeding a ResNet ViT-normalised pixels does not error -- it quietly costs
 * several points of accuracy, which is the worst way for a bug to behave.
 */
let imageMean = [0.485, 0.456, 0.406];
let imageStd = [0.229, 0.224, 0.225];

/** Roughly what the download costs, for the "Load the model" button's copy. */
export const MODEL_SIZE_MB = 102;

export const BASE_MODEL_CARD = {
  id: 'resnet50',
  label: 'ResNet-50',
  school: 'General school',
  trainedOn: 'ImageNet-1k',
  trainingImages: '1.2 million',
  classCount: CLASS_COUNT,
  embeddingSize: EMBED_DIM,
  paramCount: 25_600_000,
  blurb: 'A convolutional network. It slides small filters across the picture '
       + 'looking for one thing at a time — first edges, then textures, then '
       + 'shapes — and each layer works on what the layer below it found.',
  architecture: [
    { name: 'Early convolutions', note: 'edges, corners and colour patches' },
    { name: 'Middle convolutions', note: 'textures, spots, stripes, petal edges' },
    { name: 'Late convolutions', note: 'whole parts — a wing, a face, a stem' },
    { name: 'Pooling → 2,048 numbers', note: 'the summary — this is what fine-tuning reuses' },
    { name: '1,000-way classifier', note: 'the only part that gets replaced' },
  ],
  blindSpots: [
    'I answer only in my 1,000 labels. If the word you want is not one of them, '
      + 'I cannot say it — I will give you my closest label instead.',
    'I am shallow where I am broad. I know "mushroom" but almost no species; I '
      + 'know a handful of flowers by name and not the other ninety.',
    'I always answer. Even when the right answer is not available to me, I '
      + 'return my best guess with a confidence score attached.',
  ],
};

/* ------------------------------------------------------------ the session -- */

let sessionPromise = null;
let labels = null;
let meta = null;

/** Which backend actually got used, once we know. Surfaced in the UI. */
export let activeBackend = null;

/**
 * WASM assets are served from `/ort/`, copied there by scripts/copy_ort.mjs.
 *
 * Deliberately not a CDN: this module has to work offline.
 *
 * THE ABSOLUTE URL IS LOAD-BEARING -- DO NOT SIMPLIFY IT TO '/ort/'.
 *
 * onnxruntime-web does not just `fetch()` these files; it `import()`s the
 * sibling .mjs loader that drives the .wasm. With a root-relative path, Vite's
 * dev server sees `import('/ort/ort-wasm-simd-threaded.mjs')` as a *source
 * module* request and refuses it:
 *
 *   Internal server error: Failed to load url /ort/ort-wasm-simd-threaded.mjs
 *   This file is in /public and will be copied as-is during build without going
 *   through the plugin transforms, and therefore should not be imported from
 *   source code.
 *
 * The session then never starts, and because the failure happens inside a
 * dynamic import it surfaces as a hung "Load the model" button rather than an
 * error anyone can act on. Resolving to a fully-qualified http(s) URL makes
 * Vite treat it as external and leave it alone, in dev and in the built app
 * alike -- `location.href` means it still works from any origin or sub-path.
 */
ort.env.wasm.wasmPaths = typeof window !== 'undefined'
  ? new URL('/ort/', window.location.href).href
  : '/ort/';

// Threads need cross-origin isolation (COOP + COEP headers). We deliberately do
// not set those, because they would also break any cross-origin call the
// multimodal step is pointed at. onnxruntime-web falls back to one thread on its
// own, but says so noisily; asking for what we can actually have keeps the
// console clean and the behaviour explicit.
ort.env.wasm.numThreads = typeof self !== 'undefined' && self.crossOriginIsolated
  ? Math.min(4, navigator.hardwareConcurrency || 1)
  : 1;

async function getJson(url) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

export function explainLoadFailure(err) {
  const m = String(err?.message || err);
  if (/404|not found/i.test(m) && /model\.onnx/i.test(m)) {
    return 'The model file is not there. It is built once, from Python:\n\n'
      + '    python scripts/export_backbone.py\n\n'
      + 'That writes public/models/resnet50/model.onnx, which is the same file '
      + `the embedding scripts use. (${m.slice(0, 120)})`;
  }
  if (/\/ort\/|wasm/i.test(m)) {
    return 'The ONNX Runtime WebAssembly files are missing from public/ort/. '
      + 'Run `node scripts/copy_ort.mjs` (npm run dev does this automatically) '
      + `and reload. (${m.slice(0, 120)})`;
  }
  return 'The model could not be loaded. Unlike the previous build this does '
    + 'not need the internet — everything is served from this project — so the '
    + `usual cause is a missing or half-written file. (${m.slice(0, 160)})`;
}

/**
 * Open the inference session. Idempotent; every caller shares one model.
 *
 * @param {(status:string)=>void} [onProgress]
 */
export function loadBackbone(onProgress) {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      onProgress?.('Reading the model card');
      meta = await getJson(`${MODEL_DIR}/meta.json`);

      if (meta.embed_dim !== EMBED_DIM) {
        throw new Error(
          `The exported model produces ${meta.embed_dim}-d features but this build `
          + `expects ${EMBED_DIM}. Re-run scripts/export_backbone.py.`,
        );
      }
      imageMean = meta.image_mean;
      imageStd = meta.image_std;

      onProgress?.('Loading the 1,000 label names');
      labels = await getJson(`${MODEL_DIR}/labels.json`);

      onProgress?.(`Loading the network (${MODEL_SIZE_MB} MB)`);
      const session = await ort.InferenceSession.create(
        `${MODEL_DIR}/${meta.files.float32}`,
        { executionProviders: ['wasm'], graphOptimizationLevel: 'all' },
      );

      // The graph must carry both outputs or every head is fitted on nothing.
      // A model exported without `features` would load and run perfectly
      // happily, which is exactly why this is checked rather than assumed.
      const names = session.outputNames;
      if (!names.includes('features') || !names.includes('logits')) {
        throw new Error(
          `model.onnx exposes [${names.join(', ')}] — it needs both 'logits' and `
          + "'features'. Re-run scripts/export_backbone.py --force.",
        );
      }

      activeBackend = 'wasm';
      onProgress?.('Ready');
      return session;
    })().catch((err) => { sessionPromise = null; throw err; });
  }
  return sessionPromise;
}

/* Kept under their old names so the ten steps did not all need editing. Both
 * resolve to the same session now, which is the point. */
export const loadGeneralist = loadBackbone;
export const loadFeatures = loadBackbone;
export const isGeneralistLoaded = () => !!sessionPromise;
export const isFeaturesLoaded = () => !!sessionPromise;
export const labelList = () => labels;

/**
 * Which exact ONNX is loaded, as the short digest export_backbone.py stamped
 * into meta.json. `heads.js` compares this against the stamp on every embedding
 * pack, because a pack built against a *different* export is the one remaining
 * way for Python and the browser to disagree -- and it would be silent.
 *
 * Returns null before the model has loaded.
 */
export const backboneId = () => meta?.model_sha256 ?? null;

/* -------------------------------------------------------- preprocessing --- */

/**
 * Image element or canvas -> [1, 3, 224, 224] float32, ImageNet-normalised.
 *
 * The letterboxing and resampling live in `resample.js`, which reimplements
 * Pillow's bicubic filter rather than leaning on `drawImage`. Read the header
 * there before changing any of this: the browser and `cnn_preprocess.py` have
 * to agree to several decimal places, and canvas's default scaler does not
 * agree with anything.
 *
 * Channels-first, which is what the ONNX graph wants and the opposite of the
 * RGBA-interleaved bytes a canvas hands back.
 */
function preprocess(el) {
  const data = containFitPixels(el, IMAGE_SIZE);
  const n = IMAGE_SIZE * IMAGE_SIZE;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = (data[i * 4] / 255 - imageMean[0]) / imageStd[0];
    out[n + i] = (data[i * 4 + 1] / 255 - imageMean[1]) / imageStd[1];
    out[2 * n + i] = (data[i * 4 + 2] / 255 - imageMean[2]) / imageStd[2];
  }
  return new ort.Tensor('float32', out, [1, 3, IMAGE_SIZE, IMAGE_SIZE]);
}

function softmax(logits) {
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) if (logits[i] > max) max = logits[i];
  const out = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) { out[i] = Math.exp(logits[i] - max); sum += out[i]; }
  for (let i = 0; i < out.length; i++) out[i] /= sum;
  return out;
}

/* ---------------------------------------------------------------- running -- */

/**
 * One forward pass, both answers.
 *
 * Everything else in this file is a thin wrapper on this, because running the
 * network twice to get two tensors it already computed would be silly -- and on
 * step 6, where the student needs the specialist's answer and the generalist's
 * on the same photo, it is the difference between one wait and two.
 *
 * @returns {Promise<{probs:Float32Array, features:Float32Array}>}
 */
export async function run(el) {
  const session = await loadBackbone();
  const feeds = { pixel_values: preprocess(el) };
  const out = await session.run(feeds);
  return {
    probs: softmax(out.logits.data),
    features: Float32Array.from(out.features.data),
  };
}

/**
 * The generalist's answer.
 * @returns {Promise<{label:string, allNames:string, score:number}[]>}
 */
export async function classify(el, topK = 5) {
  const { probs } = await run(el);
  return topFrom(probs, topK);
}

function topFrom(probs, topK) {
  return Array.from(probs)
    .map((score, i) => ({ score, i }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ score, i }) => {
      const full = labels?.[i] ?? `class ${i}`;
      return {
        // ImageNet labels are comma-separated synonym lists ("agaric, mushroom").
        // The first synonym is the one a person would actually say.
        label: String(full).split(',')[0].trim(),
        allNames: full,
        score,
      };
    });
}

/**
 * The 2,048-number description underneath the classifier.
 * @returns {Promise<Float32Array>}
 */
export async function embed(el) {
  const { features } = await run(el);
  return features;
}

/** Both at once, for the screens that compare them. */
export async function classifyAndEmbed(el, topK = 5) {
  const { probs, features } = await run(el);
  return { predictions: topFrom(probs, topK), features };
}

/**
 * Embed many images, reporting progress.
 *
 * ResNet-50 is ~4.1 GFLOPs, which is roughly a third of a second per image in
 * single-threaded WASM -- four times quicker than the ViT this replaced, and
 * still slow enough that hundreds of images should be coming from the
 * build-time cache in `public/embeddings/` instead. This path is for a
 * student's own handful of photos, which no build step could have seen.
 */
export async function embedAll(els, onProgress) {
  const out = [];
  for (let i = 0; i < els.length; i++) {
    /* eslint-disable-next-line no-await-in-loop */
    out.push(await embed(els[i]));
    onProgress?.(i + 1, els.length);
  }
  return out;
}

/** Rough guidance for the UI's "this will take a while" copy. */
export function estimateEmbedSeconds(count) {
  return Math.max(1, Math.round(count * 0.35));
}
