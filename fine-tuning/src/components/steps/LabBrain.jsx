import { useEffect, useRef, useState } from 'react';
import { Brain, Play } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate } from '../../lib/guide/script.js';
import { diagnoseTraining } from '../../lib/guide/diagnose.js';
import { templateFor } from '../../lib/guide/templates.js';
import {
  TUNING_MODES, trainBase, fineTune, baselineOf, CROP,
} from '../../lib/ml/tuningLab.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import DatasetPicker from '../DatasetPicker.jsx';
import {
  Gate, LossCurve, Stat, StatRow, pct,
} from '../ui.jsx';

/**
 * Step 9 -- Lab C. Partial vs full fine-tuning, and forgetting you can measure.
 *
 * Read the header comment in lib/ml/tuningLab.js before changing anything here.
 * The short version: this lab swaps to a ~15k-parameter CNN because ResNet-50
 * cannot be unlocked in a browser tab, and the alternative -- replaying a
 * pre-recorded loss curve behind a "training..." spinner -- would teach the
 * exact opposite of everything else in this module.
 *
 * The number this screen exists to produce is `baseTaskAccuracy`: the model's
 * score on domain A, re-measured with its original domain-A classifier, after
 * being fine-tuned on domain B. Under partial tuning the convolutions never
 * moved, so it cannot change. Under full tuning it usually falls, and how far
 * depends on settings the student can see and alter.
 */
export default function LabBrain() {
  const { datasets, primaryId, secondaryId, setSecondaryId, next } = useFlow();
  const chiti = useChiti();
  const { done } = useLesson();

  const [phase, setPhase] = useState('idle'); // idle | base | tuning | done
  const [curve, setCurve] = useState([]);
  const [epochTotal, setEpochTotal] = useState(0);
  const [mode, setMode] = useState('partial');
  const [results, setResults] = useState({});   // mode -> run
  const [coach, setCoach] = useState(null);
  const [error, setError] = useState(null);
  const baseRef = useRef(null);
  const [baseInfo, setBaseInfo] = useState(null);

  useEffect(() => { chiti.say(narrate('lab_brain'), { key: 'step:lab_brain' }); }, [chiti]);

  const domainA = primaryId ? datasets[primaryId] : null;
  const domainB = secondaryId ? datasets[secondaryId] : null;

  const asDomain = (ds) => ({
    canvases: ds.images,
    labels: ds.imageLabels,
    labelNames: ds.labels,
    datasetId: ds.dataset_id,
  });

  const runBase = async () => {
    if (!domainA) return;
    setPhase('base');
    setError(null);
    setCurve([]);
    setResults({});
    try {
      const base = await trainBase(asDomain(domainA), {
        onEpoch: ({ epoch, loss, accuracy, total }) => {
          setEpochTotal(total);
          setCurve((c) => [...c, { epoch, loss, accuracy }]);
        },
      });
      baseRef.current = base;
      done(TASKS.BASE_TRAINED);
      setBaseInfo({
        accuracy: base.baseAccuracy,
        params: base.paramCount,
        classes: base.labelNames,
      });
      setPhase('idle');
      chiti.say(
        `Done. A brand new ${base.paramCount.toLocaleString()}-weight network, trained `
        + `from nothing on ${domainA.name}, scoring ${Math.round(base.baseAccuracy * 100)} `
        + 'percent on images it never saw. Remember that number. It is the one we are '
        + 'about to put at risk.',
        { key: `labc:base:${base.baseAccuracy}` },
      );
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  };

  const runTune = async () => {
    if (!baseRef.current || !domainB) return;
    setPhase('tuning');
    setError(null);
    setCurve([]);
    try {
      const run = await fineTune(baseRef.current, asDomain(domainB), {
        mode,
        onEpoch: ({ epoch, loss, accuracy, total }) => {
          setEpochTotal(total);
          setCurve((c) => [...c, { epoch, loss, accuracy }]);
        },
      });
      setResults((r) => {
        const nextResults = { ...r, [mode]: run };
        if (nextResults.partial && nextResults.full) done(TASKS.BOTH_MODES);
        return nextResults;
      });

      const diagnosis = diagnoseTraining(run, { baseline: baselineOf(baseRef.current) });
      const line = templateFor(diagnosis);
      setCoach({ ...line, diagnosis, mode });
      if (line.say) chiti.say(line.say, { key: `labc:${run.runId}` });
      setPhase('done');
    } catch (e) {
      setError(e.message);
      setPhase('idle');
    }
  };

  const busy = phase === 'base' || phase === 'tuning';
  const partial = results.partial;
  const full = results.full;
  const bothDone = !!partial && !!full;

  if (!domainA) {
    return (
      <div className="card">
        <div className="banner warn">
          No dataset loaded. Go back to <b>Specialist school</b> and pick one first.
        </div>
      </div>
    );
  }

  // Unlike every other step, this one trains on raw pixels -- the whole point is
  // a network small enough to unlock end to end. Installed sets ship as
  // embeddings only, so there is nothing here for it to look at.
  if (domainA.hasPixels === false) {
    return (
      <div className="card">
        <h3>This lab needs the actual photos</h3>
        <p className="muted">
          Everywhere else in this module the images were turned into numbers
          once, at build time, and only those numbers ship — which is why the
          other labs are instant.
        </p>
        <p className="muted">
          This lab is different: it trains a small network <i>from the pixels
          up</i>, so it can unlock every layer and show you what full
          fine-tuning costs. That needs the images themselves.
        </p>
        <div className="banner">
          Go back to <b>Specialist school</b> and choose <b>your own folder</b>{' '}
          instead of an installed set. Two classes and a few dozen photos each is
          plenty — and a dataset you built yourself makes the next result harder
          to argue with.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <Brain size={19} color="var(--accent)" />
          <h3 style={{ margin: 0 }}>A smaller brain, so you can open it</h3>
        </div>
        <p className="muted">
          Everywhere else in this module the big model stayed frozen — you could
          not unlock it if you wanted to, because backpropagating through 25.6
          million weights would take most of a lesson in a browser tab.
        </p>
        <p className="muted">
          So this lab uses a small network instead: about fifteen thousand
          weights, reading {CROP}×{CROP} crops. Small enough that both modes
          genuinely run in front of you. Same mechanism, real numbers, no
          recordings.
        </p>

        <div className="grid2" style={{ marginTop: 16 }}>
          <div>
            <h4>Step 1 — general school</h4>
            <p className="small muted">
              Train the little network from scratch on <b>{domainA.name}</b>.
              This is its only skill, and its score here is what we will check on
              later.
            </p>
            <Spot id="labc-base" as="span">
            <button type="button" className="btn primary" onClick={runBase} disabled={busy}>
              {phase === 'base' ? <span className="spinner" /> : <Play size={15} />}
              Train it on {domainA.name}
            </button>
            </Spot>
            {baseInfo && (
              <StatRow>
                <Stat k={`Knows ${baseInfo.classes.length} classes`} v={pct(baseInfo.accuracy)} tone="good" />
                <Stat k="Weights" v={baseInfo.params.toLocaleString()} />
              </StatRow>
            )}
          </div>

          <div>
            <h4>Step 2 — a new subject</h4>
            <p className="small muted">
              Pick a <b>different</b> set of images for it to learn. This is the
              new job it is being retrained for.
            </p>
            {domainB
              ? <div className="banner good" style={{ margin: 0 }}>{domainB.name} — {domainB.count} images, {domainB.labels.length} classes</div>
              : <p className="small muted">Choose one below.</p>}
          </div>
        </div>
      </div>

      {baseInfo && !domainB && (
        <DatasetPicker
          title="Pick the second subject"
          selectedId={secondaryId}
          onPicked={(ds) => setSecondaryId(ds.dataset_id)}
        />
      )}

      {baseInfo && domainB && (
        <div className="card">
          <h3>Step 3 — how much of the brain do you unlock?</h3>
          <Spot id="labc-modes" className="grid2">
            {TUNING_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`toggle${mode === m.id ? ' on' : ''}`}
                style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left' }}
                onClick={() => setMode(m.id)}
                disabled={busy}
              >
                <div className="btn-row" style={{ gap: 8 }}>
                  <span className="toggle-box" />
                  <b>{m.icon} {m.label}</b>
                </div>
                <span className="small muted">{m.blurb}</span>
                <span className="small" style={{ color: m.id === 'full' ? 'var(--bad)' : 'var(--good)' }}>
                  Risk: {m.risk}
                </span>
              </button>
            ))}
          </Spot>

          {/* the padlocks, reflecting the actual mode */}
          <div className="brain" style={{ marginTop: 16 }}>
            {['Edge detector (conv 1)', 'Texture & parts (conv 2)', 'Shapes (conv 3)', 'Feature summary (dense)'].map((nm) => (
              <div key={nm} className={`layer ${mode === 'full' ? 'unlocked' : 'locked'}`}>
                <span className="ico">{mode === 'full' ? '🔓' : '🔒'}</span>
                <span className="nm">{nm}</span>
                <span className="pc">{mode === 'full' ? 'learning' : 'frozen'}</span>
              </div>
            ))}
            <div className="layer unlocked">
              <span className="ico">🔓</span>
              <span className="nm">Decision layer — <b>{domainB.labels.join(', ')}</b></span>
              <span className="pc">new, learning</span>
            </div>
          </div>

          <div className="btn-row" style={{ marginTop: 14 }}>
            <button type="button" className="btn primary" onClick={runTune} disabled={busy}>
              {phase === 'tuning' ? <span className="spinner" /> : <Play size={15} />}
              Fine-tune on {domainB.name} — {mode}
            </button>
            {results[mode] && <span className="tag good">already run</span>}
          </div>
        </div>
      )}

      {curve.length > 0 && (
        <div className="card tight">
          <LossCurve curve={curve} total={epochTotal} />
        </div>
      )}

      {(partial || full) && (
        <div className="card">
          <h3>What each mode cost</h3>
          <div className="scroll-x">
            <table className="matrix">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Mode</th>
                  <th>Weights that could change</th>
                  <th>New job ({domainB?.name})</th>
                  <th>Old job ({domainA.name}) before</th>
                  <th>Old job after</th>
                  <th>Lost</th>
                </tr>
              </thead>
              <tbody>
                {['partial', 'full'].map((k) => {
                  const r = results[k];
                  if (!r) return null;
                  const lost = (baseInfo?.accuracy ?? 0) - r.baseTaskAccuracy;
                  return (
                    <tr key={k}>
                      <td className="rowhead">{k === 'full' ? '🔓 Full' : '🔒 Partial'}</td>
                      <td>{r.trainableParams.toLocaleString()}</td>
                      <td style={{ color: r.accuracy.test >= 0.7 ? 'var(--good)' : 'var(--warn)' }}>
                        {pct(r.accuracy.test)}
                      </td>
                      <td>{pct(baseInfo?.accuracy)}</td>
                      <td style={{ color: r.baseTaskAccuracy >= (baseInfo?.accuracy ?? 0) - 0.05 ? 'var(--good)' : 'var(--bad)' }}>
                        {pct(r.baseTaskAccuracy)}
                      </td>
                      <td style={{ color: lost > 0.1 ? 'var(--bad)' : 'var(--muted)' }}>
                        {lost > 0.005 ? `−${Math.round(lost * 100)} pts` : 'nothing'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="small muted" style={{ marginTop: 10 }}>
            The last two columns are measured the same way both times: the
            network&rsquo;s <i>original</i> {domainA.name} classifier is
            re-attached to whatever its layers have become, and re-scored on
            {' '}{domainA.name} photos it never trained on. Under partial tuning
            those layers are byte-for-byte unchanged, so the score cannot move.
            Under full tuning they have shifted to suit {domainB?.name}, and the
            old classifier no longer fits the features it was built for.
          </p>

          {bothDone && (
            <div className="banner">
              <b>Both modes, one trade.</b> Full fine-tuning has more capacity and
              can beat partial on the new job — especially with plenty of data.
              It pays for that with everything it already knew. With a small
              dataset you usually get the bill without the benefit, which is why
              &ldquo;freeze the backbone&rdquo; is the default in industry, not a
              beginner&rsquo;s shortcut.
            </div>
          )}
        </div>
      )}

      {coach && (
        <div className={`banner ${coach.diagnosis.kind === 'catastrophic_forgetting' ? 'bad' : ''}`}>
          <b>{coach.say}</b>
          {coach.insight && <div className="small muted" style={{ marginTop: 6 }}>{coach.insight}</div>}
        </div>
      )}

      {error && <div className="banner bad">{error}</div>}

      <Gate
        hint="Run both tuning modes to continue."
        ready={bothDone}
        onNext={next}
        label="One last kind of model"
      />
    </>
  );
}
