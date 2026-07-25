/* Model tests. Run: node tests/network.test.mjs */

import assert from 'node:assert/strict';
import { makeRings, Network, Trainer, split, ZONES } from '../src/ml/network.js';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nnetwork\n');

const data = makeRings();

/* --- data ---------------------------------------------------------------- */

test('rings data is deterministic and two-class', () => {
  assert.deepEqual(makeRings(), makeRings());
  const labels = new Set(data.map((p) => p.label));
  assert.deepEqual([...labels].sort(), [0, 1]);
  assert.equal(ZONES.length, 2);
});

test('inner points really are inside, outer really are outside', () => {
  for (const p of data) {
    const r = Math.hypot(p.x - 5, p.y - 5);
    if (p.label === 1) assert.ok(r < 2.6, `inner point at radius ${r.toFixed(2)}`);
    else assert.ok(r > 2.6, `outer point at radius ${r.toFixed(2)}`);
  }
});

test('no straight line can separate the rings (the whole point)', () => {
  // brute-force the best straight-line accuracy over many angles/offsets;
  // it must fall well short of perfect, or the lesson has no motivation.
  let bestLineAcc = 0;
  for (let a = 0; a < 60; a++) {
    const th = (a / 60) * Math.PI;
    const nx = Math.cos(th), ny = Math.sin(th);
    for (let off = -6; off <= 6; off += 0.4) {
      let correct = 0;
      for (const p of data) {
        const side = (nx * (p.x - 5) + ny * (p.y - 5) - off) >= 0 ? 1 : 0;
        if (side === p.label) correct++;
      }
      bestLineAcc = Math.max(bestLineAcc, correct / data.length);
    }
  }
  assert.ok(bestLineAcc < 0.8, `a straight line reached ${(bestLineAcc * 100).toFixed(0)}% — too easy`);
});

/* --- forward pass -------------------------------------------------------- */

test('forward returns a probability and H hidden activations', () => {
  const net = new Network(8);
  const { p, h } = net.forward(5, 5);
  assert.ok(p >= 0 && p <= 1);
  assert.equal(h.length, 8);
  for (const a of h) assert.ok(a >= -1 && a <= 1, 'tanh activation out of range');
});

test('weight init is deterministic per seed', () => {
  assert.deepEqual(new Network(6, 3).W1, new Network(6, 3).W1);
  assert.notDeepEqual(new Network(6, 3).W1, new Network(6, 4).W1);
});

/* --- training ------------------------------------------------------------ */

test('a single step reduces full-batch loss', () => {
  const net = new Network(8, 4);
  const before = net.loss(data);
  net.trainStep(data, 0.7);
  assert.ok(net.loss(data) < before, 'loss did not drop after a step');
});

test('backprop gradient matches a numerical gradient', () => {
  // finite-difference check on one output weight and one hidden weight
  const net = new Network(4, 2);
  const eps = 1e-4;

  // analytic gradient of full-batch loss wrt W2[0] and W1[0][0]
  const grad = () => {
    const H = net.H, gW2 = new Array(H).fill(0), gW1 = Array.from({ length: H }, () => [0, 0, 0]);
    for (const pt of data) {
      const { p, h, x, y } = net.forward(pt.x, pt.y);
      const dz = p - pt.label;
      for (let i = 0; i < H; i++) {
        gW2[i] += dz * h[i];
        const dh = dz * net.W2[i] * (1 - h[i] * h[i]);
        gW1[i][0] += dh * x; gW1[i][1] += dh * y; gW1[i][2] += dh;
      }
    }
    return { gW2: gW2.map((g) => g / data.length), gW1: gW1.map((g) => g.map((v) => v / data.length)) };
  };
  const g = grad();

  const numDeriv = (set) => {
    const l0 = net.loss(data); set(eps); const lp = net.loss(data); set(-eps);
    return (lp - l0) / eps;
  };
  const nd2 = numDeriv((d) => { net.W2[0] += d; });
  assert.ok(Math.abs(nd2 - g.gW2[0]) < 1e-3, `W2 grad ${g.gW2[0]} vs numeric ${nd2}`);
  const nd1 = numDeriv((d) => { net.W1[0][0] += d; });
  assert.ok(Math.abs(nd1 - g.gW1[0][0]) < 1e-3, `W1 grad ${g.gW1[0][0]} vs numeric ${nd1}`);
});

test('the network can actually learn the rings', () => {
  const tr = new Trainer(data, { H: 8, lr: 0.8, seed: 4 });
  for (let i = 0; i < 400; i++) tr.step();
  assert.ok(tr.accuracy > 0.9, `only reached ${(tr.accuracy * 100).toFixed(0)}% accuracy`);
});

test('loss falls steadily over training', () => {
  const tr = new Trainer(data, { H: 8, lr: 0.8, seed: 4 });
  for (let i = 0; i < 200; i++) tr.step();
  const h = tr.history;
  assert.ok(h.at(-1).loss < h[0].loss * 0.5, 'loss did not at least halve');
  // full-batch GD should be near-monotone; allow tiny wobble
  let rises = 0;
  for (let i = 1; i < h.length; i++) if (h[i].loss > h[i - 1].loss + 1e-9) rises++;
  assert.ok(rises < h.length * 0.1, `${rises} loss increases — not smooth enough`);
});

test('more hidden units fit at least as well (given enough steps)', () => {
  const small = new Trainer(data, { H: 2, lr: 0.8, seed: 4 });
  const big = new Trainer(data, { H: 10, lr: 0.8, seed: 4 });
  for (let i = 0; i < 500; i++) { small.step(); big.step(); }
  assert.ok(big.accuracy >= small.accuracy - 0.02, `big ${big.accuracy} vs small ${small.accuracy}`);
});

test('two units are not enough for a closed ring (underfitting is real)', () => {
  const tiny = new Trainer(data, { H: 2, lr: 0.8, seed: 4 });
  for (let i = 0; i < 600; i++) tiny.step();
  // a couple of straight cuts can't enclose the inner disc perfectly
  assert.ok(tiny.accuracy < 0.98, `2 units reached ${(tiny.accuracy * 100).toFixed(0)}% — expected some misses`);
});

test('rebuild changes architecture and resets cleanly', () => {
  const tr = new Trainer(data, { H: 4, lr: 0.8, seed: 4 });
  for (let i = 0; i < 20; i++) tr.step();
  tr.rebuild(9);
  assert.equal(tr.net.H, 9);
  assert.equal(tr.epoch, 0);
  assert.equal(tr.net.W2.length, 9);
});

test('reset reproduces the same trajectory', () => {
  const tr = new Trainer(data, { H: 6, lr: 0.8, seed: 4 });
  for (let i = 0; i < 30; i++) tr.step();
  const a = tr.loss;
  tr.reset();
  for (let i = 0; i < 30; i++) tr.step();
  assert.ok(Math.abs(tr.loss - a) < 1e-9, 'not reproducible');
});

test('hiddenLines returns one line per unit', () => {
  const net = new Network(7);
  assert.equal(net.hiddenLines().length, 7);
});

console.log(`\n${pass} passing\n`);
