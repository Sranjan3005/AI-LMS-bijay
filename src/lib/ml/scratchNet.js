/**
 * scratchNet.js -- Lab A's control condition.
 *
 * WHY THIS EXISTS
 *
 * The blueprint promised "10 images -> 20% accuracy". That is a real number, but
 * it belongs to a model trained *from scratch*. On ResNet-50 features a linear
 * probe reaches far higher from the same ten images, because the hard part --
 * learning to see -- was already paid for by somebody else on 1.2 million
 * photographs.
 *
 * Showing only the fine-tuned number makes it look like magic. Showing only
 * the from-scratch number would be a lie about what the student just did. So
 * Lab A shows both, on **the same images and the same held-out split**, and the
 * gap between them is the lesson: this is what a pretrained backbone is worth.
 *
 * THE PART THAT MAKES IT A CONTROL RATHER THAN A DEMO
 *
 * The split is passed in, not recomputed. `TrainPanel` resolves which source
 * images the head trained on and which were held out, and hands exactly those
 * indices here. If this function chose its own split, the two accuracies would
 * differ for two reasons at once and the comparison would be worthless.
 *
 * The network is the same tiny CNN Lab C uses (~15k parameters over 48x48
 * crops), imported rather than copied so the two labs cannot drift apart.
 */

import { loadTf } from './tf.js';
import {
  toBatch, buildTrunk, attachHead, fit, scoreOn,
} from './tuningLab.js';
import { accuracy, argmax, confusionMatrix } from './metrics.js';

export const SCRATCH_CARD = {
  id: 'tiny_cnn_scratch',
  label: 'Tiny CNN, from scratch',
  blurb: 'Three convolution layers and a classifier, about fifteen thousand '
       + 'weights, all of them starting from random noise.',
  teaches: 'Nobody helped this one. It has to learn edges, texture and shape '
         + 'from your handful of photos, on top of learning the actual task.',
  paramCount: '~15k',
};

/**
 * Train the small network from random initialisation.
 *
 * @param {object} args
 * @param {HTMLImageElement[]|HTMLCanvasElement[]} args.images  every source image
 * @param {number[]} args.labels                                label index per source image
 * @param {string[]} args.labelNames
 * @param {number[]} args.trainSources  indices into `images` -- must be the head's
 * @param {number[]} args.testSources   indices into `images` -- must be the head's
 * @param {number}  [args.epochs]
 * @param {Function}[args.onEpoch]
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<object|null>} a run shaped like the head's, or null if cancelled
 */
export async function trainFromScratch({
  images,
  labels,
  labelNames,
  trainSources,
  testSources,
  epochs = 30,
  onEpoch,
  signal,
}) {
  if (!trainSources?.length) throw new Error('No training images for the control.');
  const tf = await loadTf();
  const classes = labelNames.length;

  const trainImgs = trainSources.map((i) => images[i]);
  const testImgs = testSources.map((i) => images[i]);
  const trainActual = trainSources.map((i) => labels[i]);
  const testActual = testSources.map((i) => labels[i]);

  const xTrain = toBatch(tf, trainImgs);
  const yTrain = tf.oneHot(tf.tensor1d(trainActual, 'int32'), classes);
  const xTest = testImgs.length ? toBatch(tf, testImgs) : null;

  const trunk = buildTrunk(tf);
  const model = attachHead(tf, trunk, classes, `scratch_${Date.now()}`);

  const startedAt = performance.now();
  let cancelled = false;
  signal?.addEventListener('abort', () => { cancelled = true; });

  // A higher learning rate than Lab C's fine-tune, because there is nothing
  // here worth preserving -- every weight starts as noise.
  const curve = await fit(tf, model, xTrain, yTrain, {
    epochs, lr: 0.005, onEpoch, signal,
  });

  if (cancelled) {
    tf.dispose([xTrain, yTrain, xTest].filter(Boolean));
    model.dispose();
    return null;
  }

  const trainAcc = scoreOn(tf, model, xTrain, trainActual);
  let testAcc = 0;
  let confusion = null;
  if (xTest) {
    testAcc = scoreOn(tf, model, xTest, testActual);
    const preds = model.predict(xTest).arraySync().map(argmax);
    confusion = confusionMatrix(preds, testActual, classes);
    // Same number, computed twice, as a cheap guard against the two paths
    // drifting apart.
    if (Math.abs(accuracy(preds, testActual) - testAcc) > 1e-6) {
      throw new Error('scratchNet: scoreOn and confusionMatrix disagree.');
    }
  }

  const run = {
    runId: `scratch:${Date.now()}`,
    modelId: SCRATCH_CARD.id,
    modelLabel: SCRATCH_CARD.label,
    labels: labelNames,
    tuningMode: 'scratch',
    paramCount: model.countParams(),
    trainCount: trainSources.length,
    testCount: testSources.length,
    accuracy: { train: trainAcc, test: testAcc },
    confusion,
    curve,
    trainSeconds: (performance.now() - startedAt) / 1000,
    provenance: { kind: 'live', note: 'Trained from random weights, just now, in this tab.' },
    _model: model,
  };

  tf.dispose([xTrain, yTrain, xTest].filter(Boolean));
  return run;
}

/**
 * The comparison row, given whichever of the three results exist.
 *
 * Returns `null` for anything not yet measured rather than a placeholder --
 * an empty cell is honest, an invented one is not.
 *
 * @param {object} args
 * @param {object} [args.scratch]  from trainFromScratch()
 * @param {object} [args.head]     from trainHead() or runFromRung()
 * @param {object} [args.full]     a grid cell (B-6/B-7); not available yet
 */
export function compareThree({ scratch, head, full }) {
  const row = (label, run, note) => (run ? {
    label,
    testAccuracy: run.accuracy?.test ?? null,
    trainAccuracy: run.accuracy?.train ?? null,
    paramCount: run.paramCount ?? null,
    seconds: run.trainSeconds ?? null,
    note,
  } : null);

  return [
    row('From scratch', scratch, 'Every weight starts as noise.'),
    row('Head on frozen CNN', head, '25.6 million weights held still, a few thousand fitted.'),
    row('Full fine-tune', full, 'All 25.6 million weights rewritten.'),
  ].filter(Boolean);
}
