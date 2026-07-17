/**
 * transferLearning.js — in-browser few-shot image training (Teachable-Machine style).
 *
 * WHY this design: a student can only realistically give us 5–6 photos. Training a
 * CNN from scratch on that is hopeless — so we do TRANSFER LEARNING: a pretrained
 * MobileNet turns each image into a 1024-number "fingerprint" (it already knows
 * edges/shapes/textures from a million photos), and a tiny KNN head learns the
 * classes from just a handful of those fingerprints. Runs fully client-side:
 * no GPU, no backend, and student webcam frames never leave the device.
 *
 * Usage:
 *   await loadModels(onProgress)
 *   await addExample(imgEl, 'Recycle')     // repeat a few times per class
 *   const p = await predict(imgEl)         // { label, confidence, all }
 *   reset() / getCounts() / removeClass(label)
 *
 * tfjs + the models are imported dynamically so they stay out of the main bundle.
 */

let _mobilenet = null;   // feature extractor
let _knn = null;         // classifier head
let _loading = null;

/** Load MobileNet + a fresh KNN head (cached after the first call). */
export function loadModels(onProgress) {
  if (!_loading) {
    _loading = (async () => {
      onProgress?.('Loading TensorFlow…');
      await import('@tensorflow/tfjs'); // registers the backend (side-effect import)
      onProgress?.('Loading the vision model…');
      const mobilenetPkg = await import('@tensorflow-models/mobilenet');
      const knnPkg = await import('@tensorflow-models/knn-classifier');
      // version 2 / alpha 1.0 = a good accuracy-vs-speed balance for classrooms
      _mobilenet = await mobilenetPkg.load({ version: 2, alpha: 1.0 });
      _knn = knnPkg.create();
      onProgress?.('Ready');
      return true;
    })();
  }
  return _loading;
}

/** MobileNet's internal "fingerprint" of an image (not its 1000-class guess). */
function embed(el) {
  // infer(el, true) → the penultimate-layer embedding used for transfer learning
  return _mobilenet.infer(el, true);
}

/** Teach the model one example: this image is a <label>. */
export async function addExample(el, label) {
  await loadModels();
  const activation = embed(el);
  _knn.addExample(activation, label);
  activation.dispose();
  return getCounts();
}

/** Predict the class of an image. Returns null until at least one example exists. */
export async function predict(el) {
  await loadModels();
  if (_knn.getNumClasses() === 0) return null;
  const activation = embed(el);
  const res = await _knn.predictClass(activation, 3); // k=3 nearest neighbours
  activation.dispose();
  return {
    label: res.label,
    confidence: Math.round((res.confidences[res.label] ?? 0) * 100),
    all: Object.fromEntries(Object.entries(res.confidences).map(([k, v]) => [k, Math.round(v * 100)])),
  };
}

/** How many examples per class, e.g. { Recycle: 5, Compost: 6 }. */
export function getCounts() {
  if (!_knn) return {};
  const counts = _knn.getClassExampleCount?.() || {};
  return { ...counts };
}

export function getNumClasses() {
  return _knn ? _knn.getNumClasses() : 0;
}

export function removeClass(label) {
  if (_knn && getCounts()[label]) _knn.clearClass(label);
  return getCounts();
}

/** Forget everything (keeps MobileNet loaded — only the learned head is cleared). */
export function reset() {
  if (_knn) _knn.clearAllClasses();
  return getCounts();
}

/** Load an image URL (or data URL) into an <img> ready for embedding. */
export async function imageFromUrl(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await img.decode();
  return img;
}

/**
 * Seed a class from our bundled sample images — this is the "merge your few
 * uploads with our existing dataset" idea: the student's 5 photos plus our
 * pre-stored examples give the KNN a much steadier footing.
 */
export async function seedFromUrls(urls, label, onEach) {
  await loadModels();
  for (const url of urls) {
    try {
      const img = await imageFromUrl(url);
      await addExample(img, label);
      onEach?.(url);
    } catch (e) {
      console.warn('seed failed for', url, e);
    }
  }
  return getCounts();
}
