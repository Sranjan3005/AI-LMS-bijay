/**
 * diagnose.js -- the deterministic diagnosis layer.
 *
 * Same contract as Stage1/frontend/src/lib/guide/diagnose.js so the port back is
 * mechanical: pure, synchronous, no network, no React, no clock. Given a real
 * training run it returns what went wrong and what the UI could offer to do
 * about it. Chiti's wording is downstream of this; the *judgement* is here.
 *
 * Extended for this module with three kinds and three actions the digit flow
 * had no need for -- data volume, augmentation, and tuning mode.
 *
 * NOTE FOR THE PORT: Stage1 has a cross-language parity test
 * (chiti_coach/tests.py::ActionEnumParityTests) that reads this file and asserts
 * ACTIONS and KINDS match the Python side. Adding an entry here without adding
 * it there fails *silently* into the template fallback. Update both.
 */

/** Actions the UI can actually perform. A suggestion outside this list is dropped. */
export const ACTIONS = Object.freeze({
  OPEN_DATA_LIBRARY: 'open_data_library',
  SELECT_DATASET: 'select_dataset',
  SELECT_MODEL: 'select_model',
  RETRAIN: 'retrain',
  TRY_FAILURE_CASE: 'try_failure_case',
  VIEW_MATRIX: 'view_matrix',
  TEST_YOUR_OWN: 'test_your_own',
  // -- new in the Fine-Tuning module --
  SET_DATA_VOLUME: 'set_data_volume',
  TOGGLE_AUGMENTATION: 'toggle_augmentation',
  SET_TUNING_MODE: 'set_tuning_mode',
  NEXT_STEP: 'next_step',
  NONE: 'none',
});

const ACTION_VALUES = new Set(Object.values(ACTIONS));

export const KINDS = Object.freeze({
  DISTRIBUTION_MISMATCH: 'distribution_mismatch',
  OVERFIT: 'overfit',
  UNDERFIT: 'underfit',
  TOO_FEW_SAMPLES: 'too_few_samples',
  CLASS_CONFUSION: 'class_confusion',
  NO_LEARNING: 'no_learning',
  CLASS_IMBALANCE: 'class_imbalance',
  SUCCESS: 'success',
  // -- new in the Fine-Tuning module --
  CATASTROPHIC_FORGETTING: 'catastrophic_forgetting',
  AUGMENTATION_HELPED: 'augmentation_helped',
  AUGMENTATION_DID_NOT_HELP: 'augmentation_did_not_help',
});

/* Thresholds are named rather than inlined so the rules can be argued with. */
export const T = Object.freeze({
  mismatchDrop: 0.2,        // own-data accuracy minus worst other dataset
  overfitGap: 0.15,         // train accuracy minus test accuracy
  underfitCeiling: 0.7,     // both train and test below this
  fewSamples: 300,
  imbalanceRatio: 3,        // largest class / smallest class
  classConfusionShare: 0.3, // one class holding this share of all errors
  // ...but a share means nothing when the totals are tiny. A near-perfect model
  // making 3 mistakes on one class and 2 on another is not a class problem, and
  // reporting it as one would send a student chasing noise.
  classConfusionMinErrors: 6,
  successFloor: 0.8,
  successSpread: 0.15,
  // -- new --
  // How much base-task ability a full fine-tune has to destroy before we call it
  // forgetting rather than noise. Measured against the same model's own
  // pre-tuning score on the base task, never against an authored number.
  forgettingDrop: 0.2,
  // A change smaller than this on a held-out set of a few hundred images is
  // inside the noise floor, and calling it a win would be teaching luck.
  augmentationDelta: 0.04,
});

const shortName = (id) => (id || '').split('/').pop();

/** Prefer a dataset whose name suggests it mixes domains -- that is the fix here. */
function findGeneralistDataset(available = [], excludeId) {
  const candidates = available.filter((d) => d.dataset_id !== excludeId);
  return candidates.find((d) => /mixed|combined|diverse|all/i.test(d.dataset_id))
    || candidates.find((d) => /mixed|combined|diverse/i.test(d.name || ''))
    || null;
}

function largestDataset(available = [], excludeId) {
  const candidates = available.filter((d) => d.dataset_id !== excludeId);
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => ((b.count || 0) > (a.count || 0) ? b : a));
}

function biggerModel(availableModels = [], currentId) {
  const current = availableModels.find((m) => m.id === currentId);
  const bigger = availableModels
    .filter((m) => m.id !== currentId && (m.paramCount || 0) > (current?.paramCount || 0))
    .sort((a, b) => a.paramCount - b.paramCount);
  return bigger[0] || null;
}

/** Which class absorbs the most errors, and how much of the total it holds. */
export function worstClass(confusion, labels = []) {
  if (!confusion?.length) return null;

  let totalErrors = 0;
  const errorsByTrue = confusion.map((row, i) => {
    const errors = row.reduce((sum, cell, j) => (i === j ? sum : sum + cell), 0);
    totalErrors += errors;
    return errors;
  });
  if (!totalErrors) return null;

  let index = 0;
  for (let i = 1; i < errorsByTrue.length; i++) {
    if (errorsByTrue[i] > errorsByTrue[index]) index = i;
  }

  // What it was most often mistaken for -- more useful than "class 8 is hard".
  const row = confusion[index];
  let confusedWith = null;
  let best = 0;
  row.forEach((cell, j) => {
    if (j !== index && cell > best) { best = cell; confusedWith = j; }
  });

  return {
    label: labels[index] ?? String(index),
    confusedWith: confusedWith == null ? null : (labels[confusedWith] ?? String(confusedWith)),
    errors: errorsByTrue[index],
    share: errorsByTrue[index] / totalErrors,
  };
}

/** Ratio between the biggest and smallest class, or null when unknown. */
export function imbalanceOf(labelCounts) {
  const values = Object.values(labelCounts || {}).filter((v) => v > 0);
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  return { ratio: max / min, max, min };
}

/**
 * Diagnose a finished training run.
 *
 * @param {object} run       result from head.trainHead()
 * @param {object} [context] { availableDatasets, availableModels, datasetMeta,
 *                             baseline, previousRun }
 * @returns {{kind, severity, evidence, candidateActions}}
 */
export function diagnoseTraining(run, context = {}) {
  const {
    availableDatasets = [], availableModels = [], datasetMeta = null,
    baseline = null, previousRun = null,
  } = context;

  if (!run) {
    return { kind: KINDS.NO_LEARNING, severity: 'low', evidence: {}, candidateActions: [] };
  }

  const trainAcc = run.accuracy?.train ?? 0;
  const testAcc = run.accuracy?.test ?? 0;
  const cross = run.crossDataset || {};
  const others = Object.entries(cross).filter(([id]) => id !== run.datasetId);
  const ownName = shortName(run.datasetId);

  const make = (kind, severity, evidence, candidateActions) => ({
    kind, severity, evidence, candidateActions: candidateActions.filter(Boolean),
  });

  // -- a model that cannot learn at all -------------------------------------
  if ((run.paramCount || 0) === 0) {
    const trainable = availableModels.find((m) => (m.paramCount || 0) > 0);
    return make(KINDS.NO_LEARNING, 'high', { paramCount: 0 }, [
      trainable && {
        action: ACTIONS.SELECT_MODEL,
        targetId: trainable.id,
        label: `Try ${trainable.label} instead`,
      },
    ]);
  }

  // -- full fine-tuning wrecked what the model already knew ------------------
  // Checked early and before accuracy rules, because a model can score well on
  // the new task *and* have lost the old one -- that is precisely the lesson,
  // and an overfit/underfit verdict would bury it.
  if (run.tuningMode === 'full' && baseline && typeof run.baseTaskAccuracy === 'number') {
    const lost = (baseline.baseTaskAccuracy ?? 0) - run.baseTaskAccuracy;
    if (lost >= T.forgettingDrop) {
      return make(KINDS.CATASTROPHIC_FORGETTING, lost >= 0.4 ? 'high' : 'medium', {
        before: baseline.baseTaskAccuracy,
        after: run.baseTaskAccuracy,
        lost,
        trainCount: run.trainCount ?? 0,
      }, [
        {
          action: ACTIONS.SET_TUNING_MODE,
          targetId: 'partial',
          label: 'Lock the base layers and try again',
        },
        { action: ACTIONS.VIEW_MATRIX, targetId: null, label: 'Show me what it lost' },
      ]);
    }
  }

  // -- did augmentation actually do anything? -------------------------------
  // Only meaningful as a comparison against the immediately previous run on the
  // same data with augmentation off. Anything else is not a controlled change.
  if (run.augmentation?.active && previousRun && !previousRun.augmentation?.active
      && previousRun.datasetId === run.datasetId
      && previousRun.realCount === run.realCount) {
    const delta = testAcc - (previousRun.accuracy?.test ?? 0);
    if (delta >= T.augmentationDelta) {
      return make(KINDS.AUGMENTATION_HELPED, 'high', {
        before: previousRun.accuracy?.test ?? 0,
        after: testAcc,
        delta,
        realCount: run.realCount,
        effectiveCount: run.trainCount,
      }, [
        { action: ACTIONS.NEXT_STEP, targetId: null, label: 'Good -- what is next?' },
        { action: ACTIONS.RETRAIN, targetId: null, label: 'Try a different combination' },
      ]);
    }
    return make(KINDS.AUGMENTATION_DID_NOT_HELP, 'medium', {
      before: previousRun.accuracy?.test ?? 0,
      after: testAcc,
      delta,
    }, [
      { action: ACTIONS.TOGGLE_AUGMENTATION, targetId: null, label: 'Try other transforms' },
      { action: ACTIONS.SET_DATA_VOLUME, targetId: null, label: 'Or just get more real photos' },
    ]);
  }

  // -- not enough data to mean anything -------------------------------------
  const trainCount = run.trainCount ?? 0;
  if (trainCount < T.fewSamples) {
    const bigger = largestDataset(availableDatasets, run.datasetId);
    return make(
      KINDS.TOO_FEW_SAMPLES,
      trainCount < T.fewSamples / 2 ? 'high' : 'medium',
      { trainCount, needed: T.fewSamples },
      [
        { action: ACTIONS.SET_DATA_VOLUME, targetId: null, label: 'Slide the data volume up' },
        bigger && {
          action: ACTIONS.SELECT_DATASET,
          targetId: bigger.dataset_id,
          label: `Train on ${shortName(bigger.dataset_id)} (${bigger.count} images)`,
        },
        { action: ACTIONS.OPEN_DATA_LIBRARY, targetId: null, label: 'Browse the Data Library' },
      ],
    );
  }

  // -- the headline case: fine at home, lost everywhere else ----------------
  if (others.length) {
    const [worstId, worstAcc] = others.reduce((a, b) => (b[1] < a[1] ? b : a));
    const drop = testAcc - worstAcc;
    if (drop >= T.mismatchDrop) {
      const generalist = findGeneralistDataset(availableDatasets, run.datasetId);
      return make(
        KINDS.DISTRIBUTION_MISMATCH,
        drop >= 0.35 ? 'high' : 'medium',
        {
          ownDataset: ownName,
          ownAccuracy: testAcc,
          worstDataset: shortName(worstId),
          worstAccuracy: worstAcc,
          drop,
        },
        [
          generalist && {
            action: ACTIONS.SELECT_DATASET,
            targetId: generalist.dataset_id,
            label: `Train me on ${shortName(generalist.dataset_id)} instead`,
          },
          { action: ACTIONS.VIEW_MATRIX, targetId: null, label: 'Show me every combination' },
        ],
      );
    }
  }

  // -- memorising rather than learning --------------------------------------
  const gap = trainAcc - testAcc;
  if (gap >= T.overfitGap) {
    const bigger = largestDataset(availableDatasets, run.datasetId);
    return make(KINDS.OVERFIT, gap >= 0.3 ? 'high' : 'medium', {
      trainAccuracy: trainAcc, testAccuracy: testAcc, gap,
    }, [
      { action: ACTIONS.SET_DATA_VOLUME, targetId: null, label: 'Give it more examples' },
      bigger && {
        action: ACTIONS.SELECT_DATASET,
        targetId: bigger.dataset_id,
        label: `Try ${shortName(bigger.dataset_id)}`,
      },
      { action: ACTIONS.TOGGLE_AUGMENTATION, targetId: null, label: 'Or stretch what you have' },
    ]);
  }

  // -- not learning enough --------------------------------------------------
  if (trainAcc < T.underfitCeiling && testAcc < T.underfitCeiling) {
    const bigger = biggerModel(availableModels, run.modelId);
    return make(KINDS.UNDERFIT, trainAcc < 0.5 ? 'high' : 'medium', {
      trainAccuracy: trainAcc, testAccuracy: testAcc,
    }, [
      bigger && {
        action: ACTIONS.SELECT_MODEL,
        targetId: bigger.id,
        label: `Try ${bigger.label} -- it has more room to learn`,
      },
      { action: ACTIONS.RETRAIN, targetId: null, label: 'Train it for longer' },
    ]);
  }

  // -- lopsided training data -----------------------------------------------
  const imbalance = imbalanceOf(datasetMeta?.label_counts);
  if (imbalance && imbalance.ratio >= T.imbalanceRatio) {
    return make(KINDS.CLASS_IMBALANCE, 'medium', imbalance, [
      { action: ACTIONS.OPEN_DATA_LIBRARY, targetId: null, label: 'Find a more even dataset' },
    ]);
  }

  // -- one class doing most of the damage -----------------------------------
  const worst = worstClass(run.confusion, run.labels);
  if (worst && worst.share >= T.classConfusionShare
      && worst.errors >= T.classConfusionMinErrors) {
    return make(KINDS.CLASS_CONFUSION, 'medium', worst, [
      { action: ACTIONS.TEST_YOUR_OWN, targetId: null, label: `Test it on a ${worst.label}` },
    ]);
  }

  // -- it held up -----------------------------------------------------------
  const values = Object.values(cross);
  const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;
  return make(
    KINDS.SUCCESS,
    testAcc >= T.successFloor && spread <= T.successSpread ? 'high' : 'low',
    { testAccuracy: testAcc, spread },
    [
      { action: ACTIONS.TEST_YOUR_OWN, targetId: null, label: 'Test it with your own photo' },
      { action: ACTIONS.NEXT_STEP, targetId: null, label: 'Move on' },
    ],
  );
}

/**
 * Drop any suggestion the UI could not carry out.
 *
 * A button that does nothing is worse than no button, so anything whose action
 * is unknown, or whose target is not actually available, is discarded here.
 */
export function sanitiseSuggestion(
  suggestion,
  { availableDatasets = [], availableModels = [] } = {},
) {
  if (!suggestion || typeof suggestion !== 'object') return null;
  const { action, targetId = null, label } = suggestion;

  if (!ACTION_VALUES.has(action) || action === ACTIONS.NONE) return null;
  if (!label) return null;

  if (action === ACTIONS.SELECT_DATASET) {
    if (!availableDatasets.some((d) => d.dataset_id === targetId)) return null;
  }
  if (action === ACTIONS.SELECT_MODEL) {
    if (!availableModels.some((m) => m.id === targetId)) return null;
  }
  if (action === ACTIONS.SET_TUNING_MODE) {
    if (targetId !== 'partial' && targetId !== 'full') return null;
  }

  return { action, targetId, label };
}
