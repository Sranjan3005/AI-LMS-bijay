import { useEffect, useRef, useState } from 'react';
import { Play, Wand2, Database, Cpu, Target } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { useSpotlight, Spot } from '../../lib/chiti/Spotlight.jsx';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Visual } from '../visuals/index.jsx';
import { narrate, react } from '../../lib/guide/script.js';
import { BASE_MODEL_CARD, embed } from '../../lib/ml/backbone.js';
import { predictWith } from '../../lib/ml/head.js';
import { DATASET_DRAG_TYPE } from '../DataLibraryDock.jsx';
import { datasetFromPack } from '../../lib/ml/heads.js';
import TrainPanel from '../TrainPanel.jsx';
import LibraryImageDrop from '../LibraryImageDrop.jsx';
import {
  Gate, PredictionBars, pct,
} from '../ui.jsx';

/**
 * Step 4 -- the training bench.
 *
 * Three panels across the screen rather than one long scroll, because the three
 * things being taught are sequential and the student should be able to see all
 * of them at once: **what it studies -> it studies -> what it learned.** A
 * vertical stack hides the consequence of the choice below the fold, which is
 * exactly the connection this step exists to make.
 *
 * Chiti spotlights whichever panel is live. The panels ahead are dimmed, so
 * "what do I do now" is answered by the layout instead of by reading.
 *
 * NOTHING PRE-ANNOUNCES THE ACCURACY. The Data Library shows what is in a
 * dataset, never how well it scores. The number appears after the training runs
 * and not before -- otherwise the whole point of watching it learn is spoiled.
 */
export default function SpecialistSchool() {
  const {
    primaryId, setPrimaryId, datasets, addDataset, specialist, setSpecialistRun, next,
  } = useFlow();
  const chiti = useChiti();
  const { spotlight, clear } = useSpotlight();
  const { beat, done } = useLesson();

  const [picked, setPicked] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  // True while *any* dataset drag is in flight anywhere on the page, so the
  // target can announce itself before the pointer reaches it. Without this the
  // student is dragging towards a panel that gives no sign it will accept.
  const [dragArmed, setDragArmed] = useState(false);
  const [testImage, setTestImage] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const trainedOnce = useRef(false);

  const dataset = picked || (primaryId ? datasets[primaryId] : null);
  const stage = !dataset ? 'pick' : (!specialist ? 'train' : 'test');

  // Report the gate from STATE, not from whichever handler happened to run.
  // The Data Library's "Use this dataset" button reaches this component through
  // App's onUse -> setPrimaryId, which never touched takeDataset() -- so the
  // lesson sat on "drop a dataset here" while the dataset was plainly loaded.
  useEffect(() => {
    if (dataset) done(TASKS.DATASET_CHOSEN);
  }, [dataset, done]);

  // Narration and the spotlight are both owned by the lesson script -- two
  // things driving the same ring would fight over it every render.

  const takeDataset = async (ds) => {
    setPicked(ds);
    setPrimaryId(ds.dataset_id);
  };

  // window-level, because dragenter on the target alone fires too late to be
  // useful as a hint.
  useEffect(() => {
    const carries = (e) => Array.from(e.dataTransfer?.types || []).includes(DATASET_DRAG_TYPE);
    const on = (e) => { if (carries(e)) setDragArmed(true); };
    const off = () => setDragArmed(false);
    window.addEventListener('dragover', on);
    window.addEventListener('dragend', off);
    window.addEventListener('drop', off);
    return () => {
      window.removeEventListener('dragover', on);
      window.removeEventListener('dragend', off);
      window.removeEventListener('drop', off);
    };
  }, []);

  const onDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    setDragArmed(false);
    const id = e.dataTransfer.getData(DATASET_DRAG_TYPE)
      || e.dataTransfer.getData('text/plain');
    if (!id) return;
    const existing = datasets[id];
    if (existing) { takeDataset(existing); return; }
    const ds = await datasetFromPack(id);
    addDataset(ds);
    takeDataset(ds);
  };

  const runPrediction = async () => {
    if (!testImage || !specialist) return;
    setBusy(true);
    try {
      // Straight to embed(): it letterboxes and resamples internally, through
      // the same Pillow-compatible path Python uses. Rendering to a canvas
      // first would resample twice -- once badly -- and pull the features off
      // the ones the head was fitted on.
      const vec = await embed(testImage);
      setAnswer(await predictWith(specialist, vec));
      done(TASKS.SPECIALIST_PREDICTED);
    } finally {
      setBusy(false);
    }
  };

  const headParams = dataset
    ? BASE_MODEL_CARD.embeddingSize * dataset.labels.length + dataset.labels.length
    : 0;

  return (
    <>
      {beat?.show && <div className="card tight"><Visual name={beat.show} /></div>}

      <div className="card tight">
        <div className="grid2" style={{ alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: 6 }}>What fine-tuning actually changes</h3>
            <p className="muted small" style={{ marginBottom: 0 }}>
              The model already knows how to look at a photograph — that took a
              million images and a lot of electricity, and none of it needs doing
              again. You keep all of it, and replace only the last layer: the one
              that turns a description into a name.
            </p>
          </div>
          <div className="brain" style={{ margin: 0 }}>
            <div className="layer locked">
              <span className="ico">🔒</span>
              <span className="nm">
                Everything that learned to <b>see</b>
                <br /><span className="small muted">frozen — not one weight moves</span>
              </span>
              <span className="pc">{BASE_MODEL_CARD.paramCount.toLocaleString()}</span>
            </div>
            <div className="layer unlocked">
              <span className="ico">🔓</span>
              <span className="nm">
                The bit that decides <b>what to call it</b>
                <br /><span className="small muted">retrained on your data</span>
              </span>
              <span className="pc">{headParams ? headParams.toLocaleString() : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bench">
        {/* ---------------------------------------------------- 1. the data */}
        <Spot
          id="bench-data"
          className={`bench-col ${stage === 'pick' ? 'is-target' : 'is-done'}${dragArmed ? ' is-target' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="bench-head">
            <span className="bench-num">1</span>
            <Database size={15} color="var(--info)" />
            <h4>What it studies</h4>
          </div>
          <div className="bench-body">
            {dataset ? (
              <>
                <div className="banner good" style={{ margin: 0 }}>
                  <b>{dataset.name}</b>
                  <div className="small" style={{ marginTop: 4 }}>
                    {dataset.count} images · {dataset.labels.length} classes
                  </div>
                </div>
                <div className="small muted" style={{ lineHeight: 1.6 }}>
                  {dataset.labels.join(' · ')}
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: 'auto' }}
                  onClick={() => { setPicked(null); setPrimaryId(null); }}
                >
                  Choose a different one
                </button>
              </>
            ) : (
              <div
                className={`drop${dragOver || dragArmed ? ' over' : ''}`}
                style={{ flex: 1, display: 'grid', placeItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '1.7rem', marginBottom: 8 }}>
                    {dragArmed ? '🎯' : '📚'}
                  </div>
                  <div><b>{dragArmed ? 'Drop it anywhere in this panel' : 'Drop a dataset here'}</b></div>
                  <div className="small muted" style={{ marginTop: 6 }}>
                    Open the <b>Data Library</b> at the bottom-left. Click{' '}
                    <i>Use this dataset</i> — or drag one across if you prefer.
                  </div>
                </div>
              </div>
            )}
          </div>
        </Spot>

        {/* ------------------------------------------------- 2. the training */}
        <Spot id="bench-train" className={`bench-col ${
          stage === 'train' ? 'is-target' : stage === 'test' ? 'is-done' : 'is-idle'}`}
        >
          <div className="bench-head">
            <span className="bench-num">2</span>
            <Cpu size={15} color="var(--accent)" />
            <h4>Send it to school</h4>
          </div>
          <div className="bench-body">
            {!dataset ? (
              <p className="small muted" style={{ margin: 'auto', textAlign: 'center' }}>
                Pick a dataset first.
              </p>
            ) : (
              <TrainPanel
                dataset={dataset}
                bare
                cta={trainedOnce.current ? 'Train it again' : 'Start training'}
                onRun={(run) => {
                  trainedOnce.current = true;
                  setSpecialistRun(run);
                  setAnswer(null);
                  done(TASKS.TRAINED);
                }}
              />
            )}
          </div>
        </Spot>

        {/* ----------------------------------------------------- 3. the test */}
        <Spot id="bench-test" className={`bench-col ${
          stage === 'test' ? 'is-target' : 'is-idle'}`}
        >
          <div className="bench-head">
            <span className="bench-num">3</span>
            <Target size={15} color="var(--good)" />
            <h4>Test what it learned</h4>
          </div>
          <div className="bench-body">
            {!specialist ? (
              <p className="small muted" style={{ margin: 'auto', textAlign: 'center' }}>
                Train the model and this comes alive.
              </p>
            ) : (
              <>
                <LibraryImageDrop
                  image={testImage}
                  onImage={(img) => { setTestImage(img); setAnswer(null); }}
                  hint="Drop a photo to test it"
                />
                <button
                  type="button"
                  className="btn primary"
                  onClick={runPrediction}
                  disabled={!testImage || busy}
                >
                  {busy ? <span className="spinner" /> : <Wand2 size={15} />}
                  Ask the specialist
                </button>

                {answer && (
                  <>
                    <PredictionBars predictions={answer} max={4} />
                    <p className="small muted" style={{ marginBottom: 0 }}>
                      It can only answer in the {specialist.labels.length} labels
                      you taught it. That is the trade you just made.
                    </p>
                  </>
                )}
              </>
            )}
          </div>
        </Spot>
      </div>

      <Gate
        hint="Pick a dataset and train the model to continue."
        ready={!!specialist}
        onNext={next}
        label="Now the interesting part"
      />
    </>
  );
}
