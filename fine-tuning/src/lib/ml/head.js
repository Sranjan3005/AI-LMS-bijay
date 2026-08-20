/**
 * head.js -- fine-tuning, the part that runs live.
 *
 * The backbone stays frozen; we fit a small classifier on top of the 2048-d
 * embeddings its convolutions produce. That is genuine gradient descent -- softmax +
 * categorical cross-entropy, mini-batch Adam, a loss curve that is measured and
 * an accuracy computed on images the model never saw.
 *
 * It is also *fast*, which is why the whole module can be interactive: the
 * expensive part (the forward pass through the CNN) happens once per image
 * and is cached, so re-training on the same photos with different settings
 * costs a second rather than a minute.
 *
 * Nothing in here fabricates a number. If a run is not finished, there is no
 * result object.
 */

import { loadTf, backendName } from './tf.js';
import {
  stratifiedSplit, argmax, accuracy, confusionMatrix, countsByLabel,
} from './metrics.js';

export const HEADS = [
  {
    id: 'linear',
    label: 'Linear head',
    blurb: 'One weight per feature per class. The simplest thing that can learn.',
    teaches: 'The honest baseline. On good features this is often already enough, '
           + 'and it is the version you can actually explain.',
    paramCount: (f, c) => f * c + c,
    hyperparams: { epochs: 30, batchSize: 32, learningRate: 0.01 },
    build: (tf, { featureLength, classes }) => tf.sequential({
      layers: [tf.layers.dense({
        inputShape: [featureLength],
        units: classes,
        activation: 'softmax',
        kernelInitializer: 'zeros',
      })],
    }),
  },
  {
    id: 'mlp',
    label: 'Small head',
    blurb: '2,048 features into 64 hidden units into your classes.',
    teaches: 'A hidden layer lets it combine features instead of judging each one '
           + 'alone -- more room to learn, and more room to memorise.',
    paramCount: (f, c) => f * 64 + 64 + 64 * c + c,
    hyperparams: {
      epochs: 30, batchSize: 32, learningRate: 0.005, hidden: 64,
    },
    build: (tf, { featureLength, classes, hyperparams }) => tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [featureLength],
          units: hyperparams.hidden,
          activation: 'relu',
          kernelInitializer: 'heNormal',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: classes, activation: 'softmax' }),
      ],
    }),
  },
];

export const getHead = (id) => HEADS.find((h) => h.id === id) || HEADS[0];

/**
 * Fit a head on cached embeddings.
 *
 * @param {object} args
 * @param {Float32Array[]} args.embeddings   one per (possibly augmented) image
 * @param {number[]}       args.labels       label index per embedding
 * @param {string[]}       args.labelNames
 * @param {string}         args.datasetId
 * @param {string}        [args.headId]
 * @param {number}        [args.realCount]   images before augmentation
 * @param {object}        [args.augmentation]
 * @param {number[]}      [args.holdOut]     indices forced into the test set
 *                                           (used so augmented copies of a test
 *                                           image never leak into training)
 * @param {Function}      [args.onEpoch]     ({epoch, loss, accuracy, total})
 * @param {AbortSignal}   [args.signal]
 * @returns {Promise<object>} a run, shaped for diagnose.js
 */
export async function trainHead({
  embeddings,
  labels,
  labelNames,
  datasetId,
  headId = 'linear',
  realCount = null,
  augmentation = null,
  holdOut = null,
  onEpoch,
  signal,
}) {
  if (!embeddings?.length) throw new Error('No embeddings to train on.');
  if (embeddings.length !== labels.length) {
    throw new Error('Embeddings and labels are different lengths.');
  }

  const tf = await loadTf();
  const spec = getHead(headId);
  const featureLength = embeddings[0].length;
  const classes = labelNames.length;

  // -- split ---------------------------------------------------------------
  let trainIdx;
  let testIdx;
  if (holdOut?.length) {
    const held = new Set(holdOut);
    testIdx = holdOut.slice();
    trainIdx = embeddings.map((_, i) => i).filter((i) => !held.has(i));
  } else {
    ({ train: trainIdx, test: testIdx } = stratifiedSplit(labels, classes));
  }
  if (!trainIdx.length) throw new Error('Nothing left to train on after the split.');

  const take = (idx) => {
    const x = new Float32Array(idx.length * featureLength);
    idx.forEach((src, i) => x.set(embeddings[src], i * featureLength));
    return x;
  };

  const xTrain = tf.tensor2d(take(trainIdx), [trainIdx.length, featureLength]);
  const yTrain = tf.oneHot(tf.tensor1d(trainIdx.map((i) => labels[i]), 'int32'), classes);

  const model = spec.build(tf, {
    featureLength, classes, hyperparams: spec.hyperparams,
  });
  model.compile({
    optimizer: tf.train.adam(spec.hyperparams.learningRate),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  const curve = [];
  const startedAt = performance.now();
  let cancelled = false;
  signal?.addEventListener('abort', () => { cancelled = true; model.stopTraining = true; });

  await model.fit(xTrain, yTrain, {
    epochs: spec.hyperparams.epochs,
    batchSize: Math.min(spec.hyperparams.batchSize, trainIdx.length),
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const point = {
          epoch: epoch + 1,
          loss: logs.loss,
          accuracy: logs.acc ?? logs.accuracy ?? 0,
        };
        curve.push(point);
        onEpoch?.({ ...point, total: spec.hyperparams.epochs });
        await tf.nextFrame(); // let the curve paint
      },
    },
  });

  if (cancelled) {
    tf.dispose([xTrain, yTrain]);
    model.dispose();
    return null;
  }

  // -- evaluate ------------------------------------------------------------
  const predict = (idx) => {
    if (!idx.length) return [];
    const x = tf.tensor2d(take(idx), [idx.length, featureLength]);
    const probs = model.predict(x).arraySync();
    x.dispose();
    return probs.map(argmax);
  };

  const trainPred = predict(trainIdx);
  const testPred = predict(testIdx);
  const trainActual = trainIdx.map((i) => labels[i]);
  const testActual = testIdx.map((i) => labels[i]);

  const run = {
    runId: `${datasetId}:${headId}:${Date.now()}`,
    modelId: headId,
    modelLabel: spec.label,
    datasetId,
    labels: labelNames,
    tuningMode: 'partial', // the head-only path is partial by definition
    paramCount: spec.paramCount(featureLength, classes),
    featureLength,
    trainCount: trainIdx.length,
    testCount: testIdx.length,
    realCount: realCount ?? embeddings.length,
    augmentation,
    accuracy: {
      train: accuracy(trainPred, trainActual),
      test: accuracy(testPred, testActual),
    },
    confusion: confusionMatrix(testPred, testActual, classes),
    labelCounts: countsByLabel(labels, labelNames),
    crossDataset: {},
    curve,
    trainSeconds: (performance.now() - startedAt) / 1000,
    backend: await backendName(),
    // Kept so the trained head can actually be used for prediction afterwards.
    // A model the student cannot then test would make the whole exercise
    // theoretical.
    _model: model,
  };

  tf.dispose([xTrain, yTrain]);
  return run;
}

/**
 * Run a trained head over one embedding.
 * @returns {{label:string, score:number}[]} sorted, highest first
 */
export async function predictWith(run, embedding) {
  if (!run?._model) throw new Error('That run has no model attached.');
  const tf = await loadTf();
  const x = tf.tensor2d(Float32Array.from(embedding), [1, embedding.length]);
  const probs = Array.from(run._model.predict(x).dataSync());
  x.dispose();
  return probs
    .map((score, i) => ({ label: run.labels[i], score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Score a finished run against a *different* dataset's embeddings.
 *
 * This is the boundary test and the cross-dataset matrix -- the number that
 * makes "specialist" mean something. Only meaningful when the two datasets
 * share a label set; otherwise the model has no way to be right and the honest
 * answer is `null` rather than zero.
 */
export async function scoreAgainst(run, { embeddings, labels, labelNames }) {
  if (!run?._model) return null;
  const sameLabels = labelNames.length === run.labels.length
    && labelNames.every((n, i) => n === run.labels[i]);
  if (!sameLabels) return null;

  const tf = await loadTf();
  const featureLength = embeddings[0].length;
  const flat = new Float32Array(embeddings.length * featureLength);
  embeddings.forEach((e, i) => flat.set(e, i * featureLength));
  const x = tf.tensor2d(flat, [embeddings.length, featureLength]);
  const preds = run._model.predict(x).arraySync().map(argmax);
  x.dispose();
  return accuracy(preds, labels);
}

/** Free a run's GPU memory once the student has moved on. */
export function disposeRun(run) {
  try { run?._model?.dispose(); } catch { /* ignore */ }
}
