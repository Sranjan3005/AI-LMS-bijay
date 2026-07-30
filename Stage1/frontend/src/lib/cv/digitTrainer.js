/**
 * digitTrainer.js — genuinely trains a digit classifier in the browser.
 *
 * This is real gradient descent on real data, not a simulation. What it does is
 * standard transfer learning:
 *
 *   1. The pre-trained MNIST network (public/models/mnist/mlp.json, 784→128→10)
 *      is split in two. The 784→128 half is the FEATURE EXTRACTOR — it turns a
 *      picture into 128 numbers describing its strokes. That half is frozen.
 *   2. The 128→10 half — the CLASSIFIER HEAD — is thrown away and retrained from
 *      scratch on whichever dataset the student picked, with softmax +
 *      cross-entropy and mini-batch SGD.
 *
 * Retraining only the head is what makes this fast enough to run live in a
 * lesson (~1300 weights, a second or two) while still being honest training:
 * pick the clean dataset and the head really does become a clean-digit
 * specialist that really does fall over on noisy input. The train-on-X /
 * test-on-Y matrix reports measured accuracy — every number in it came out of
 * this file, none of it is authored.
 */

import { loadDigitModel } from './mnistModel';
import { loadVariant, splitTrainTest, VARIANTS } from './digitData';

const HIDDEN = 128;
const CLASSES = 10;

/** Let the browser paint, so progress bars actually move during training. */
const yieldToUI = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Frozen feature extractor: one 784→128 ReLU layer from the pre-trained model.
 * This is the expensive step (~100k multiplies per image), so results are cached
 * per variant and reused by every subsequent training run.
 */
export function extractFeatures(model, grid) {
  const { W1, b1 } = model;
  const out = new Float32Array(HIDDEN);
  for (let j = 0; j < HIDDEN; j++) {
    let sum = b1[j];
    for (let i = 0; i < 784; i++) {
      const v = grid[i];
      if (v !== 0) sum += v * W1[i][j]; // MNIST grids are ~80% zeros
    }
    out[j] = sum > 0 ? sum : 0;
  }
  return out;
}

const _featureCache = {};

async function featuresFor(variant, onProgress) {
  if (_featureCache[variant]) return _featureCache[variant];

  const set = await loadVariant(variant);
  if (!set) return null;

  const model = await loadDigitModel();
  const { train, test } = splitTrainTest(set);

  const embed = async (part, label) => {
    const feats = [];
    for (let i = 0; i < part.count; i++) {
      feats.push(extractFeatures(model, part.grids[i]));
      if (i % 40 === 0) {
        onProgress?.({ phase: 'features', variant, label, done: i, total: part.count });
        await yieldToUI();
      }
    }
    return { features: feats, labels: part.labels, count: part.count };
  };

  const result = { train: await embed(train, 'train'), test: await embed(test, 'test') };
  _featureCache[variant] = result;
  return result;
}

function softmax(logits) {
  let max = -Infinity;
  for (let k = 0; k < CLASSES; k++) if (logits[k] > max) max = logits[k];
  let sum = 0;
  for (let k = 0; k < CLASSES; k++) { logits[k] = Math.exp(logits[k] - max); sum += logits[k]; }
  for (let k = 0; k < CLASSES; k++) logits[k] /= sum;
  return logits;
}

function forwardHead(head, feature) {
  const { W2, b2 } = head;
  const logits = new Float32Array(CLASSES);
  for (let k = 0; k < CLASSES; k++) {
    let sum = b2[k];
    for (let j = 0; j < HIDDEN; j++) sum += feature[j] * W2[j][k];
    logits[k] = sum;
  }
  return softmax(logits);
}

/**
 * Train a fresh classifier head on one dataset. Plain mini-batch SGD on
 * cross-entropy — the gradient of softmax+CE is just (predicted - target), which
 * is why this stays ~15 readable lines.
 */
// Defaults picked by sweeping the hard (noisy) variant: at 24 epochs / lr 0.06
// the head was still descending and stalled around 60% on its OWN data, which
// muddies the lesson — a dataset should at least be learnable. 90 epochs at
// lr 0.25 reaches a low loss on every variant while staying ~1s of compute.
export async function trainHead(data, { epochs = 90, lr = 0.25, batchSize = 16 } = {}, onProgress) {
  const W2 = Array.from({ length: HIDDEN }, () => new Float32Array(CLASSES));
  const b2 = new Float32Array(CLASSES);
  const head = { W2, b2 };

  const order = Array.from({ length: data.count }, (_, i) => i);
  let lastLoss = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = order.length - 1; i > 0; i--) {          // shuffle each epoch
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }

    let epochLoss = 0;
    for (let start = 0; start < order.length; start += batchSize) {
      const batch = order.slice(start, start + batchSize);
      const gradW = Array.from({ length: HIDDEN }, () => new Float32Array(CLASSES));
      const gradB = new Float32Array(CLASSES);

      for (const idx of batch) {
        const feature = data.features[idx];
        const target = data.labels[idx];
        const probs = forwardHead(head, feature);
        epochLoss -= Math.log(Math.max(probs[target], 1e-9));

        // dLoss/dLogits for softmax + cross-entropy
        for (let k = 0; k < CLASSES; k++) {
          const delta = probs[k] - (k === target ? 1 : 0);
          gradB[k] += delta;
          for (let j = 0; j < HIDDEN; j++) {
            if (feature[j] !== 0) gradW[j][k] += feature[j] * delta;
          }
        }
      }

      const step = lr / batch.length;
      for (let k = 0; k < CLASSES; k++) {
        b2[k] -= step * gradB[k];
        for (let j = 0; j < HIDDEN; j++) W2[j][k] -= step * gradW[j][k];
      }
    }

    lastLoss = epochLoss / data.count;
    onProgress?.({ phase: 'training', epoch: epoch + 1, epochs, loss: lastLoss });
    await yieldToUI();
  }

  return { head, loss: lastLoss };
}

export function accuracyOf(head, data) {
  let correct = 0;
  for (let i = 0; i < data.count; i++) {
    const probs = forwardHead(head, data.features[i]);
    let best = 0;
    for (let k = 1; k < CLASSES; k++) if (probs[k] > probs[best]) best = k;
    if (best === data.labels[i]) correct++;
  }
  return data.count ? correct / data.count : 0;
}

/**
 * The whole lesson in one call: train a head on `variant`, then measure it on
 * the held-out test split of EVERY variant.
 *
 * @returns {Promise<null | {
 *   variant: string, head: object, loss: number, trainedOn: number,
 *   accuracy: Record<string, number>,   // testVariant -> accuracy 0..1
 * }>}  null when the datasets are not installed.
 */
export async function trainOnVariant(variant, onProgress) {
  const own = await featuresFor(variant, onProgress);
  if (!own) return null;

  const { head, loss } = await trainHead(own.train, {}, onProgress);

  const accuracy = {};
  for (const other of VARIANTS) {
    const data = other === variant ? own : await featuresFor(other, onProgress);
    if (data) accuracy[other] = accuracyOf(head, data.test);
  }

  onProgress?.({ phase: 'done', accuracy });
  return { variant, head, loss, trainedOn: own.train.count, accuracy };
}

/**
 * Every train-on-X / test-on-Y pair — the 3x3 matrix behind the teaching panel.
 * Feature extraction is cached, so this costs barely more than one run.
 */
export async function trainAllVariants(onProgress) {
  const matrix = {};
  for (const variant of VARIANTS) {
    const result = await trainOnVariant(variant, onProgress);
    if (result) matrix[variant] = result;
  }
  return Object.keys(matrix).length ? matrix : null;
}

/** Classify one 28x28 grid with a trained head. */
export async function predictWithHead(head, grid) {
  const model = await loadDigitModel();
  const probs = Array.from(forwardHead(head, extractFeatures(model, grid)));
  let digit = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[digit]) digit = i;
  return { digit, confidence: Math.round(probs[digit] * 100), probs };
}
