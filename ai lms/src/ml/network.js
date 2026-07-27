/* =========================================================================
   A tiny neural network (2 → H → 1) — pure model code. No DOM, no globals.

   The payoff lesson. Every method so far drew a straight boundary. This data
   can't be split by any straight line — one class sits in a ring around the
   other — so we stack simple pieces. Each hidden unit is itself just one of
   the straight-line detectors from the logistic lesson; bending and adding a
   few of them together makes a curved boundary.

   Layout: 2 inputs (x, y) → H hidden units (tanh) → 1 output (sigmoid).
   Training is ordinary gradient descent with backprop — the same "measure
   the wrongness, step downhill" as lessons 1 and 2, now with more knobs.
   Coordinates are scaled to roughly [-1, 1] inside the model (inputs 0–10),
   which is what keeps the gradients well behaved.
   ========================================================================= */

import { rings, split } from './points2d.js';

export { split };

/** The ring dataset: an inner cluster wrapped by an outer ring. */
export function makeRings(opts = {}) {
  return rings({ n: 64, seed: 11, innerR: 2.1, ringR: 3.9, ...opts });
}

export const ZONES = ['Outer', 'Inner'];

const tanh = Math.tanh;
const dtanh = (y) => 1 - y * y;                  // derivative in terms of output
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/** Map display coords (0–10) into the model's tidy [-1, 1]-ish range. */
const sx = (x) => (x - 5) / 5;

export class Network {
  /**
   * @param {number} H hidden units
   * @param {number} seed weight init seed
   */
  constructor(H = 8, seed = 4) {
    this.H = H;
    this.seed = seed;
    this.initWeights();
  }

  initWeights() {
    let s = this.seed >>> 0;
    const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const r = () => (rand() * 2 - 1);            // [-1, 1]
    // hidden layer: H units, each with (w1, w2, b)
    this.W1 = Array.from({ length: this.H }, () => [r() * 1.5, r() * 1.5, r() * 0.5]);
    // output layer: H weights + bias
    this.W2 = Array.from({ length: this.H }, () => r());
    this.b2 = r() * 0.2;
    return this;
  }

  /** Forward pass. Returns the probability plus the hidden activations. */
  forward(px, py) {
    const x = sx(px), y = sx(py);
    const h = new Array(this.H);
    for (let i = 0; i < this.H; i++) {
      const [w1, w2, b] = this.W1[i];
      h[i] = tanh(w1 * x + w2 * y + b);
    }
    let z = this.b2;
    for (let i = 0; i < this.H; i++) z += this.W2[i] * h[i];
    return { p: sigmoid(z), h, x, y };
  }

  /** Probability of the inner class at a display coordinate. */
  predict(px, py) { return this.forward(px, py).p; }

  /** Average cross-entropy loss (the "surprise" of lesson 2, layered). */
  loss(pts) {
    let s = 0;
    for (const pt of pts) {
      const q = Math.min(1 - 1e-7, Math.max(1e-7, this.predict(pt.x, pt.y)));
      s += pt.label ? -Math.log(q) : -Math.log(1 - q);
    }
    return s / pts.length;
  }

  /** Fraction classified correctly at the 0.5 threshold. */
  accuracy(pts) {
    let n = 0;
    for (const pt of pts) if ((this.predict(pt.x, pt.y) >= 0.5 ? 1 : 0) === pt.label) n++;
    return n / pts.length;
  }

  /**
   * One full-batch gradient-descent step (backprop). Full batch keeps the
   * animation smooth and the loss curve monotone enough to read.
   */
  trainStep(pts, lr) {
    const H = this.H;
    const gW1 = Array.from({ length: H }, () => [0, 0, 0]);
    const gW2 = new Array(H).fill(0);
    let gb2 = 0;

    for (const pt of pts) {
      const { p, h, x, y } = this.forward(pt.x, pt.y);
      const dz = p - pt.label;                   // dL/dz at the output
      gb2 += dz;
      for (let i = 0; i < H; i++) {
        gW2[i] += dz * h[i];
        const dh = dz * this.W2[i] * dtanh(h[i]);
        gW1[i][0] += dh * x;
        gW1[i][1] += dh * y;
        gW1[i][2] += dh;
      }
    }

    const n = pts.length;
    this.b2 -= lr * gb2 / n;
    for (let i = 0; i < H; i++) {
      this.W2[i] -= lr * gW2[i] / n;
      this.W1[i][0] -= lr * gW1[i][0] / n;
      this.W1[i][1] -= lr * gW1[i][1] / n;
      this.W1[i][2] -= lr * gW1[i][2] / n;
    }
    return this.loss(pts);
  }

  /** The line each hidden unit draws (where its pre-activation is zero). */
  hiddenLines() {
    // w1*x + w2*y + b = 0, converted back to display coords for drawing.
    return this.W1.map(([w1, w2, b]) => ({ w1, w2, b }));
  }
}

/* ========================================================================= */

/**
 * A trainer wrapper so the view code matches the other lessons' shape.
 * Rebuildable when the architecture (H) changes.
 */
export class Trainer {
  constructor(pts, { H = 8, lr = 0.7, seed = 4 } = {}) {
    this.pts = pts;
    this.lr = lr;
    this.net = new Network(H, seed);
    this.reset();
  }

  reset() {
    this.net.initWeights();
    this.epoch = 0;
    this.history = [{ step: 0, loss: this.net.loss(this.pts), acc: this.net.accuracy(this.pts) }];
    return this;
  }

  rebuild(H, seed = this.net.seed) {
    this.net = new Network(H, seed);
    this.reset();
    return this;
  }

  /** Advance one epoch (one full-batch step). */
  step() {
    const loss = this.net.trainStep(this.pts, this.lr);
    this.epoch++;
    this.history.push({ step: this.epoch, loss, acc: this.net.accuracy(this.pts) });
    return { loss, acc: this.net.accuracy(this.pts) };
  }

  get loss() { return this.net.loss(this.pts); }
  get accuracy() { return this.net.accuracy(this.pts); }
}
