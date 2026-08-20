import { useRef, useState } from 'react';
import { FlaskConical, Square } from 'lucide-react';
import { useChiti } from '../lib/chiti/ChitiProvider.jsx';
import { trainFromScratch, SCRATCH_CARD, compareThree } from '../lib/ml/scratchNet.js';
import {
  LossCurve, Stat, StatRow, pct,
} from './ui.jsx';

/**
 * ScratchControl -- Lab A's control condition.
 *
 * Runs the same experiment with the pretrained backbone taken away. Same
 * photos, same held-out split, everything starting from random noise.
 *
 * The gap between the two numbers is the only thing on this screen that
 * matters, and it is the honest version of the blueprint's "10 images -> 20%"
 * claim: that number is real, it just belongs to *this* model, not to the one
 * the student trained a moment ago.
 */
export default function ScratchControl({ dataset, headRun, fullRun = null }) {
  const chiti = useChiti();
  const [phase, setPhase] = useState('idle');
  const [curve, setCurve] = useState([]);
  const [epochTotal, setEpochTotal] = useState(0);
  const [run, setRun] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const split = headRun?.split;
  const images = dataset?.images;
  const canRun = !!(split?.trainSources?.length && images?.length);

  const start = async () => {
    setPhase('training');
    setError(null);
    setCurve([]);
    setRun(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const finished = await trainFromScratch({
        images,
        labels: dataset.imageLabels,
        labelNames: dataset.labels,
        trainSources: split.trainSources,
        testSources: split.testSources,
        onEpoch: ({ epoch, loss, accuracy, total }) => {
          setEpochTotal(total);
          setCurve((c) => [...c, { epoch, loss, accuracy }]);
        },
        signal: controller.signal,
      });

      if (!finished) { setPhase('idle'); return; }
      setRun(finished);
      setPhase('done');

      const gap = (headRun.accuracy.test - finished.accuracy.test) * 100;
      chiti.say(
        `From scratch, on the same ${split.trainSources.length} photos and the same test set, `
        + `it managed ${Math.round(finished.accuracy.test * 100)} percent. The head on the `
        + `frozen backbone got ${Math.round(headRun.accuracy.test * 100)}. `
        + (gap > 15
          ? `That ${Math.round(gap)} point gap is what somebody else's 1.2 million photographs are worth.`
          : 'Closer than usual — with this many images and this few classes, the head has less of an advantage.'),
        { key: `scratch:${finished.runId}` },
      );
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  };

  const rows = compareThree({ scratch: run, head: headRun, full: fullRun });

  return (
    <div className="card">
      <div className="btn-row" style={{ marginBottom: 10 }}>
        <FlaskConical size={18} color="var(--info)" />
        <h3 style={{ margin: 0 }}>The control: take the pretrained model away</h3>
      </div>

      <p className="muted">
        {SCRATCH_CARD.blurb} {SCRATCH_CARD.teaches}
      </p>

      {!canRun && (
        <div className="banner warn">
          Train a model above first — the control has to use{' '}
          <b>exactly the same photos and the same held-out set</b>, or the two
          numbers would differ for two reasons at once and the comparison would
          mean nothing.
        </div>
      )}

      {canRun && (
        <>
          <div className="banner">
            Same <b>{split.trainSources.length}</b> training photos.
            Same <b>{split.testSources.length}</b> held-out photos.
            Same classes. The only difference is that this one has never seen a
            photograph before in its life.
          </div>

          <div className="btn-row">
            <button type="button" className="btn primary" onClick={start} disabled={phase === 'training'}>
              {phase === 'training' ? <span className="spinner" /> : <FlaskConical size={15} />}
              {phase === 'training' ? 'Learning from nothing…' : 'Train one from scratch'}
            </button>
            {phase === 'training' && (
              <button type="button" className="btn ghost" onClick={() => abortRef.current?.abort()}>
                <Square size={14} /> Stop
              </button>
            )}
          </div>
        </>
      )}

      {curve.length > 0 && (
        <>
          <LossCurve curve={curve} total={epochTotal} />
          <p className="small muted">
            Watch the shape, not just the end point. This curve usually crawls —
            it is learning what an edge is at the same time as learning what a
            {' '}{dataset?.labels?.[0]} is.
          </p>
        </>
      )}

      {run && (
        <StatRow>
          <Stat k="From scratch" v={pct(run.accuracy.test)} tone={run.accuracy.test >= 0.5 ? 'warn' : 'bad'} />
          <Stat k="Head on frozen CNN" v={pct(headRun.accuracy.test)} tone="good" />
          <Stat
            k="Gap"
            v={`${Math.round((headRun.accuracy.test - run.accuracy.test) * 100)} pts`}
          />
          <Stat k="Weights trained" v={run.paramCount.toLocaleString()} />
        </StatRow>
      )}

      {rows.length > 1 && (
        <div className="scroll-x">
          <table className="matrix">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>How it learned</th>
                <th>On unseen photos</th>
                <th>On its homework</th>
                <th>Weights it changed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="rowhead">
                    {r.label}
                    <br />
                    <span className="small muted">{r.note}</span>
                  </td>
                  <td style={{
                    color: r.testAccuracy >= 0.8 ? 'var(--good)'
                      : r.testAccuracy >= 0.5 ? 'var(--warn)' : 'var(--bad)',
                  }}
                  >
                    {r.testAccuracy == null ? '—' : pct(r.testAccuracy)}
                  </td>
                  <td>{r.trainAccuracy == null ? '—' : pct(r.trainAccuracy)}</td>
                  <td>{r.paramCount == null ? '—' : r.paramCount.toLocaleString()}</td>
                </tr>
              ))}
              {!fullRun && (
                <tr>
                  <td className="rowhead">
                    Full fine-tune
                    <br />
                    <span className="small muted">All 25.6 million weights rewritten.</span>
                  </td>
                  <td className="muted">—</td>
                  <td className="muted">—</td>
                  <td className="muted">25,600,000</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {run && (
        <div className="banner good">
          <b>This is what a pretrained backbone is worth.</b> Nobody trains from
          scratch any more, and this row is why. The expensive part — learning
          what edges, textures and shapes are — was paid for once, on 1.2
          million photographs, by somebody else. You reused it for free and
          fitted {headRun.paramCount.toLocaleString()} numbers on top.
        </div>
      )}

      {!fullRun && run && (
        <p className="small muted">
          The third row is empty because those models are not built yet — they
          are trained offline, all 25.6 million weights, one per data volume.
          Nothing is guessed in the meantime.
        </p>
      )}

      {error && <div className="banner bad">{error}</div>}
    </div>
  );
}
