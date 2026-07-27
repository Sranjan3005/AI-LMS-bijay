/* Model tests. Run: node tests/logistic.test.mjs */

import assert from 'node:assert/strict';
import { makeCohort, Problem, Trainer, sigmoid, PASS_MARK } from '../src/ml/logistic.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nlogistic\n');

const pts = makeCohort();
const P = new Problem(pts);
const BEST = P.bestCurve();

/* --- data ---------------------------------------------------------------- */

test('cohort is the same forty students, relabelled', () => {
  assert.equal(pts.length, 40);
  for (const p of pts) {
    assert.ok(p.passed === 0 || p.passed === 1);
    assert.equal(p.passed, p.score >= PASS_MARK ? 1 : 0);
    assert.ok(p.name);
  }
});

test('both outcomes are well represented (the lesson needs overlap)', () => {
  const rate = P.passRate;
  assert.ok(rate > 0.35 && rate < 0.85, `pass rate ${rate.toFixed(2)} is too lopsided`);
});

test('the classes genuinely overlap, so no cutoff is perfect', () => {
  // This is the whole point of act 2 — if a cutoff could score 40/40 the
  // lesson's motivation for probabilities collapses.
  assert.ok(P.bestCutoff().n < pts.length, 'a hard cutoff got everything right');
  assert.ok(P.bestCutoff().n >= 30, 'a hard cutoff should still be clearly useful');
});

/* --- the curve ----------------------------------------------------------- */

test('sigmoid behaves', () => {
  assert.equal(sigmoid(0), 0.5);
  assert.ok(sigmoid(10) > 0.99);
  assert.ok(sigmoid(-10) < 0.01);
});

test('chance is 50% exactly at the tipping point', () => {
  assert.ok(Math.abs(P.chance(6, 1.5, 6) - 0.5) < 1e-12);
});

test('more hours never lowers the chance of passing', () => {
  let prev = -1;
  for (let x = 0; x <= 10; x += 0.25) {
    const c = P.chance(5, 1.2, x);
    assert.ok(c >= prev, `chance fell at x=${x}`);
    prev = c;
  }
});

test('sharpness controls how abrupt the turn is', () => {
  const gentle = P.chance(5, 0.4, 7) - P.chance(5, 0.4, 3);
  const sharp = P.chance(5, 3.0, 7) - P.chance(5, 3.0, 3);
  assert.ok(sharp > gentle, 'a sharper curve should separate 3h from 7h more');
});

test('surprise punishes confident mistakes hardest', () => {
  const one = [{ x: 8, passed: 0 }];
  const Q = new Problem(one);
  const unsure = Q.surprise(8, 0.01);      // ~50/50
  const confidentlyWrong = Q.surprise(2, 3);
  assert.ok(confidentlyWrong > unsure * 3, 'being sure and wrong should hurt much more');
});

test('surprise stays finite even when totally wrong', () => {
  assert.ok(Number.isFinite(P.surprise(0, 6)));
  assert.ok(Number.isFinite(P.surprise(10, 6)));
});

test('toPlain round-trips to the textbook form', () => {
  const { w, b } = P.toPlain(5.5, 1.3);
  for (const x of [0, 3, 5.5, 9]) {
    assert.ok(Math.abs(P.chance(5.5, 1.3, x) - sigmoid(w * x + b)) < 1e-12, `x=${x}`);
  }
});

/* --- the optimum --------------------------------------------------------- */

test('bestCurve beats every nearby curve', () => {
  const base = P.surprise(BEST.tip, BEST.sharp);
  for (const [dt, ds] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3], [0.2, 0.2]]) {
    assert.ok(P.surprise(BEST.tip + dt, BEST.sharp + ds) > base,
      `perturbation ${dt},${ds} was not worse`);
  }
});

test('bestCurve puts its tipping point inside the data', () => {
  assert.ok(BEST.tip > 1 && BEST.tip < 9, `tipping point ${BEST.tip}`);
  assert.ok(BEST.sharp > 0.1, `sharpness ${BEST.sharp} is flat`);
});

test('bestCurve is at least as accurate as the best hard cutoff', () => {
  assert.ok(P.correct(BEST.tip, BEST.sharp) >= P.bestCutoff().n - 1);
});

test('gradient points uphill', () => {
  const g = P.gradient(3, 0.8);
  const h = 1e-5;
  assert.ok(P.surprise(3 + g.dTip * h, 0.8 + g.dSharp * h) > P.surprise(3, 0.8));
  assert.ok(P.surprise(3 - g.dTip * h, 0.8 - g.dSharp * h) < P.surprise(3, 0.8));
});

test('gradient nearly vanishes at the optimum', () => {
  const g = P.gradient(BEST.tip, BEST.sharp);
  assert.ok(Math.hypot(g.dTip, g.dSharp) < 1e-3, `gradient ${JSON.stringify(g)}`);
});

/* --- the numbers the lesson depends on ----------------------------------- */

const LESSON = { lr: 0.3, epochs: 5, decay: 0.8, start: { tip: 2, sharp: 0.4 } };

test('trainer honours its start and survives reset', () => {
  const tr = new Trainer(P, LESSON);
  assert.deepEqual({ tip: tr.tip, sharp: tr.sharp }, LESSON.start);
  tr.step(); tr.step();
  tr.reset();
  assert.deepEqual({ tip: tr.tip, sharp: tr.sharp }, LESSON.start);
});

test('the shipped settings converge near the best curve', () => {
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  assert.ok(Number.isFinite(tr.tip) && Number.isFinite(tr.sharp), 'diverged');
  const gap = P.surprise(tr.tip, tr.sharp) - P.surprise(BEST.tip, BEST.sharp);
  assert.ok(gap < 0.05, `surprise ended ${gap.toFixed(3)} above the best possible`);
});

test('the shipped run visibly moves both knobs', () => {
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  const h = tr.history;
  const spanTip = Math.max(...h.map((s) => s.tip)) - Math.min(...h.map((s) => s.tip));
  const spanSharp = Math.max(...h.map((s) => s.sharp)) - Math.min(...h.map((s) => s.sharp));
  assert.ok(spanTip > 1, `tipping point barely moved (${spanTip.toFixed(2)})`);
  assert.ok(spanSharp > 0.3, `sharpness barely moved (${spanSharp.toFixed(2)})`);
});

test('the shipped run stays inside the chart window', () => {
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  for (const s of tr.history) {
    assert.ok(s.tip >= -1 && s.tip <= 11, `tipping point ${s.tip.toFixed(2)} left the chart`);
    assert.ok(s.sharp >= 0 && s.sharp <= 6, `sharpness ${s.sharp.toFixed(2)} left the chart`);
  }
});

test('most progress lands in the first epoch', () => {
  const from = P.surprise(LESSON.start.tip, LESSON.start.sharp);
  const to = P.surprise(BEST.tip, BEST.sharp);
  const tr = new Trainer(P, { ...LESSON, epochs: 1 });
  while (!tr.done) tr.step();
  const closed = (from - P.surprise(tr.tip, tr.sharp)) / (from - to);
  assert.ok(closed > 0.6, `first epoch closed only ${(closed * 100).toFixed(0)}%`);
});

test('surprise trends down', () => {
  const tr = new Trainer(P, LESSON);
  while (!tr.done) tr.step();
  const h = tr.history;
  const third = Math.floor(h.length / 3);
  const avg = (a) => a.reduce((s, r) => s + r.loss, 0) / a.length;
  assert.ok(avg(h.slice(0, third)) > avg(h.slice(-third)), 'no downward trend');
});

test('accuracy improves over training', () => {
  const tr = new Trainer(P, LESSON);
  const before = P.correct(tr.tip, tr.sharp);
  while (!tr.done) tr.step();
  assert.ok(P.correct(tr.tip, tr.sharp) > before, 'got no more students right');
});

test('one student per step, every epoch', () => {
  const tr = new Trainer(P, { ...LESSON, epochs: 3 });
  while (!tr.done) tr.step();
  assert.equal(tr.steps, pts.length * 3);
  assert.equal(tr.step(), null);
});

test('step() reports what it saw and how sure it was', () => {
  const tr = new Trainer(P, LESSON);
  const r = tr.step();
  assert.ok(r.point.name);
  assert.ok(r.said > 0 && r.said < 1);
  assert.ok(Math.abs(r.err - (r.said - r.point.passed)) < 1e-12);
});

console.log(`\n${pass} passing\n`);
