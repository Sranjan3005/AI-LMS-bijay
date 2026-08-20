import { useEffect, useMemo, useState } from 'react';
import { Sliders, Cpu, LineChart } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import { Visual, VideoSlot } from '../visuals/index.jsx';
import { labelCountsOf } from '../../lib/ml/datasets.js';
import TrainPanel from '../TrainPanel.jsx';
import { RECOMMENDED } from '../../lib/chiti/lesson.js';
import { Gate, pct } from '../ui.jsx';

/**
 * Step 7 -- Lab A. How much data is enough?
 *
 * Bench layout, same three-beat shape as the training step: set the variable,
 * run it, read the consequence. Here the consequence is a *curve*, which only
 * means anything once there are two points on it -- so the third panel stays
 * empty until the student has run at least twice, and says so.
 *
 * The ladder is capped at what the dataset actually holds. Offering "1000 per
 * class" and quietly training on 90 would put a real measured accuracy under a
 * number the student never got, which is the one thing this module cannot do.
 */

const LADDER = [1, 2, 5, 10, 25, 50, 100, 250];

export default function LabData() {
  const { primaryId, datasets, next } = useFlow();
  const { done } = useLesson();
  const [rung, setRung] = useState(0);
  const [history, setHistory] = useState([]);

  const dataset = primaryId ? datasets[primaryId] : null;

  const ceiling = useMemo(() => {
    if (!dataset) return 0;
    return Math.min(...Object.values(labelCountsOf(dataset)));
  }, [dataset]);

  const rungs = useMemo(() => {
    const usable = LADDER.filter((n) => n < ceiling);
    return ceiling ? [...usable, ceiling] : [];
  }, [ceiling]);

  const perClass = rungs[Math.min(rung, rungs.length - 1)] ?? ceiling;

  // Two runs at *different* sizes is what makes a curve. Two at the same size
  // is a repeat, and reporting it as progress would teach the wrong thing.
  useEffect(() => {
    if (history.length >= 1) done(TASKS.TRAINED);
    if (new Set(history.map((h) => h.perClass)).size >= 2) done(TASKS.TRAINED_TWICE);
  }, [history, done]);

  if (!dataset) {
    return (
      <div className="card">
        <div className="banner warn">
          No dataset loaded. Go back to <b>Specialist school</b> and pick one first.
        </div>
      </div>
    );
  }

  // A dataset the backbone already nails saturates almost immediately, and
  // then this lab teaches nothing. Say so rather than letting them run six
  // trainings and conclude data volume does not matter.
  const pickFor = RECOMMENDED.lab_data;
  const offPiste = pickFor && dataset.dataset_id !== pickFor.id;

  const sizes = new Set(history.map((h) => h.perClass));
  const best = history.length ? Math.max(...history.map((h) => h.test)) : 0;

  return (
    <>
      {offPiste && (
        <div className="banner warn">
          You are on <b>{dataset.name}</b>. That will work, but the curve may be
          flat — a set the model finds easy is already near its ceiling at one
          image per class, and then there is nothing to see.
          <div className="small" style={{ marginTop: 6 }}>
            For this lab, open the Data Library and switch to{' '}
            <b>{pickFor.id}</b> — {pickFor.why}.
          </div>
        </div>
      )}

      <div className="bench">
        {/* ------------------------------------------------ 1. the variable */}
        <Spot id="lab-controls" className={`bench-col ${history.length ? 'is-done' : 'is-target'}`}>
          <div className="bench-head">
            <span className="bench-num">1</span>
            <Sliders size={15} color="var(--info)" />
            <h4>How much data</h4>
          </div>
          <div className="bench-body">
            <p className="small muted" style={{ marginBottom: 4 }}>
              Everything else stays fixed. The only thing you are changing is how
              many examples of each class it gets to study.
            </p>

            <input
              type="range"
              min={0}
              max={Math.max(0, rungs.length - 1)}
              step={1}
              value={Math.min(rung, rungs.length - 1)}
              onChange={(e) => setRung(Number(e.target.value))}
            />
            <div className="volume-ticks">
              {rungs.map((n) => <span key={n}>{n}</span>)}
            </div>

            <div className="banner" style={{ margin: '8px 0 0' }}>
              <b>{perClass} per class</b> — {perClass * dataset.labels.length} images
              {perClass === ceiling && (
                <div className="small muted" style={{ marginTop: 5 }}>
                  That is everything the smallest class has. The slider stops
                  here rather than promising data that does not exist.
                </div>
              )}
            </div>

            {sizes.size === 1 && (
              <div className="small muted" style={{ marginTop: 'auto' }}>
                Now move the slider and train again — one point is not a curve.
              </div>
            )}
          </div>
        </Spot>

        {/* ------------------------------------------------ 2. the training */}
        <div className={`bench-col ${history.length ? 'is-done' : ''}`}>
          <div className="bench-head">
            <span className="bench-num">2</span>
            <Cpu size={15} color="var(--accent)" />
            <h4>Train it</h4>
          </div>
          <div className="bench-body">
            <TrainPanel
              dataset={dataset}
              perClass={perClass}
              bare
              cta={`Train on ${perClass} per class`}
              onRun={(run) => setHistory((h) => [...h, {
                perClass,
                total: run.trainCount,
                train: run.accuracy.train,
                test: run.accuracy.test,
              }])}
            />
          </div>
        </div>

        {/* -------------------------------------------------- 3. the result */}
        <div className={`bench-col ${sizes.size >= 2 ? 'is-target' : 'is-idle'}`}>
          <div className="bench-head">
            <span className="bench-num">3</span>
            <LineChart size={15} color="var(--good)" />
            <h4>What changed</h4>
          </div>
          <div className="bench-body">
            {history.length === 0 ? (
              <p className="small muted" style={{ margin: 'auto', textAlign: 'center' }}>
                Run it once and the numbers land here.
              </p>
            ) : (
              <>
                <Curve history={history} />
                <div className="scroll-x">
                  <table className="matrix">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Per class</th>
                        <th>Homework</th>
                        <th>Unseen</th>
                        <th>Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={`${h.perClass}-${i}`}>
                          <td className="rowhead">{h.perClass}</td>
                          <td>{pct(h.train)}</td>
                          <td style={{ color: h.test === best ? 'var(--good)' : undefined }}>
                            {pct(h.test)}
                          </td>
                          <td>{Math.round((h.train - h.test) * 100)} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="small muted" style={{ marginBottom: 0 }}>
                  The <b>Unseen</b> column is the only one that matters. The gap
                  beside it is how much the model simply memorised.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid2">
        <Visual name="data-volume" />
        <VideoSlot name="data-volume" title="Why more examples help">
          Split screen: three dots with a wildly wobbling boundary, versus two
          hundred dots with one confident curve. See VIDEOS.md.
        </VideoSlot>
      </div>

      <Gate
        hint="Train at two different sizes to continue."
        ready={sizes.size >= 2}
        onNext={next}
        label="But what if you have no more photos?"
      />
    </>
  );
}

/** The measured curve. Points only — no line of best fit, nothing implied. */
function Curve({ history }) {
  const pts = [...history].sort((a, b) => a.perClass - b.perClass);
  if (pts.length < 2) return null;

  const W = 300;
  const H = 110;
  const pad = 26;
  const maxN = Math.max(...pts.map((p) => p.perClass));
  const x = (n) => pad + (Math.log(n) / Math.log(maxN)) * (W - pad * 2);
  const y = (v) => H - pad - v * (H - pad * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label="Accuracy against data volume">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.15)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(255,255,255,.15)" />
      <polyline
        fill="none"
        stroke="#30d158"
        strokeWidth="2"
        points={pts.map((p) => `${x(p.perClass)},${y(p.test)}`).join(' ')}
      />
      {pts.map((p) => (
        <circle key={p.perClass} cx={x(p.perClass)} cy={y(p.test)} r="3.5" fill="#30d158" />
      ))}
      <text x={pad} y={H - 8} fontSize="9" fill="#9aa0b5">few</text>
      <text x={W - pad} y={H - 8} fontSize="9" fill="#9aa0b5" textAnchor="end">many</text>
      <text x={pad - 6} y={pad + 4} fontSize="9" fill="#9aa0b5" textAnchor="end">100%</text>
    </svg>
  );
}
