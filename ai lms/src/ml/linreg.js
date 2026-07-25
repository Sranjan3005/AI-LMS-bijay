/* =========================================================================
   Linear regression — pure model code. No DOM, no canvas, no globals.

   ── Why the line is anchored at "typical hours", not at zero ──
   A line can be written  score = slope*hours + intercept, but training that
   form with plain SGD behaves badly here: hours run 0–10, so the slope's
   gradient carries an x (up to 10) while the intercept's does not. The two
   parameters then need learning rates ~40x apart, and any single rate either
   crawls or diverges. (tests/linreg.test.mjs pins this down.)

   So the model is written around the class-average hours instead:

       score = tilt * (hours - center) + level

   `level` is the score of a typical student, `tilt` is points-per-extra-hour.
   Both gradients now sit on the same scale and one learning rate works.
   It is also the more honest quantity to show a beginner: "score at 0 hours"
   is an extrapolation past the edge of the data, "score at typical hours"
   is not. `toPlain()` converts back to slope/intercept for display.
   ========================================================================= */

/** Deterministic PRNG so a given seed always yields the same class. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const NAMES = [
  'Aisha', 'Ben', 'Chidi', 'Dara', 'Eli', 'Farah', 'Gus', 'Hana',
  'Ivan', 'Jo', 'Kira', 'Leo', 'Mina', 'Noor', 'Omar', 'Pia',
  'Quinn', 'Rosa', 'Sam', 'Tara', 'Uma', 'Vik', 'Wren', 'Xavi',
  'Yara', 'Zane', 'Ada', 'Bo', 'Cyrus', 'Devi', 'Ege', 'Fin',
  'Gia', 'Hugo', 'Ines', 'Jae', 'Kai', 'Lena', 'Milo', 'Nia',
];

/** The hidden rule the class follows. Students never see these. */
export const TRUTH = { slope: 5.4, intercept: 38 };

/**
 * A class of students: hours revised (x) against exam score (y).
 * Scores clamp to a real 0–100 range, so the recoverable best fit sits close
 * to TRUTH without matching it — that gap is a teaching point, not a bug.
 */
export function makeClass({ n = 40, seed = 7, noise = 6.5 } = {}) {
  const rand = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = +(rand() * 9.6 + 0.2).toFixed(2);
    const raw = TRUTH.intercept + TRUTH.slope * x + gauss(rand) * noise;
    pts.push({ name: NAMES[i % NAMES.length], x, y: +Math.max(4, Math.min(100, raw)).toFixed(1) });
  }
  return pts.sort((a, b) => a.x - b.x).map((p, i) => ({ ...p, id: i }));
}

/* ========================================================================= */

/**
 * A dataset plus every operation the lesson performs on it.
 * Holding `center` here keeps every caller honest about which parameter
 * space it is in.
 */
export class Problem {
  constructor(pts) {
    this.pts = pts;
    this.center = +(pts.reduce((s, p) => s + p.x, 0) / pts.length).toFixed(2);
  }

  /** score predicted for a student who revised `x` hours */
  predict(m, c, x) { return m * (x - this.center) + c; }

  /** Mean squared error — the "wrongness" number the lesson turns on. */
  mse(m, c) {
    let s = 0;
    for (const p of this.pts) {
      const e = this.predict(m, c, p.x) - p.y;
      s += e * e;
    }
    return s / this.pts.length;
  }

  /** Typical miss in score-points. Friendlier than MSE on a stat tile. */
  rmse(m, c) { return Math.sqrt(this.mse(m, c)); }

  /** Full-batch gradient of MSE, in centered space. */
  gradient(m, c) {
    let dm = 0, dc = 0;
    for (const p of this.pts) {
      const e = this.predict(m, c, p.x) - p.y;
      dm += 2 * e * (p.x - this.center);
      dc += 2 * e;
    }
    const n = this.pts.length;
    return { dm: dm / n, dc: dc / n };
  }

  /**
   * The exact best-fit line in closed form — the target descent walks toward.
   * Shown as a reference so students see the machine approximating something
   * that is, in this small case, already knowable.
   *
   * Solved in plain slope/intercept space and converted, so it stays exact
   * even though `center` is rounded for display.
   */
  bestFit() {
    const n = this.pts.length;
    const mx = this.pts.reduce((s, p) => s + p.x, 0) / n;
    const my = this.pts.reduce((s, p) => s + p.y, 0) / n;
    let num = 0, den = 0;
    for (const p of this.pts) {
      num += (p.x - mx) * (p.y - my);
      den += (p.x - mx) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    return { m: slope, c: slope * this.center + (my - slope * mx) };
  }

  /** The dumbest defensible model: predict the class average for everyone. */
  flat() {
    return { m: 0, c: this.pts.reduce((s, p) => s + p.y, 0) / this.pts.length };
  }

  /** Centered params -> the slope/intercept form students meet in maths class. */
  toPlain(m, c) {
    return { slope: m, intercept: c - m * this.center };
  }

  /**
   * MSE is a quadratic surface in (m, c), so it expands to
   *   m²·Sxx + c² + Syy + 2mc·Sx - 2m·Sxy - 2c·Sy
   * where the S terms are per-point averages that never change. Caching them
   * turns `mseAt` into O(1) instead of O(n), which is what makes painting a
   * loss value for every pixel of the map affordable.
   */
  get moments() {
    if (!this._mo) {
      const n = this.pts.length;
      let Sx = 0, Sxx = 0, Sy = 0, Syy = 0, Sxy = 0;
      for (const p of this.pts) {
        const dx = p.x - this.center;
        Sx += dx; Sxx += dx * dx; Sy += p.y; Syy += p.y * p.y; Sxy += dx * p.y;
      }
      this._mo = { Sx: Sx / n, Sxx: Sxx / n, Sy: Sy / n, Syy: Syy / n, Sxy: Sxy / n };
    }
    return this._mo;
  }

  /** Closed-form MSE. Identical to `mse`, but O(1). */
  mseAt(m, c) {
    const { Sx, Sxx, Sy, Syy, Sxy } = this.moments;
    return m * m * Sxx + c * c + Syy + 2 * m * c * Sx - 2 * m * Sxy - 2 * c * Sy;
  }

  get xs() { return this.pts.map((p) => p.x); }
  get ys() { return this.pts.map((p) => p.y); }
}

/* ========================================================================= */

/**
 * Stateful SGD trainer. Visits every student once per epoch in shuffled
 * order, one step at a time, so the view can pause between any two steps
 * and narrate what just happened.
 */
export class Trainer {
  /**
   * @param {number} lr     step size for the first epoch
   * @param {number} decay  the step shrinks by this factor each epoch. SGD
   *   looks at one student at a time, so it never truly settles — it orbits
   *   the answer in a noise ball whose radius scales with lr. Shrinking the
   *   step lets the line come to rest on the best fit instead of jittering
   *   around it, which is both the standard practice and the thing a learner
   *   needs to see. Set to 1 to watch the raw jitter.
   */
  constructor(problem, { lr = 0.008, epochs = 4, seed = 21, decay = 0.55, start = null } = {}) {
    this.p = problem;
    this.lr = lr;
    this.epochs = epochs;
    this.seed = seed;
    this.decay = decay;
    // Where the first guess sits. Defaults to the flat class average, but a
    // caller can start it somewhere plainly wrong so that both parameters
    // visibly have work to do.
    this.start = start;
    this.reset();
  }

  /** The step size actually in use right now. */
  get currentLr() { return this.lr * this.decay ** this.epoch; }

  reset() {
    const from = this.start ?? this.p.flat();
    this.m = from.m;
    this.c = from.c;
    this.epoch = 0;
    this.cursor = 0;
    this.steps = 0;
    this.rand = rng(this.seed);
    this.order = this._shuffled();
    this.last = null;
    this.history = [{ m: this.m, c: this.c, loss: this.p.mse(this.m, this.c), step: 0 }];
    return this;
  }

  _shuffled() {
    const o = this.p.pts.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(this.rand() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }

  get done() { return this.epoch >= this.epochs; }
  get totalSteps() { return this.epochs * this.p.pts.length; }

  /**
   * Advance exactly one student. Returns a record of what happened and why,
   * or null once training is complete.
   */
  step() {
    if (this.done) return null;

    if (this.cursor >= this.order.length) {
      this.epoch++;
      this.cursor = 0;
      this.order = this._shuffled();
      if (this.done) return null;
    }

    const point = this.p.pts[this.order[this.cursor++]];
    const from = { m: this.m, c: this.c };
    const guess = this.p.predict(this.m, this.c, point.x);
    const error = guess - point.y;                 // + means guessed too high
    const dx = point.x - this.p.center;
    const lr = this.currentLr;

    this.m -= lr * (2 * error * dx);
    this.c -= lr * (2 * error);
    this.steps++;

    const loss = this.p.mse(this.m, this.c);
    this.history.push({ m: this.m, c: this.c, loss, step: this.steps });
    this.last = {
      point, guess, error,
      from, to: { m: this.m, c: this.c },
      loss,
      tilted: this.m - from.m,
      lifted: this.c - from.c,
    };
    return this.last;
  }
}
