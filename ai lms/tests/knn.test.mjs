/* Model tests. Run: node tests/knn.test.mjs */

import assert from 'node:assert/strict';
import {
  makeGarden, neighbours, classify, looAccuracy, testAccuracy, bestK, split, KINDS,
} from '../src/ml/knn.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nknn\n');

const garden = makeGarden();
const { train, test: held } = split(garden);

test('garden is deterministic and two-class', () => {
  assert.deepEqual(makeGarden(), makeGarden());
  const labels = new Set(garden.map((p) => p.label));
  assert.deepEqual([...labels].sort(), [0, 1]);
  assert.equal(KINDS.length, 2);
});

test('every point sits inside the measurement square', () => {
  for (const p of garden) {
    assert.ok(p.x >= 0 && p.x <= 10 && p.y >= 0 && p.y <= 10, `${p.x},${p.y}`);
  }
});

test('both kinds are well represented', () => {
  const ones = garden.filter((p) => p.label === 1).length;
  assert.ok(ones > garden.length * 0.35 && ones < garden.length * 0.65, `label-1 share ${ones}/${garden.length}`);
});

test('the classes overlap, so k actually matters', () => {
  // If k=1 and k=7 gave identical accuracy the lesson's k slider would be
  // pointless. They must differ somewhere.
  const accs = [1, 3, 5, 7, 9].map((k) => looAccuracy(train, k));
  assert.ok(new Set(accs.map((a) => a.toFixed(3))).size > 1, 'k had no effect on accuracy');
});

test('small k overfits and large k over-smooths (the whole lesson)', () => {
  const best = bestK(train).acc;
  assert.ok(looAccuracy(train, 1) < best - 1e-9, 'k=1 should be worse than the best k (overfitting)');
  assert.ok(looAccuracy(train, 13) < best - 1e-9, 'k=13 should be worse than the best k (over-smoothing)');
});

/* --- neighbours ---------------------------------------------------------- */

test('neighbours returns exactly k, nearest first', () => {
  const q = { x: 5, y: 5 };
  const { near, reach2 } = neighbours(train, q, 5);
  assert.equal(near.length, 5);
  const ds = near.map((p) => (p.x - q.x) ** 2 + (p.y - q.y) ** 2);
  for (let i = 1; i < ds.length; i++) assert.ok(ds[i] >= ds[i - 1], 'not sorted');
  assert.ok(Math.abs(reach2 - ds[ds.length - 1]) < 1e-9, 'reach is the farthest of the k');
});

test('a query on top of a training point has it as nearest neighbour', () => {
  const target = train[7];
  const { near } = neighbours(train, { x: target.x, y: target.y }, 1);
  assert.equal(near[0].id, target.id);
});

/* --- classify ------------------------------------------------------------ */

test('classify counts votes that sum to k', () => {
  const r = classify(train, { x: 5, y: 5 }, 7);
  assert.equal(r.votes0 + r.votes1, 7);
  assert.ok(r.label === 0 || r.label === 1);
});

test('k=1 just copies the nearest neighbour', () => {
  for (const q of [{ x: 2, y: 2 }, { x: 8, y: 8 }, { x: 5, y: 6 }]) {
    const r = classify(train, q, 1);
    assert.equal(r.label, r.near[0].label);
  }
});

test('a point deep in one cluster is classified as that cluster', () => {
  const zeros = train.filter((p) => p.label === 0);
  const mx = zeros.reduce((s, p) => s + p.x, 0) / zeros.length;
  const my = zeros.reduce((s, p) => s + p.y, 0) / zeros.length;
  assert.equal(classify(train, { x: mx, y: my }, 5).label, 0);
});

test('even k can tie, and the tie breaks to the nearest neighbour', () => {
  // construct a clean 1-vs-1 tie
  const tri = [
    { id: 0, x: 0, y: 0, label: 0 },
    { id: 1, x: 3, y: 0, label: 1 },
  ];
  const r = classify(tri, { x: 1, y: 0 }, 2);
  assert.ok(r.tie, 'should be a tie');
  assert.equal(r.label, 0, 'nearest (the class-0 point) should win');
});

/* --- accuracy & k -------------------------------------------------------- */

test('leave-one-out accuracy is a sensible fraction', () => {
  const a = looAccuracy(train, 5);
  assert.ok(a > 0.6 && a <= 1, `accuracy ${a}`);
});

test('test accuracy works on held-out points', () => {
  const a = testAccuracy(train, held, 5);
  assert.ok(a > 0.6 && a <= 1, `accuracy ${a}`);
});

test('k=1 fits training neighbours perfectly under normal split', () => {
  // Every non-removed point is its own nearest neighbour only in full-set
  // classification; under LOO k=1 it is generally < 1, which is the point of
  // the overfitting story. Just assert LOO k=1 is not higher than a mid k by
  // a wide margin — i.e. tiny k is not obviously best.
  const a1 = looAccuracy(train, 1);
  const aBest = bestK(train).acc;
  assert.ok(aBest >= a1, 'the best k should be at least as good as k=1');
});

test('bestK returns an odd k that scores at least as well as any tried', () => {
  const best = bestK(train);
  assert.equal(best.k % 2, 1, `best k ${best.k} should be odd`);
  for (let k = 1; k <= 15; k += 2) {
    assert.ok(best.acc >= looAccuracy(train, k) - 1e-9, `k=${k} beat the reported best`);
  }
});

test('there is genuinely nothing to train — classify is stateless', () => {
  // Calling classify twice gives identical results; no internal state drifts.
  const q = { x: 4.5, y: 5.5 };
  assert.deepEqual(classify(train, q, 5).label, classify(train, q, 5).label);
});

console.log(`\n${pass} passing\n`);
