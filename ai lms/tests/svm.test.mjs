/* Model tests. Run: node tests/svm.test.mjs */

import assert from 'node:assert/strict';
import {
  makeField, signedDist, streetAt, widthAt, bestLine, supportVectors, correct, split, CROPS,
} from '../src/ml/svm.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nsvm\n');

const field = makeField();
const BEST = bestLine(field);

/* --- data ---------------------------------------------------------------- */

test('field is deterministic, two-class, ±1 labelled', () => {
  assert.deepEqual(makeField(), makeField());
  for (const p of field) assert.ok(p.y2 === 1 || p.y2 === -1);
  assert.equal(CROPS.length, 2);
});

test('both crops are well represented', () => {
  const plus = field.filter((p) => p.y2 === 1).length;
  assert.ok(plus > field.length * 0.35 && plus < field.length * 0.65);
});

/* --- streets ------------------------------------------------------------- */

test('streetAt places the line exactly between the groups', () => {
  const s = streetAt(field, BEST.theta);
  // the nearest point of each class should be equidistant from the centre
  const lo = field.find((p) => p.id === s.loId);
  const hi = field.find((p) => p.id === s.hiId);
  assert.ok(Math.abs(Math.abs(signedDist(s, lo)) - Math.abs(signedDist(s, hi))) < 1e-9);
});

test('a separating angle classifies every point correctly', () => {
  assert.ok(BEST.separates);
  assert.equal(correct(BEST, field), field.length, 'best line misclassified something');
});

test('width is zero at an angle that cannot separate', () => {
  // sweep and confirm at least one angle fails (the classes are a blob pair,
  // so some orientations mix them)
  let sawZero = false;
  for (let i = 0; i < 180; i++) if (widthAt(field, (i / 180) * Math.PI) === 0) sawZero = true;
  assert.ok(sawZero, 'expected some orientations to fail to separate');
});

/* --- the max-margin line ------------------------------------------------- */

test('bestLine is the widest street over all angles', () => {
  for (let i = 0; i < 360; i++) {
    const th = (i / 360) * Math.PI;
    assert.ok(widthAt(field, th) <= BEST.margin + 1e-9, `angle ${th} was wider than best`);
  }
});

test('the street is genuinely wide (clean gap)', () => {
  assert.ok(BEST.margin > 0.6, `half-width ${BEST.margin} is too thin`);
});

test('tilting the best line away narrows the street', () => {
  assert.ok(widthAt(field, BEST.theta + 0.15) < BEST.margin);
  assert.ok(widthAt(field, BEST.theta - 0.15) < BEST.margin);
});

/* --- support vectors ----------------------------------------------------- */

test('exactly the closest points are support vectors, and there are few', () => {
  const sv = supportVectors(BEST, field);
  assert.ok(sv.length >= 2 && sv.length <= 4, `${sv.length} support vectors`);
  assert.ok(sv.length < field.length * 0.3, 'too many points matter');
});

test('support vectors sit on the street edges (equidistant, minimal)', () => {
  const sv = supportVectors(BEST, field);
  const ds = sv.map((p) => Math.abs(signedDist(BEST, p)));
  for (const d of ds) assert.ok(Math.abs(d - BEST.margin) < 0.12, `SV at distance ${d}, margin ${BEST.margin}`);
});

test('the reported support-vector ids are among the closest points', () => {
  const sv = new Set(supportVectors(BEST, field).map((p) => p.id));
  assert.ok(sv.has(BEST.loId) && sv.has(BEST.hiId), 'loId/hiId should be support vectors');
});

/* --- the property that defines SVM --------------------------------------- */

test('moving a non-support point does NOT change the best line', () => {
  const sv = new Set(supportVectors(BEST, field).map((p) => p.id));
  const victim = field.find((p) => !sv.has(p.id) && p.y2 === 1);
  // shove it deeper into its own side (away from the street)
  const moved = field.map((p) => (p.id === victim.id ? { ...p, x: p.x + 1.2, y: p.y + 1.2 } : p));
  const b2 = bestLine(moved);
  assert.ok(Math.abs(b2.margin - BEST.margin) < 1e-6, 'margin changed');
  assert.ok(Math.abs(b2.theta - BEST.theta) < 1e-6, 'angle changed');
});

test('moving a support vector DOES change the best line', () => {
  const sv = supportVectors(BEST, field);
  const target = sv[0];
  // pull it toward the other class, into the street
  const moved = field.map((p) => (p.id === target.id ? { ...p, x: 5, y: 5 } : p));
  const b2 = bestLine(moved);
  assert.ok(b2.margin < BEST.margin - 0.05, 'margin should shrink when a support vector intrudes');
});

test('split gives train and test partitions', () => {
  const { train, test } = split(field);
  assert.ok(train.length > 0 && test.length > 0);
  assert.equal(train.length + test.length, field.length);
});

console.log(`\n${pass} passing\n`);
