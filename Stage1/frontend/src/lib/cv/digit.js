/**
 * digit.js — reliable, instant in-browser handwritten-digit recognition.
 *
 * Runs a compact MLP (784→128→10) that was trained on real MNIST and exported to
 * public/models/mnist/mlp.json. Forward pass is plain JS (no tfjs needed here) —
 * ~100k multiplies, sub-millisecond. Deterministic; no backend, Docker, or LLM.
 */

import { extractInput28, gridToDataURL } from './imageOps';
import { loadDigitModel } from './mnistModel';
import { predictWithHead } from './digitTrainer';

export { loadDigitModel };

function forward(model, input) {
  const { W1, b1, W2, b2 } = model;
  const H = b1.length, O = b2.length;
  const h = new Float32Array(H);
  for (let j = 0; j < H; j++) {
    let s = b1[j];
    for (let i = 0; i < 784; i++) s += input[i] * W1[i][j];
    h[j] = s > 0 ? s : 0; // relu
  }
  const o = new Float32Array(O);
  let max = -Infinity;
  for (let k = 0; k < O; k++) {
    let s = b2[k];
    for (let j = 0; j < H; j++) s += h[j] * W2[j][k];
    o[k] = s; if (s > max) max = s;
  }
  let sum = 0;
  for (let k = 0; k < O; k++) { o[k] = Math.exp(o[k] - max); sum += o[k]; }
  for (let k = 0; k < O; k++) o[k] /= sum;
  return o;
}

/**
 * Run the full digit pipeline on a drawing canvas or sample image.
 *
 * When `trainedHead` is supplied (the student trained a model in this session,
 * see digitTrainer.js) the prediction comes from THAT model — so a clean-trained
 * head really does misread a noisy digit, with no fudging. Without one we fall
 * back to the factory MNIST model and say so.
 *
 * Returns { ok, digit, confidence, probs, stages, mismatch_message, simulated }
 * shaped for CVPipelineOverlay.
 *
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {Object} options { trainedHead, trainedVariant, testVariant }
 */
export async function runDigitPipeline(sourceCanvas, options = {}) {
  const { trainedVariant = 'clean', testVariant = 'drawn', trainedHead = null } = options;
  const model = await loadDigitModel();
  const grid = extractInput28(sourceCanvas);

  if (!grid) {
    return { ok: false, reason: 'blank' };
  }

  let probs;
  let simulated = false;

  if (trainedHead) {
    // Real model: frozen 784→128 features, plus the head the student trained.
    probs = (await predictWithHead(trainedHead, grid)).probs;
  } else {
    probs = Array.from(forward(model, grid));
    simulated = true;
  }

  let digit = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[digit]) digit = i;
  const confidence = Math.round(probs[digit] * 100);

  // The mismatch note is now a description of a real outcome rather than a
  // penalty applied to one: low confidence here means the trained model
  // genuinely struggled with this input.
  let mismatch_message = null;
  if (trainedHead && testVariant !== 'drawn' && trainedVariant !== testVariant && confidence < 70) {
    mismatch_message = `This model was trained on ${trainedVariant} digits and is now being shown a ${testVariant} one — it is only ${confidence}% sure. That gap is the cost of a training set that didn't cover this case.`;
  } else if (simulated && testVariant !== 'drawn' && trainedVariant !== testVariant) {
    mismatch_message = `The digit datasets aren't installed yet, so this is the factory MNIST model rather than one you trained. Install them (see datasets/DATASETS_TO_ADD.md) to see the real difference between a ${trainedVariant}-trained and a ${testVariant}-trained model.`;
  }

  const stages = [
    {
      title: 'Capture',
      description: 'Your digit, captured as raw pixels from the canvas.',
      image: sourceCanvas.toDataURL('image/png'),
    },
    {
      title: 'Process',
      description: 'Cropped to the ink, centred, and shrunk to a 28×28 grayscale grid — exactly the format the model was trained on.',
      image: gridToDataURL(grid, 28, 8, 'gray'),
    },
    {
      title: 'Understand',
      description: 'The intensity map the model actually reads — brighter cells are stronger strokes it uses to decide.',
      image: gridToDataURL(grid, 28, 8, 'heat'),
    },
    {
      title: 'Decide',
      description: trainedHead
        ? `A confidence score for each digit 0–9, from the model YOU trained on the ${trainedVariant} dataset. The tallest bar wins.`
        : 'A confidence score for each digit 0–9. The tallest bar is the winner!',
      bars: probs.map((p, i) => ({ label: String(i), value: p })),
      highlight: digit,
    },
  ];

  return { ok: true, digit, confidence, probs, stages, mismatch_message, simulated };
}
