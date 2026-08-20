/**
 * tuningLab.js -- Lab C. Partial vs full fine-tuning, and forgetting you can measure.
 *
 * WHY THIS USES ITS OWN SMALL NETWORK
 *
 * Everywhere else in this module the backbone is ResNet-50 and it stays frozen.
 * That is the right architecture and it is also why it cannot answer Lab C's
 * question: you cannot unlock ResNet-50 in a browser tab. Backpropagating
 * through 25.6 million parameters on a student's laptop is not minutes, it is
 * most of a lesson.
 *
 * The blueprint's suggested workaround was to ship pre-computed loss curves and
 * play them back behind a "training..." spinner. This module will not do that.
 * A screen that claims to be training while it replays a recording teaches the
 * exact opposite of everything else here.
 *
 * So Lab C uses a network small enough that both modes genuinely run: a ~15k
 * parameter CNN over 48x48 crops. It is trained live, in front of the student,
 * on the same two datasets they have already been using. Smaller model, same
 * mechanism, real numbers.
 *
 * HOW FORGETTING IS MEASURED (this is the part worth reading)
 *
 *   1. Train the whole net on domain A. Keep its A-head weights. Score it on
 *      A's held-out images -> `before`.
 *   2. Swap in a fresh head for domain B and fine-tune, either
 *        partial: convolutions frozen, only the new head learns
 *        full:    everything unlocked
 *   3. Re-attach the *original* A-head to the *current* convolutions and score
 *      on A's held-out images again -> `after`.
 *
 * Step 3 is the whole trick. Under partial tuning the convolutions are byte-for
 * -byte unchanged, so `after` equals `before` and the old skill is provably
 * intact. Under full tuning the convolutions have moved to suit domain B, the
 * old head no longer matches the features it was fitted to, and the score
 * falls. Nothing is asserted -- both numbers come off the same held-out set.
 *
 * The drop is real but its *size* depends on learning rate, epochs and how much
 * data B has. That is not a flaw to hide; it is Lab C's second lesson, and the
 * UI shows the settings next to the result so a student can go looking for the
 * configuration where it hurts most.
 */

import { loadTf } from './tf.js';
import { stratifiedSplit, argmax, accuracy } from './metrics.js';

export const CROP = 48;

export const TUNING_MODES = [
  {
    id: 'partial',
    label: 'Partial fine-tuning',
    icon: '🔒',
    tagline: 'Lock the eyes, retrain the mind',
    blurb: 'The convolution layers -- the part that learned to see edges, '
         + 'textures and shapes -- are frozen. Only the final decision layer '
         + 'learns anything new.',
    risk: 'Low. It cannot damage what it cannot change.',
  },
  {
    id: 'full',
    label: 'Full fine-tuning',
    icon: '🔓',
    tagline: 'Unlock the entire brain',
    blurb: 'Every layer is free to change, all the way down to the first edge '
         + 'detector. More powerful, and far more dangerous on a small dataset.',
    risk: 'High. With few examples it will overwrite what it already knew.',
  },
];

/**
 * Stack the images into one [n, 48, 48, 3] tensor in 0..1.
 * Exported so scratchNet.js reuses the exact same preprocessing -- a control
 * condition that resized differently would not be a control.
 */
export function toBatch(tf, canvases) {
  return tf.tidy(() => tf.stack(canvases.map((c) => tf.browser
    .fromPixels(c)
    .resizeBilinear([CROP, CROP])
    .toFloat()
    .div(255))));
}

export function buildTrunk(tf) {
  // Deliberately tiny. ~15k parameters is enough to learn a handful of visual
  // classes from a few hundred crops, and small enough that full fine-tuning
  // finishes while the student is still looking at the screen.
  return tf.sequential({
    layers: [
      tf.layers.conv2d({
        inputShape: [CROP, CROP, 3], filters: 8, kernelSize: 3, activation: 'relu',
      }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: 'relu' }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: 'relu' }),
      tf.layers.maxPooling2d({ poolSize: 2 }),
      tf.layers.flatten(),
      tf.layers.dense({ units: 32, activation: 'relu' }),
    ],
  });
}

export function attachHead(tf, trunk, classes, name) {
  const head = tf.layers.dense({ units: classes, activation: 'softmax', name });
  const input = tf.input({ shape: [CROP, CROP, 3] });
  return tf.model({ inputs: input, outputs: head.apply(trunk.apply(input)) });
}

export async function fit(tf, model, x, y, { epochs, lr, onEpoch, signal }) {
  model.compile({
    optimizer: tf.train.adam(lr),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  const curve = [];
  signal?.addEventListener('abort', () => { model.stopTraining = true; });
  await model.fit(x, y, {
    epochs,
    batchSize: Math.min(32, x.shape[0]),
    shuffle: true,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        const point = {
          epoch: epoch + 1,
          loss: logs.loss,
          accuracy: logs.acc ?? logs.accuracy ?? 0,
        };
        curve.push(point);
        onEpoch?.({ ...point, total: epochs });
        await tf.nextFrame();
      },
    },
  });
  return curve;
}

export function scoreOn(tf, model, x, actual) {
  const preds = model.predict(x).arraySync().map(argmax);
  return accuracy(preds, actual);
}

/**
 * Phase 1 -- general school. Train the small net on domain A.
 *
 * @param {{canvases:HTMLCanvasElement[], labels:number[], labelNames:string[], datasetId:string}} domainA
 * @param {{epochs?:number, lr?:number, onEpoch?:Function, signal?:AbortSignal}} [opts]
 * @returns {Promise<object>} a base model handle, passed to fineTune()
 */
export async function trainBase(domainA, opts = {}) {
  const tf = await loadTf();
  const { canvases, labels, labelNames, datasetId } = domainA;
  const classes = labelNames.length;

  const { train, test } = stratifiedSplit(labels, classes);
  const xAll = toBatch(tf, canvases);
  const xTrain = tf.gather(xAll, train);
  const yTrain = tf.oneHot(tf.tensor1d(train.map((i) => labels[i]), 'int32'), classes);
  const xTest = tf.gather(xAll, test);

  const trunk = buildTrunk(tf);
  const model = attachHead(tf, trunk, classes, 'head_a');

  const curve = await fit(tf, model, xTrain, yTrain, {
    epochs: opts.epochs ?? 25,
    lr: opts.lr ?? 0.003,
    onEpoch: opts.onEpoch,
    signal: opts.signal,
  });

  const testActual = test.map((i) => labels[i]);
  const baseAccuracy = scoreOn(tf, model, xTest, testActual);

  // The original head's weights, kept so step 3 can re-attach exactly this
  // classifier to whatever the convolutions have become.
  const headLayer = model.layers[model.layers.length - 1];
  const headWeights = headLayer.getWeights().map((w) => w.clone());

  tf.dispose([xAll, xTrain, yTrain]);

  return {
    trunk,
    model,
    headWeights,
    datasetId,
    labelNames,
    baseAccuracy,
    curve,
    paramCount: model.countParams(),
    // held-out A data, kept on the GPU for the re-test in step 3
    _probe: { x: xTest, actual: testActual, classes },
  };
}

/**
 * Phases 2 and 3 -- fine-tune on domain B, then re-measure domain A.
 *
 * @param {object} base  from trainBase()
 * @param {{canvases:HTMLCanvasElement[], labels:number[], labelNames:string[], datasetId:string}} domainB
 * @param {{mode:'partial'|'full', epochs?:number, lr?:number, onEpoch?:Function, signal?:AbortSignal}} opts
 * @returns {Promise<object>} a run, shaped for diagnose.js
 */
export async function fineTune(base, domainB, opts) {
  const tf = await loadTf();
  const mode = opts.mode === 'full' ? 'full' : 'partial';
  const { canvases, labels, labelNames, datasetId } = domainB;
  const classes = labelNames.length;

  // The trunk is shared with `base` on purpose -- under full tuning we *want*
  // the original network's weights to be the thing that gets damaged, because
  // that damage is the measurement.
  base.trunk.layers.forEach((l) => { l.trainable = mode === 'full'; });

  const tuned = attachHead(tf, base.trunk, classes, `head_b_${mode}_${Date.now()}`);

  const { train, test } = stratifiedSplit(labels, classes);
  const xAll = toBatch(tf, canvases);
  const xTrain = tf.gather(xAll, train);
  const yTrain = tf.oneHot(tf.tensor1d(train.map((i) => labels[i]), 'int32'), classes);
  const xTest = tf.gather(xAll, test);

  const curve = await fit(tf, tuned, xTrain, yTrain, {
    epochs: opts.epochs ?? 20,
    // A full fine-tune uses a smaller step, which is what you would actually do
    // in practice. It still moves the features; that is the point.
    lr: opts.lr ?? (mode === 'full' ? 0.0005 : 0.003),
    onEpoch: opts.onEpoch,
    signal: opts.signal,
  });

  const trainActual = train.map((i) => labels[i]);
  const testActual = test.map((i) => labels[i]);
  const newTaskTrain = scoreOn(tf, tuned, xTrain, trainActual);
  const newTaskTest = scoreOn(tf, tuned, xTest, testActual);

  // -- step 3: re-attach the ORIGINAL domain-A head and re-score domain A ----
  const probeModel = attachHead(tf, base.trunk, base._probe.classes, `probe_${Date.now()}`);
  probeModel.layers[probeModel.layers.length - 1].setWeights(base.headWeights);
  const baseTaskAccuracy = scoreOn(tf, probeModel, base._probe.x, base._probe.actual);
  probeModel.dispose();

  tf.dispose([xAll, xTrain, yTrain, xTest]);

  return {
    runId: `${datasetId}:${mode}:${Date.now()}`,
    modelId: `tiny_cnn_${mode}`,
    modelLabel: `Tiny CNN (${mode})`,
    datasetId,
    labels: labelNames,
    tuningMode: mode,
    paramCount: tuned.countParams(),
    trainableParams: tuned.trainableWeights
      .reduce((n, w) => n + w.shape.reduce((a, b) => a * b, 1), 0),
    trainCount: train.length,
    testCount: test.length,
    realCount: canvases.length,
    accuracy: { train: newTaskTrain, test: newTaskTest },
    // What it kept of what it already knew.
    baseTaskAccuracy,
    baseTaskId: base.datasetId,
    crossDataset: {
      [datasetId]: newTaskTest,
      [base.datasetId]: baseTaskAccuracy,
    },
    confusion: null,
    curve,
    hyperparams: { epochs: opts.epochs ?? 20, lr: opts.lr ?? (mode === 'full' ? 0.0005 : 0.003) },
    _model: tuned,
  };
}

/** The `baseline` argument diagnose.js compares a full-tune run against. */
export const baselineOf = (base) => ({
  baseTaskAccuracy: base.baseAccuracy,
  datasetId: base.datasetId,
});

export function disposeBase(base) {
  try {
    base?.model?.dispose();
    base?._probe?.x?.dispose();
    base?.headWeights?.forEach((w) => w.dispose());
  } catch { /* ignore */ }
}
