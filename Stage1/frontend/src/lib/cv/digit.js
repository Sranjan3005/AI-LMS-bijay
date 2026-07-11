/**
 * digit.js — reliable, instant in-browser handwritten-digit recognition.
 *
 * Runs a compact MLP (784→128→10) that was trained on real MNIST and exported to
 * public/models/mnist/mlp.json. Forward pass is plain JS (no tfjs needed here) —
 * ~100k multiplies, sub-millisecond. Deterministic; no backend, Docker, or LLM.
 */

import { extractInput28, gridToDataURL } from './imageOps';

let _model = null;
let _loading = null;

export async function loadDigitModel() {
  if (_model) return _model;
  if (!_loading) {
    const url = (import.meta.env.BASE_URL || '/') + 'models/mnist/mlp.json';
    _loading = fetch(url).then((r) => {
      if (!r.ok) throw new Error('digit model failed to load');
      return r.json();
    }).then((m) => { _model = m; return m; });
  }
  return _loading;
}

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
 * Run the full digit pipeline on a drawing canvas.
 * Returns { ok, digit, confidence, probs, stages } shaped for CVPipelineOverlay.
 */
export async function runDigitPipeline(sourceCanvas) {
  const model = await loadDigitModel();
  const grid = extractInput28(sourceCanvas);

  if (!grid) {
    return { ok: false, reason: 'blank' };
  }

  const probs = Array.from(forward(model, grid));
  let digit = 0;
  for (let i = 1; i < probs.length; i++) if (probs[i] > probs[digit]) digit = i;
  const confidence = Math.round(probs[digit] * 100);

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
      description: 'A confidence score for each digit 0–9. The tallest bar is the winner!',
      bars: probs.map((p, i) => ({ label: String(i), value: p })),
      highlight: digit,
    },
  ];

  return { ok: true, digit, confidence, probs, stages };
}
