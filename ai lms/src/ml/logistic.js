/* =========================================================================
   Logistic regression — pure model code. No DOM, no canvas, no globals.

   Deliberately the same forty students as the linear-regression lesson, asked
   a different question: not "what score?" but "did they pass?". Continuity is
   the point — a learner should see that changing the question, not the data,
   is what changes the method.

   ── Why (tipping point, sharpness) instead of (weight, bias) ──
   The textbook form is  p = sigmoid(w*hours + b), whose two parameters mean
   nothing to a beginner and, as in the linear lesson, sit on wildly different
   gradient scales. This module uses the equivalent form

       chance of passing = sigmoid( sharpness * (hours - tippingPoint) )

   `tippingPoint` is the hours at which a student is a 50/50 bet, read straight
   off the x-axis. `sharpness` is how abruptly the S turns over. Both are
   things you can point at on the chart, and both gradients are the same size.
   `toPlain()` converts back to w and b for anyone who wants them.
   ========================================================================= */

import { makeClass } from './linreg.js';

/** The mark a student needs to pass. */
export const PASS_MARK = 55;

/**
 * The same class as the linear lesson, relabelled pass/fail.
 * `passed` is 1 or 0 so it can be used directly in the arithmetic.
 */
export function makeCohort(opts = {}) {
  return makeClass(opts).map((p) => ({
    ...p,
    score: p.y,
    passed: p.y >= PASS_MARK ? 1 : 0,
  }));
}

export const sigmoid = (z) => 1 / (1 + Math.exp(-z));

/* ========================================================================= */

export class Problem {
  constructor(pts) {
    this.pts = pts;
  }

  /** Probability this student passes, under the given S-curve. */
  chance(tip, sharp, x) { return sigmoid(sharp * (x - tip)); }

  /**
   * Average surprise — the standard log loss, named for what it measures.
   * Being confident and wrong costs a great deal; being unsure costs a little.
   * Clamped away from 0 and 1 so a confident miss is expensive but finite
   * rather than infinite, which would blow up the chart.
   */
  surprise(tip, sharp) {
    let s = 0;
    for (const p of this.pts) {
      const q = Math.min(1 - 1e-6, Math.max(1e-6, this.chance(tip, sharp, p.x)));
      s += p.passed ? -Math.log(q) : -Math.log(1 - q);
    }
    return s / this.pts.length;
  }

  /** How many students the curve calls correctly, at the 50% line. */
  correct(tip, sharp) {
    let n = 0;
    for (const p of this.pts) {
      const said = this.chance(tip, sharp, p.x) >= 0.5 ? 1 : 0;
      if (said === p.passed) n++;
    }
    return n;
  }

  /** Same count, for a plain vertical cutoff — act 2's cruder model. */
  correctAtCutoff(cut) {
    let n = 0;
    for (const p of this.pts) {
      const said = p.x >= cut ? 1 : 0;
      if (said === p.passed) n++;
    }
    return n;
  }

  /** The cutoff that gets the most students right. Ties break leftmost. */
  bestCutoff() {
    let best = { cut: 0, n: -1 };
    for (let c = 0; c <= 10.001; c += 0.05) {
      const n = this.correctAtCutoff(c);
      if (n > best.n) best = { cut: +c.toFixed(2), n };
    }
    return best;
  }

  /** Gradient of average surprise, in (tipping point, sharpness). */
  gradient(tip, sharp) {
    let dTip = 0, dSharp = 0;
    for (const p of this.pts) {
      const err = this.chance(tip, sharp, p.x) - p.passed;
      dTip += err * -sharp;
      dSharp += err * (p.x - tip);
    }
    const n = this.pts.length;
    return { dTip: dTip / n, dSharp: dSharp / n };
  }

  /**
   * The best S-curve, found by plain gradient descent from a neutral start.
   * There is no closed form here (unlike least squares), which is itself worth
   * saying out loud in the lesson: sometimes stepping downhill is the only
   * way there is.
   */
  bestCurve() {
    let tip = 5, sharp = 1;
    for (let i = 0; i < 6000; i++) {
      const g = this.gradient(tip, sharp);
      tip -= 0.5 * g.dTip;
      sharp -= 0.5 * g.dSharp;
      sharp = Math.min(6, Math.max(0.05, sharp));
    }
    return { tip, sharp };
  }

  /** S-curve params -> the w and b of the textbook form. */
  toPlain(tip, sharp) {
    return { w: sharp, b: -sharp * tip };
  }

  get passRate() {
    return this.pts.reduce((s, p) => s + p.passed, 0) / this.pts.length;
  }
}

/* ========================================================================= */

/**
 * Stateful trainer, one student per step, mirroring the linear lesson's
 * Trainer so the two read as the same machine doing the same thing.
 */
export class Trainer {
  constructor(problem, {
    lr = 0.3, epochs = 5, seed = 21, decay = 0.8,
    start = { tip: 2, sharp: 0.4 },
  } = {}) {
    this.p = problem;
    this.lr = lr;
    this.epochs = epochs;
    this.seed = seed;
    this.decay = decay;
    this.start = start;
    this.reset();
  }

  get currentLr() { return this.lr * this.decay ** this.epoch; }
  get done() { return this.epoch >= this.epochs; }
  get totalSteps() { return this.epochs * this.p.pts.length; }

  reset() {
    this.tip = this.start.tip;
    this.sharp = this.start.sharp;
    this.epoch = 0;
    this.cursor = 0;
    this.steps = 0;
    this._s = this.seed >>> 0;
    this.order = this._shuffled();
    this.last = null;
    this.history = [{
      tip: this.tip, sharp: this.sharp,
      loss: this.p.surprise(this.tip, this.sharp), step: 0,
    }];
    return this;
  }

  _rand() {
    this._s = (this._s * 1664525 + 1013904223) >>> 0;
    return this._s / 4294967296;
  }

  _shuffled() {
    const o = this.p.pts.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(this._rand() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }

  step() {
    if (this.done) return null;

    if (this.cursor >= this.order.length) {
      this.epoch++;
      this.cursor = 0;
      this.order = this._shuffled();
      if (this.done) return null;
    }

    const point = this.p.pts[this.order[this.cursor++]];
    const from = { tip: this.tip, sharp: this.sharp };
    const said = this.p.chance(this.tip, this.sharp, point.x);
    const err = said - point.passed;          // + means over-confident of a pass
    const lr = this.currentLr;

    this.tip -= lr * (err * -this.sharp);
    this.sharp -= lr * (err * (point.x - this.tip));
    this.sharp = Math.min(6, Math.max(0.05, this.sharp));
    this.steps++;

    const loss = this.p.surprise(this.tip, this.sharp);
    this.history.push({ tip: this.tip, sharp: this.sharp, loss, step: this.steps });
    this.last = { point, said, err, from, to: { tip: this.tip, sharp: this.sharp }, loss };
    return this.last;
  }
}
