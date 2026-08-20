/**
 * datasets.js -- what the model gets to study.
 *
 * Two sources, deliberately:
 *
 *   1. INSTALLED SETS, described by `public/datasets/index.json`. This is the
 *      real curriculum -- flowers, mushrooms, the mixed set. Sourcing them is a
 *      separate job (see public/datasets/README.md) and until it is done the UI
 *      says "not installed" and offers the link. It never shows a placeholder
 *      dataset, because a fake dataset produces fake accuracy and this module
 *      is entirely about trusting the numbers.
 *
 *   2. THE STUDENT'S OWN PHOTOS, dropped in from disk. Always available, needs
 *      no sourcing, and it is a better lesson anyway: when they built the
 *      dataset themselves, they cannot argue with the bias in it.
 *
 * Both arrive in the same shape, so nothing downstream knows or cares which it
 * got.
 *
 * @typedef {object} Dataset
 * @property {string} dataset_id
 * @property {string} name
 * @property {string[]} labels
 * @property {number} count
 * @property {'installed'|'yours'} origin
 * @property {HTMLImageElement[]} images
 * @property {number[]} imageLabels    label index per image
 * @property {string} [licence]
 * @property {string} [licence_class]
 */

const INDEX_URL = '/datasets/index.json';

/** Load an <img> and wait for it to decode. */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

/**
 * The catalogue -- what could be trained on, without downloading any of it.
 *
 * Returns [] rather than throwing when nothing is installed. A missing
 * index.json is the normal state of a fresh checkout, not an error.
 *
 * @returns {Promise<Array<object>>} catalogue records (no images)
 */
export async function fetchCatalogue() {
  try {
    const res = await fetch(INDEX_URL, { cache: 'no-cache' });
    if (!res.ok) return [];
    const body = await res.json();
    return (body.datasets || []).map((d) => ({ ...d, origin: 'installed' }));
  } catch {
    return [];
  }
}

/**
 * Download one installed dataset's images.
 *
 * @param {object} record  from fetchCatalogue()
 * @param {(done:number,total:number)=>void} [onProgress]
 * @returns {Promise<Dataset>}
 */
export async function loadInstalled(record, onProgress) {
  const files = record.files || [];
  const images = [];
  const imageLabels = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    /* eslint-disable-next-line no-await-in-loop */
    const img = await loadImage(`/datasets/${record.dataset_id}/${f.path}`);
    images.push(img);
    imageLabels.push(record.labels.indexOf(f.label));
    onProgress?.(i + 1, files.length);
  }

  return {
    dataset_id: record.dataset_id,
    name: record.name,
    labels: record.labels,
    count: images.length,
    origin: 'installed',
    licence: record.licence,
    licence_class: record.licence_class,
    images,
    imageLabels,
  };
}

/**
 * Build a dataset from files the student picked.
 *
 * The class of each image comes from the folder it was in -- which is how
 * every real image dataset on earth is organised, and worth saying out loud
 * in the UI. Files at the top level with no folder are rejected with a reason
 * rather than silently dropped.
 *
 * @param {FileList|File[]} fileList  from an <input webkitdirectory> or a drop
 * @param {string} name
 * @returns {Promise<{dataset:Dataset|null, skipped:number, reason:string|null}>}
 */
export async function datasetFromFiles(fileList, name = 'Your photos') {
  const files = Array.from(fileList).filter((f) => /^image\//.test(f.type));
  if (!files.length) {
    return { dataset: null, skipped: 0, reason: 'No image files in that folder.' };
  }

  const byLabel = new Map();
  let skipped = 0;

  files.forEach((f) => {
    // webkitRelativePath looks like "myset/rose/img_01.jpg" -- the folder
    // immediately above the file is the label.
    const parts = (f.webkitRelativePath || f.name).split('/');
    if (parts.length < 2) { skipped += 1; return; }
    const label = parts[parts.length - 2];
    if (!byLabel.has(label)) byLabel.set(label, []);
    byLabel.get(label).push(f);
  });

  if (byLabel.size < 2) {
    return {
      dataset: null,
      skipped,
      reason: 'A classifier needs at least two folders to tell apart. Put your '
            + 'images in one folder per class, then pick the folder above them.',
    };
  }

  const labels = [...byLabel.keys()].sort();
  const images = [];
  const imageLabels = [];

  for (let li = 0; li < labels.length; li++) {
    const group = byLabel.get(labels[li]);
    for (let i = 0; i < group.length; i++) {
      const url = URL.createObjectURL(group[i]);
      try {
        /* eslint-disable-next-line no-await-in-loop */
        const img = await loadImage(url);
        images.push(img);
        imageLabels.push(li);
      } catch {
        skipped += 1;
      }
      // Not revoked: the <img> keeps using the blob for previews. Released when
      // the dataset is dropped.
    }
  }

  return {
    dataset: {
      dataset_id: `yours/${name.toLowerCase().replace(/\s+/g, '_')}`,
      name,
      labels,
      count: images.length,
      origin: 'yours',
      licence: 'Yours. These images never leave this browser.',
      licence_class: 'owned',
      images,
      imageLabels,
    },
    skipped,
    reason: null,
  };
}

/** Per-class counts, for the imbalance warning and the Data Library card. */
export function labelCountsOf(dataset) {
  const out = {};
  dataset.labels.forEach((l) => { out[l] = 0; });
  dataset.imageLabels.forEach((y) => { out[dataset.labels[y]] += 1; });
  return out;
}

/**
 * Is this dataset usable at all, and if not, why not?
 *
 * A rejection that explains itself teaches more than a disabled button, so this
 * always returns a reason a student can act on.
 */
export function checkUsable(dataset) {
  if (!dataset) return { ok: false, reason: 'Pick a dataset first.' };
  if (!dataset.labels?.length) {
    return {
      ok: false,
      reason: 'These images have no labels. A model has to be told the right '
            + 'answer for each example before it can learn anything.',
    };
  }
  if (dataset.labels.length < 2) {
    return { ok: false, reason: 'Only one class here. A classifier needs at least two things to tell apart.' };
  }
  const counts = labelCountsOf(dataset);
  const min = Math.min(...Object.values(counts));
  if (min < 2) {
    const thin = Object.entries(counts).find(([, n]) => n < 2)?.[0];
    return {
      ok: false,
      reason: `"${thin}" has fewer than 2 images. With one example there is `
            + 'nothing to hold back for testing, so any score would be meaningless.',
    };
  }
  return { ok: true, reason: null };
}
