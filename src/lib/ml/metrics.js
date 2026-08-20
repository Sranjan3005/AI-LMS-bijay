/**
 * metrics.js -- split, score, confuse. No model code, no tf dependency, so all
 * of it is unit-testable in plain Node.
 *
 * The split is *deterministic and stratified*. Deterministic because a student
 * retraining the same configuration and getting a different number would learn
 * the wrong lesson about what caused the change; stratified because with 10
 * images per class a random split will happily hand you a test set missing a
 * class entirely.
 */

/** Small, fast, seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled(items, seed = 12345) {
  const out = items.slice();
  const rand = rng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Stratified, deterministic train/test split over item indices.
 *
 * @param {number[]} labels     label index per item
 * @param {number} classes
 * @param {number} testFraction
 * @param {number} seed
 * @returns {{train:number[], test:number[]}}
 */
export function stratifiedSplit(labels, classes, testFraction = 0.2, seed = 20260806) {
  const byClass = Array.from({ length: classes }, () => []);
  labels.forEach((y, i) => { if (byClass[y]) byClass[y].push(i); });

  const train = [];
  const test = [];
  byClass.forEach((idx, c) => {
    const order = shuffled(idx, seed + c * 7919);
    // At least one test item per class where the class has 2+, so no class can
    // silently vanish from the evaluation.
    const nTest = order.length < 2 ? 0 : Math.max(1, Math.round(order.length * testFraction));
    test.push(...order.slice(0, nTest));
    train.push(...order.slice(nTest));
  });
  return { train: shuffled(train, seed), test: shuffled(test, seed + 1) };
}

/** Take the first `n` items per class, deterministically. Powers the data slider. */
export function subsamplePerClass(labels, classes, perClass, seed = 20260806) {
  const byClass = Array.from({ length: classes }, () => []);
  labels.forEach((y, i) => { if (byClass[y]) byClass[y].push(i); });
  const out = [];
  byClass.forEach((idx, c) => {
    out.push(...shuffled(idx, seed + c * 7919).slice(0, perClass));
  });
  return shuffled(out, seed + 2);
}

export function argmax(row) {
  let best = 0;
  for (let i = 1; i < row.length; i++) if (row[i] > row[best]) best = i;
  return best;
}

export function accuracy(predicted, actual) {
  if (!predicted.length) return 0;
  let hits = 0;
  for (let i = 0; i < predicted.length; i++) if (predicted[i] === actual[i]) hits++;
  return hits / predicted.length;
}

/** confusion[trueClass][predictedClass] */
export function confusionMatrix(predicted, actual, classes) {
  const m = Array.from({ length: classes }, () => new Array(classes).fill(0));
  for (let i = 0; i < predicted.length; i++) {
    if (m[actual[i]]) m[actual[i]][predicted[i]] += 1;
  }
  return m;
}

export function perClassAccuracy(matrix) {
  return matrix.map((row, i) => {
    const total = row.reduce((a, b) => a + b, 0);
    return total ? row[i] / total : 0;
  });
}

/**
 * Resolve one training run's split, in both source-image and embedding-row terms.
 *
 * THIS IS THE LEAKAGE-CRITICAL FUNCTION IN THE MODULE. It lives here, pure and
 * tested, rather than inline in TrainPanel, because two separate mistakes are
 * possible and neither one throws:
 *
 *   1. An augmented copy of a test photo lands in the training set. "Accuracy on
 *      images it never saw" then measures memorisation, and Lab B shows
 *      augmentation working brilliantly every single time.
 *   2. The same source photo appears twice in the test set (once per variant),
 *      quietly weighting it and skewing the score.
 *
 * Both are prevented here: the split is decided over *source images*, and only
 * variant 0 -- the untransformed original -- is ever admitted to the test set,
 * exactly once.
 *
 * @param {object} args
 * @param {number[]} args.sourceLabels  label index per source image
 * @param {number}   args.classes
 * @param {number[]} args.sourceIndex   per embedding row, which source it came from
 * @param {number|null} [args.perClass] data-volume cap, or null for everything
 * @returns {{usedSources:number[], trainSources:number[], testSources:number[],
 *            keep:number[], holdOut:number[]}}
 */
export function resolveTrainingSplit({
  sourceLabels, classes, sourceIndex, perClass = null,
}) {
  const used = perClass
    ? new Set(subsamplePerClass(sourceLabels, classes, perClass))
    : new Set(sourceLabels.map((_, i) => i));

  const usedList = [...used].sort((a, b) => a - b);
  const localLabels = usedList.map((i) => sourceLabels[i]);
  const { test: localTest } = stratifiedSplit(localLabels, classes);
  const testSet = new Set(localTest.map((li) => usedList[li]));

  const keep = [];
  const holdOut = [];
  const seenTestSource = new Set();

  sourceIndex.forEach((src, row) => {
    if (!used.has(src)) return;
    if (testSet.has(src)) {
      if (seenTestSource.has(src)) return; // one row per held-out photo, original only
      seenTestSource.add(src);
      holdOut.push(keep.length);
    }
    keep.push(row);
  });

  return {
    usedSources: usedList,
    trainSources: usedList.filter((i) => !testSet.has(i)),
    testSources: [...testSet].sort((a, b) => a - b),
    keep,
    holdOut,
  };
}

export function countsByLabel(labels, labelNames) {
  const out = {};
  labelNames.forEach((n) => { out[n] = 0; });
  labels.forEach((y) => {
    const n = labelNames[y];
    if (n !== undefined) out[n] += 1;
  });
  return out;
}
