/**
 * digitData.js — loads the real handwritten-digit datasets the browser trains on.
 *
 * Each variant ships as one 28-px-wide vertical strip PNG under
 * /datasets/mnist/ (built by Stage1/scripts/pack_digit_sprites.py from real
 * MNIST-family images). Slicing a strip is a single drawImage per tile, so the
 * whole set decodes in well under a second.
 *
 * Every tile was normalised by the packing script exactly the way
 * imageOps.js:extractInput28() normalises a drawing at prediction time. Training
 * and inference must see the same distribution or the accuracy numbers are
 * meaningless.
 *
 * If the datasets are not installed yet, load() resolves to null rather than
 * throwing — the UI shows a "not installed" card instead of pretending.
 */

const BASE = '/datasets/mnist';
const TILE = 28;

export const VARIANTS = ['clean', 'messy', 'noisy'];

let _labelsPromise = null;
let _metaPromise = null;
const _cache = {};

function loadJson(path) {
  return fetch(path)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
}

export function loadLabels() {
  if (!_labelsPromise) _labelsPromise = loadJson(`${BASE}/labels.json`);
  return _labelsPromise;
}

/** Per-variant provenance: { clean: { source: 'real'|'derived', count, ... } }. */
export function loadMeta() {
  if (!_metaPromise) _metaPromise = loadJson(`${BASE}/meta.json`);
  return _metaPromise;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`missing ${src}`));
    img.src = src;
  });
}

/**
 * Load one variant.
 * @returns {Promise<{grids: Float32Array[], labels: number[], count: number} | null>}
 */
export async function loadVariant(variant) {
  if (_cache[variant] !== undefined) return _cache[variant];

  const promise = (async () => {
    const labelsAll = await loadLabels();
    const labels = labelsAll?.[variant];
    if (!labels?.length) return null;

    let img;
    try {
      img = await loadImage(`${BASE}/${variant}.png`);
    } catch {
      return null;
    }

    const count = Math.min(labels.length, Math.floor(img.height / TILE));
    if (!count) return null;

    // Read the whole strip once, then slice in memory — far cheaper than
    // getImageData per tile.
    const canvas = document.createElement('canvas');
    canvas.width = TILE;
    canvas.height = count * TILE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, TILE, count * TILE);

    const grids = [];
    for (let i = 0; i < count; i++) {
      const grid = new Float32Array(TILE * TILE);
      const offset = i * TILE * TILE;
      for (let p = 0; p < TILE * TILE; p++) {
        grid[p] = data[(offset + p) * 4] / 255; // greyscale strip: R === G === B
      }
      grids.push(grid);
    }

    return { grids, labels: labels.slice(0, count), count };
  })();

  _cache[variant] = promise;
  return promise;
}

/** True when at least the clean set is installed. */
export async function datasetsInstalled() {
  return Boolean(await loadVariant('clean'));
}

/**
 * A handful of real tiles from a variant, as data URLs, for the preview gallery.
 * Picks distinct digits so the strip shows variety rather than five 3s.
 */
export async function previewTiles(variant, count = 6, scale = 4) {
  const set = await loadVariant(variant);
  if (!set) return [];

  let seed = 0x811c9dc5;
  for (let i = 0; i < variant.length; i++) {
    seed ^= variant.charCodeAt(i);
    seed = Math.imul(seed, 0x01000193);
  }
  
  const rand = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const indices = [];
  for (let i = 0; i < set.count; i++) indices.push(i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const chosen = [];
  const seen = new Set();
  for (let pass = 0; pass < 2 && chosen.length < count; pass++) {
    for (const i of indices) {
      if (chosen.length >= count) break;
      const label = set.labels[i];
      if (pass === 0 && seen.has(label)) continue; // first pass: unique digits
      seen.add(label);
      chosen.push(i);
    }
  }

  return chosen.map((i) => {
    const canvas = document.createElement('canvas');
    canvas.width = TILE * scale;
    canvas.height = TILE * scale;
    const ctx = canvas.getContext('2d');
    const grid = set.grids[i];
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const v = Math.round(Math.max(0, Math.min(1, grid[y * TILE + x])) * 255);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
    return { url: canvas.toDataURL('image/png'), label: set.labels[i] };
  });
}

/**
 * Deterministic 80/20 split. Deterministic on purpose: a student re-running the
 * same dataset must get the same accuracy, or the numbers look like noise.
 */
export function splitTrainTest(set, testFraction = 0.2) {
  const order = [];
  for (let i = 0; i < set.count; i++) order.push(i);
  // Fixed-seed shuffle (mulberry32) so the split never changes between runs.
  let seed = 0x9e3779b9;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  const testSize = Math.max(1, Math.round(set.count * testFraction));
  const testIdx = order.slice(0, testSize);
  const trainIdx = order.slice(testSize);
  const pick = (idx) => ({
    grids: idx.map((i) => set.grids[i]),
    labels: idx.map((i) => set.labels[i]),
    count: idx.length,
  });
  return { train: pick(trainIdx), test: pick(testIdx) };
}
