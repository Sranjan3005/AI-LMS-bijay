/* =========================================================================
   k-Nearest-Neighbours — pure model code. No DOM, no globals.

   The point of this lesson is what k-NN does NOT have: no line, no weights,
   no tipping point, no training loop, nothing that descends a valley. It
   keeps every example and answers a new question by asking the closest ones
   to vote. So this module has no Trainer and no gradient — that absence is
   the lesson, and the code is meant to make it obvious.
   ========================================================================= */

import { blobs, dist2, split } from './points2d.js';

export { blobs, split };

/**
 * A garden of two flower kinds, measured by petal width (x) and petal
 * length (y). Two overlapping clusters so neighbours sometimes disagree —
 * which is where an even k gets to bite.
 */
export function makeGarden(opts = {}) {
  // gap/spread tuned (tests/knn.test.mjs pins the effect) so k has teeth:
  // k=1 overfits the stragglers, mid k is best, large k over-smooths.
  return blobs({ n: 44, seed: 3, gap: 3.0, spread: 1.4, ...opts });
}

export const KINDS = ['Sunmoss', 'Dewbell'];

/**
 * The k nearest training points to a query, already sorted nearest-first.
 * Returns the neighbours plus their squared distances so a view can draw the
 * reach circle without recomputing anything.
 */
export function neighbours(train, q, k) {
  const scored = train.map((p) => ({ p, d2: dist2(p, q) }));
  scored.sort((a, b) => a.d2 - b.d2);
  const near = scored.slice(0, k);
  return {
    near: near.map((s) => s.p),
    reach2: near.length ? near[near.length - 1].d2 : 0,
  };
}

/**
 * Classify a query by majority vote of its k nearest neighbours.
 * Ties (possible when k is even) are broken toward the single closest
 * neighbour — the honest, explainable rule, and a reason to prefer odd k.
 */
export function classify(train, q, k) {
  const { near, reach2 } = neighbours(train, q, k);
  let votes0 = 0, votes1 = 0;
  for (const p of near) (p.label === 0 ? votes0++ : votes1++);
  let label;
  if (votes0 === votes1) label = near[0].label;          // tie → nearest wins
  else label = votes0 > votes1 ? 0 : 1;
  return { label, votes0, votes1, near, reach2, tie: votes0 === votes1 };
}

/** Leave-one-out accuracy over the training set for a given k. */
export function looAccuracy(train, k) {
  let correct = 0;
  for (let i = 0; i < train.length; i++) {
    const q = train[i];
    const rest = train.slice(0, i).concat(train.slice(i + 1));
    if (classify(rest, q, k).label === q.label) correct++;
  }
  return correct / train.length;
}

/** Accuracy on a held-out test set. */
export function testAccuracy(train, test, k) {
  let correct = 0;
  for (const q of test) if (classify(train, q, k).label === q.label) correct++;
  return correct / test.length;
}

/**
 * The k that scores best by leave-one-out, searched over odd values only
 * (odd k can never tie on a two-class problem). Ties in score break toward
 * the smaller k — a simpler model for the same accuracy.
 */
export function bestK(train, { maxK = 15 } = {}) {
  let best = { k: 1, acc: -1 };
  for (let k = 1; k <= Math.min(maxK, train.length - 1); k += 2) {
    const acc = looAccuracy(train, k);
    if (acc > best.acc + 1e-9) best = { k, acc };
  }
  return best;
}
