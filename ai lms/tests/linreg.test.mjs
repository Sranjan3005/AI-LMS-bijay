/* Model tests. Run: node tests/linreg.test.mjs
   No framework — the model layer is pure, so plain asserts are enough. */

import assert from 'node:assert/strict';
import { makeClass, Problem, Trainer, TRUTH } from '../src/ml/linreg.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nlinreg\n');

const pts = makeClass();
const P = new Problem(pts);

/* --- dataset ------------------------------------------------------------- */

test('dataset is deterministic for a seed', () => {
  assert.deepEqual(makeClass({ seed: 7 }), makeClass({ seed: 7 }));
  assert.notDeepEqual(makeClass({ seed: 7 }), makeClass({ seed: 8 }));
});

test('dataset stays inside believable exam bounds', () => {
  assert.equal(pts.length, 40);
  for (const p of pts) {
    assert.ok(p.x >= 0 && p.x <= 10, `x out of range: ${p.x}`);
    assert.ok(p.y >= 0 && p.y <= 100, `y out of range: ${p.y}`);
    assert.ok(p.name, 'every student is named');
  }
});

test('dataset is sorted by hours', () => {
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].x >= pts[i - 1].x);
});

test('center sits inside the data', () => {
  assert.ok(P.center > 3 && P.center < 7, `center=${P.center}`);
});

/* --- scoring ------------------------------------------------------------- */

test('predict is a line through (center, level)', () => {
  assert.equal(P.predict(3, 50, P.center), 50);
  assert.ok(Math.abs(P.predict(3, 50, P.center + 2) - 56) < 1e-9);
});

test('toPlain round-trips to the same predictions', () => {
  const { slope, intercept } = P.toPlain(4.2, 61);
  for (const x of [0, 2.5, 5, 9.9]) {
    assert.ok(Math.abs(P.predict(4.2, 61, x) - (slope * x + intercept)) < 1e-9, `x=${x}`);
  }
});

test('bestFit recovers something close to the hidden truth', () => {
  const { m, c } = P.bestFit();
  const plain = P.toPlain(m, c);
  assert.ok(Math.abs(plain.slope - TRUTH.slope) < 1.0, `slope ${plain.slope} vs ${TRUTH.slope}`);
  assert.ok(Math.abs(plain.intercept - TRUTH.intercept) < 8, `intercept ${plain.intercept} vs ${TRUTH.intercept}`);
});

test('bestFit beats every nearby line (it is a true minimum)', () => {
  const { m, c } = P.bestFit();
  const base = P.mse(m, c);
  for (const [dm, dc] of [[0.1, 0], [-0.1, 0], [0, 1], [0, -1], [0.05, 0.5], [-0.05, -0.5]]) {
    assert.ok(P.mse(m + dm, c + dc) > base, `perturbation ${dm},${dc} was not worse`);
  }
});

test('flat baseline is the mean, and is worse than the best fit', () => {
  const flat = P.flat();
  const mean = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  assert.ok(Math.abs(flat.c - mean) < 1e-9);
  const best = P.bestFit();
  assert.ok(P.mse(flat.m, flat.c) > P.mse(best.m, best.c));
});

test('closed-form mseAt matches the loop version everywhere', () => {
  for (let m = -2; m <= 12; m += 0.7) {
    for (let c = 20; c <= 100; c += 4.3) {
      const a = P.mse(m, c), b = P.mseAt(m, c);
      assert.ok(Math.abs(a - b) < 1e-8 * Math.max(1, a), `m=${m} c=${c}: ${a} vs ${b}`);
    }
  }
});

test('gradient vanishes at the optimum', () => {
  const { m, c } = P.bestFit();
  const g = P.gradient(m, c);
  assert.ok(Math.abs(g.dm) < 1e-6, `dm=${g.dm}`);
  assert.ok(Math.abs(g.dc) < 1e-6, `dc=${g.dc}`);
});

test('gradient points uphill', () => {
  const g = P.gradient(1, 50);
  const h = 1e-4;
  assert.ok(P.mse(1 + g.dm * h, 50 + g.dc * h) > P.mse(1, 50));
  assert.ok(P.mse(1 - g.dm * h, 50 - g.dc * h) < P.mse(1, 50));
});

/* --- the numbers the lesson actually depends on -------------------------- */

test('trainer defaults to starting flat at the class average', () => {
  const tr = new Trainer(P);
  assert.equal(tr.m, 0);
  assert.ok(Math.abs(tr.c - P.flat().c) < 1e-9);
});

test('an explicit start is honoured, and survives reset', () => {
  const tr = new Trainer(P, { start: { m: 0, c: 50 } });
  assert.deepEqual({ m: tr.m, c: tr.c }, { m: 0, c: 50 });
  tr.step(); tr.step();
  tr.reset();
  assert.deepEqual({ m: tr.m, c: tr.c }, { m: 0, c: 50 });
});

/* The exact settings the lesson ships with. If you change these in
   lessons/linear-regression.js, change them here — these three tests are the
   reason the demo lands on the answer instead of near it. */
const LESSON = { lr: 0.012, epochs: 5, decay: 0.85, start: { m: 0, c: 50 } };

test('the shipped settings land on the best fit', () => {
  const best = P.bestFit();
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  assert.ok(Math.abs(tr.m - best.m) < 0.35, `tilt landed at ${tr.m}, best is ${best.m}`);
  assert.ok(Math.abs(tr.c - best.c) < 1.5, `level landed at ${tr.c}, best is ${best.c}`);
  assert.ok(P.rmse(tr.m, tr.c) - P.rmse(best.m, best.c) < 0.1, 'not close enough to the optimum');
});

test('the shipped path moves in both directions, not just one', () => {
  // If height starts already-optimal the descent draws a straight horizontal
  // line across act 5's map, which teaches nothing about searching a surface.
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  const h = tr.history;
  const spanM = Math.max(...h.map((s) => s.m)) - Math.min(...h.map((s) => s.m));
  const spanC = Math.max(...h.map((s) => s.c)) - Math.min(...h.map((s) => s.c));
  assert.ok(spanM > 3, `tilt barely moved (${spanM.toFixed(2)})`);
  assert.ok(spanC > 12, `height barely moved (${spanC.toFixed(2)}) — the map would show a flat line`);
});

test('the shipped path stays inside the map window', () => {
  // Act 5 plots tilt over [-2,12] and height over [20,100]; a path that
  // wanders outside gets silently clipped and looks broken.
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  for (const s of tr.history) {
    assert.ok(s.m >= -2 && s.m <= 12, `tilt ${s.m.toFixed(2)} left the map`);
    assert.ok(s.c >= 20 && s.c <= 100, `height ${s.c.toFixed(2)} left the map`);
  }
});

test('default settings land essentially on the best fit', () => {
  const best = P.bestFit();
  const tr = new Trainer(P, { lr: 0.008, epochs: 4 });
  while (!tr.done) tr.step();

  assert.ok(Number.isFinite(tr.m) && Number.isFinite(tr.c), 'diverged to NaN/Infinity');
  assert.ok(Math.abs(tr.m - best.m) < 0.35, `tilt landed at ${tr.m}, best is ${best.m}`);
  assert.ok(Math.abs(tr.c - best.c) < 1.5, `level landed at ${tr.c}, best is ${best.c}`);

  const gap = P.rmse(tr.m, tr.c) - P.rmse(best.m, best.c);
  assert.ok(gap < 0.25, `typical miss is ${gap.toFixed(3)} worse than optimal`);
});

test('every step size the slider offers is stable and helps', () => {
  const startErr = P.rmse(0, 50);
  // the slider runs 0.004 to 0.020 in steps of 0.002
  for (let lr = 0.004; lr <= 0.0201; lr += 0.002) {
    const tr = new Trainer(P, { ...LESSON, lr: +lr.toFixed(3) });
    while (!tr.done) tr.step();
    assert.ok(Number.isFinite(tr.m) && Number.isFinite(tr.c), `lr=${lr} diverged`);
    assert.ok(P.rmse(tr.m, tr.c) < startErr, `lr=${lr.toFixed(3)} did not improve on the starting guess`);
  }
});

test('most of the progress happens in the first epoch (the demo reads fast)', () => {
  // A learner watching act 4 should see obvious improvement in the first
  // pass, not a flat line that only pays off after four minutes.
  const best = P.bestFit();
  const from = P.rmse(0, 50);
  const to = P.rmse(best.m, best.c);
  const tr = new Trainer(P, { ...LESSON, epochs: 1 });
  while (!tr.done) tr.step();
  const closed = (from - P.rmse(tr.m, tr.c)) / (from - to);
  assert.ok(closed > 0.6, `first epoch only closed ${(closed * 100).toFixed(0)}% of the gap`);
});

test('loss trends down over training', () => {
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  const h = tr.history;
  assert.ok(h.at(-1).loss < h[0].loss * 0.5, 'loss did not at least halve');
  const third = Math.floor(h.length / 3);
  const avg = (a) => a.reduce((s, r) => s + r.loss, 0) / a.length;
  assert.ok(avg(h.slice(0, third)) > avg(h.slice(-third)), 'no downward trend');
});

test('trainer visits each student once per epoch', () => {
  const tr = new Trainer(P, { ...LESSON, epochs: 3 });
  while (!tr.done) tr.step();
  assert.equal(tr.steps, pts.length * 3);
});

test('step() reports the reason for its nudge', () => {
  const tr = new Trainer(P, { ...LESSON, epochs: 1 });
  const r = tr.step();
  assert.ok(r.point && r.point.name);
  assert.ok(Math.abs(r.error - (r.guess - r.point.y)) < 1e-9);
  if (r.error < 0) assert.ok(r.lifted > 0, 'under-guess should lift the line');
  else assert.ok(r.lifted < 0, 'over-guess should drop the line');
});

test('reset() is total — a second run reproduces the first exactly', () => {
  const tr = new Trainer(P, { ...LESSON, epochs: 2 });
  while (!tr.done) tr.step();
  const first = { m: tr.m, c: tr.c, n: tr.steps };
  tr.reset();
  while (!tr.done) tr.step();
  assert.deepEqual({ m: tr.m, c: tr.c, n: tr.steps }, first);
});

test('step() returns null once done', () => {
  const tr = new Trainer(P, { ...LESSON, epochs: 1 });
  while (!tr.done) tr.step();
  assert.equal(tr.step(), null);
});

console.log(`\n${pass} passing\n`);
