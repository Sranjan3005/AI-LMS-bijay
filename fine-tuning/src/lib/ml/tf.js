/**
 * tf.js -- one lazy loader for TensorFlow.js, shared by everything.
 *
 * Kept behind a dynamic import so the module's first paint does not pay for a
 * ~1 MB library the student may never reach. `backendName()` is exposed because
 * the UI is required to say where training is actually running -- a Chromebook
 * that falls back to the CPU backend is a very different wait, and hiding that
 * turns an explainable delay into a hang.
 */

let tfPromise = null;

export function loadTf() {
  if (!tfPromise) {
    tfPromise = import('@tensorflow/tfjs').then(async (tf) => {
      await tf.ready();
      return tf;
    });
  }
  return tfPromise;
}

export async function backendName() {
  const tf = await loadTf();
  return tf.getBackend();
}

/** True when we are on a backend fast enough to train through a conv stack. */
export async function hasGpu() {
  const b = await backendName();
  return b === 'webgl' || b === 'webgpu';
}
