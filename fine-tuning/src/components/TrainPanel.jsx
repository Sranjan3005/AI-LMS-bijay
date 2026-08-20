import { useCallback, useRef, useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useFlow } from '../lib/flowState.jsx';
import { useChiti } from '../lib/chiti/ChitiProvider.jsx';
import { react } from '../lib/guide/script.js';
import { diagnoseTraining } from '../lib/guide/diagnose.js';
import { templateFor } from '../lib/guide/templates.js';
import { trainHead } from '../lib/ml/head.js';
import { resolveTrainingSplit } from '../lib/ml/metrics.js';
import { Progress, LossCurve, Stat, StatRow, pct } from './ui.jsx';

/**
 * TrainPanel -- embed, fit, evaluate, diagnose. Shared by steps 4, 7 and 8.
 *
 * TWO THINGS IN HERE ARE LOAD-BEARING AND EASY TO GET WRONG:
 *
 * 1. **The held-out set is built from source images, not from embeddings.**
 *    Augmentation turns one photo into up to six, and if a flipped copy of a
 *    test photo lands in the training set then "accuracy on images it never
 *    saw" is measuring memorisation. Lab B would then show augmentation
 *    producing a huge gain, every time, for entirely the wrong reason. So the
 *    split happens over source indices first, and the test set contains only
 *    un-augmented originals.
 *
 * 2. **The data-volume slider subsamples per class, deterministically.** Taking
 *    the first N overall would quietly unbalance the classes and the student
 *    would be measuring two changes at once.
 */
export default function TrainPanel({
  dataset,
  augmentation = null,
  perClass = null,       // data-volume cap, or null for everything
  headId = 'linear',
  onRun,
  cta = 'Train the model',
  bare = false,          // drop the card chrome when embedded in a bench column
}) {
  const { embeddingsFor, runs, recordRun } = useFlow();
  const chiti = useChiti();

  const [phase, setPhase] = useState('idle'); // idle | embedding | training | done | error
  const [progress, setProgress] = useState(0);
  const [curve, setCurve] = useState([]);
  const [epochTotal, setEpochTotal] = useState(0);
  const [run, setRun] = useState(null);
  const [coach, setCoach] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const start = useCallback(async () => {
    if (!dataset) return;
    setPhase('embedding');
    setError(null);
    setCurve([]);
    setRun(null);
    setCoach(null);
    setProgress(0);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const packed = await embeddingsFor(
        dataset.dataset_id,
        augmentation,
        (done, total) => setProgress(total ? done / total : 0),
      );

      // The data-volume cap, the source-level split and the mapping back to
      // embedding rows all happen in one tested place -- see the header comment
      // on resolveTrainingSplit for the two silent failures it prevents.
      const split = resolveTrainingSplit({
        sourceLabels: dataset.imageLabels,
        classes: dataset.labels.length,
        sourceIndex: packed.sourceIndex,
        perClass,
      });

      const embeddings = split.keep.map((i) => packed.vectors[i]);
      const labels = split.keep.map((i) => packed.labels[i]);

      setPhase('training');
      const r = react('training_started', { runId: dataset.dataset_id });
      chiti.say(r.text, { key: `${r.key}:${Date.now()}` });

      const finished = await trainHead({
        embeddings,
        labels,
        labelNames: dataset.labels,
        datasetId: dataset.dataset_id,
        headId,
        realCount: split.usedSources.length,
        augmentation: augmentation && Object.values(augmentation).some(Boolean)
          ? { ...augmentation, active: true }
          : { active: false },
        holdOut: split.holdOut,
        onEpoch: ({ epoch, loss, accuracy, total }) => {
          setEpochTotal(total);
          setCurve((c) => [...c, { epoch, loss, accuracy }]);
        },
        signal: controller.signal,
      });

      if (!finished) { setPhase('idle'); return; }

      // Publish the resolved split in *source image* terms. Lab A's control
      // condition trains on exactly these indices; if it chose its own split the
      // two accuracies would differ for two reasons at once and the comparison
      // would mean nothing.
      finished.split = {
        trainSources: split.trainSources,
        testSources: split.testSources,
      };

      // -- diagnose off the real result, then let Chiti word it -------------
      const previousRun = runs.length ? runs[runs.length - 1] : null;
      const diagnosis = diagnoseTraining(finished, {
        availableDatasets: [],
        availableModels: [],
        datasetMeta: { label_counts: finished.labelCounts },
        previousRun,
      });
      const line = templateFor(diagnosis);

      setRun(finished);
      setCoach({ ...line, diagnosis });
      recordRun(finished);
      onRun?.(finished);
      setPhase('done');

      chiti.say(line.say, { key: `run:${finished.runId}` });
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  }, [dataset, augmentation, perClass, headId, embeddingsFor, chiti, runs, recordRun, onRun]);

  const cancel = () => { abortRef.current?.abort(); };

  const busy = phase === 'embedding' || phase === 'training';

  const Wrap = bare ? 'div' : 'div';
  return (
    <Wrap className={bare ? '' : 'card'} style={bare ? { display: 'flex', flexDirection: 'column', gap: 10, flex: 1 } : undefined}>
      <div className="btn-row">
        <button type="button" className="btn primary" onClick={start} disabled={!dataset || busy}>
          {busy ? <span className="spinner" /> : <Play size={15} />}
          {phase === 'embedding' ? 'Looking at the photos…'
            : phase === 'training' ? 'Studying…'
              : cta}
        </button>
        {busy && (
          <button type="button" className="btn ghost" onClick={cancel}>
            <Square size={14} /> Stop
          </button>
        )}
      </div>

      {phase === 'embedding' && (
        <Progress
          value={progress}
          label="Running every photo through the frozen backbone. This is the slow part — the training afterwards takes about a second."
        />
      )}

      {(phase === 'training' || phase === 'done') && curve.length > 0 && (
        <>
          <LossCurve curve={curve} total={epochTotal} />
          <p className="small muted">
            Measured, not animated — one point per pass through the data.
            Orange is the error going down; green is accuracy on what it is studying.
          </p>
        </>
      )}

      {run && (
        <>
          <StatRow>
            <Stat k="On what it studied" v={pct(run.accuracy.train)} />
            <Stat
              k="On photos it never saw"
              v={pct(run.accuracy.test)}
              tone={run.accuracy.test >= 0.8 ? 'good' : run.accuracy.test >= 0.5 ? 'warn' : 'bad'}
            />
            <Stat k="Trained on" v={run.trainCount} />
            <Stat k="Weights changed" v={run.paramCount.toLocaleString()} />
            <Stat k="Time" v={`${run.trainSeconds.toFixed(1)}s`} />
          </StatRow>
          <p className="small muted">
            The second number is the one that matters. The first only says it
            remembered its homework.
          </p>
        </>
      )}

      {coach && (
        <div className={`banner${coach.diagnosis.severity === 'high' ? ' warn' : ''}`}>
          <b>{coach.say}</b>
          {coach.insight && <div className="small muted" style={{ marginTop: 6 }}>{coach.insight}</div>}
        </div>
      )}

      {error && <div className="banner bad">{error}</div>}
    </Wrap>
  );
}
