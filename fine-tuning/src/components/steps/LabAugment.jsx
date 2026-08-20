import { useEffect, useMemo, useState } from 'react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate } from '../../lib/guide/script.js';
import { TRANSFORMS, variantsOf, multiplier } from '../../lib/ml/augment.js';
import TrainPanel from '../TrainPanel.jsx';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import { Gate, pct } from '../ui.jsx';

/**
 * Step 8 -- Lab B. Making data out of data.
 *
 * The controlled-comparison rule: the "did augmentation help?" verdict in
 * diagnose.js only fires when the immediately previous run used the *same*
 * dataset and the *same* real-image count with augmentation off. Anything else
 * is two changes at once, and the honest answer would be "we cannot tell".
 * The UI enforces it by pinning the data volume across both runs.
 *
 * The preview strip is not decoration either -- seeing a flipped photo appear
 * is what makes "the model has genuinely never seen this exact grid of numbers"
 * believable, and it is also where a student notices that flipping some things
 * (a digit, a letter, a road sign) produces nonsense.
 */
export default function LabAugment() {
  const { primaryId, datasets, next } = useFlow();
  const chiti = useChiti();
  const { done } = useLesson();
  const [active, setActive] = useState({ flip: false, rotate: false, brightness: false });
  const [history, setHistory] = useState([]);

  // A baseline with everything off, then a run with transforms on -- in that
  // order. Reporting the augmented run first would let the lesson advance past
  // a comparison the student has not actually made.
  useEffect(() => {
    if (history.some((h) => h.mult === 1)) done(TASKS.TRAINED);
    if (history.some((h) => h.mult === 1) && history.some((h) => h.mult > 1)) {
      done(TASKS.AUGMENTED);
    }
  }, [history, done]);

  const dataset = primaryId ? datasets[primaryId] : null;
  const mult = multiplier(active);

  // One real image, shown as every variant the current settings produce.
  const previews = useMemo(() => {
    if (!dataset?.images?.length) return [];
    return variantsOf(dataset.images[0], active);
  }, [dataset, active]);

  if (!dataset) {
    return (
      <div className="card">
        <div className="banner warn">
          No dataset loaded. Go back to <b>Specialist school</b> and pick one first.
        </div>
      </div>
    );
  }

  const anyOn = mult > 1;
  const hasBaseline = history.some((h) => h.mult === 1);

  return (
    <>
      <div className="card">
        <p>
          You have {dataset.count} photos and no way to get more. But you can
          change the ones you have: mirror them, tilt them, brighten them. To the
          model each one is a grid of numbers it has never seen before.
        </p>

        <Spot id="lab-controls" className="grid3" style={{ marginTop: 14 }}>
          {TRANSFORMS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`toggle${active[t.id] ? ' on' : ''}`}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6, textAlign: 'left' }}
              onClick={() => setActive((a) => ({ ...a, [t.id]: !a[t.id] }))}
            >
              <div className="btn-row" style={{ gap: 8 }}>
                <span className="toggle-box" />
                <b>{t.icon} {t.label}</b>
              </div>
              <span className="small muted">{t.blurb}</span>
              <span className="small" style={{ color: 'var(--info)' }}>{t.justification}</span>
            </button>
          ))}
        </Spot>

        <div className="banner" style={{ marginTop: 14 }}>
          <b>{dataset.count} real photos → {dataset.count * mult} for the model to study.</b>
          {' '}
          {anyOn
            ? 'That is a ×' + mult + ' multiplier, and it cost you nothing but a few seconds of compute.'
            : 'Nothing is on yet — this run is your baseline.'}
        </div>

        {!dataset.hasPixels && dataset.origin === 'installed' && (
          <div className="banner" style={{ marginTop: 14 }}>
            The installed sets ship as <b>embeddings, not photos</b> — 26 MB of
            vectors instead of gigabytes of JPEGs. The transforms below are
            still real: all six variants were rendered and embedded when the
            dataset was built, so toggling one selects genuine embeddings of a
            genuinely flipped image. There is just no picture here to show you.
            Load your own folder if you want to watch it happen.
          </div>
        )}

        {previews.length > 0 && (
          <>
            <h4>One photo, every variant</h4>
            <div className="thumbs">
              {previews.map((c, i) => (
                <img
                  key={i}
                  src={c.toDataURL()}
                  alt={i === 0 ? 'the original' : `variant ${i}`}
                  style={i === 0 ? { outline: '2px solid var(--accent)' } : undefined}
                />
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              The outlined one is real. The rest are free.{' '}
              {active.flip && (
                <>Worth thinking about: a mirrored flower is a perfectly ordinary
                flower, but a mirrored <b>7</b> or a mirrored road sign is not.
                Augmentation only helps when the change you invent is one that
                really happens.</>
              )}
            </p>
          </>
        )}
      </div>

      {!hasBaseline && (
        <div className="banner warn">
          Train once with everything <b>off</b> first. Without a baseline on the
          same photos there is nothing to compare against, and &ldquo;it went
          up&rdquo; would just be a guess.
        </div>
      )}

      <TrainPanel
        dataset={dataset}
        augmentation={active}
        onRun={(run) => setHistory((h) => [...h, {
          mult,
          on: TRANSFORMS.filter((t) => active[t.id]).map((t) => t.label),
          trained: run.trainCount,
          test: run.accuracy.test,
        }])}
        cta={anyOn ? `Train on ${dataset.count * mult} images` : 'Train the baseline'}
      />

      {history.length > 0 && (
        <div className="card">
          <h3>Your runs</h3>
          <div className="scroll-x">
            <table className="matrix">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Transforms</th>
                  <th>Multiplier</th>
                  <th>Images studied</th>
                  <th>On unseen photos</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td className="rowhead">{h.on.length ? h.on.join(' + ') : 'none (baseline)'}</td>
                    <td>×{h.mult}</td>
                    <td>{h.trained}</td>
                    <td style={{ color: h.test >= 0.8 ? 'var(--good)' : h.test >= 0.5 ? 'var(--warn)' : 'var(--bad)' }}>
                      {pct(h.test)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            Note what the test column is measured on: <b>only original,
            un-augmented photos</b>, and only ones the model never trained on.
            If flipped copies were allowed into the test set, augmentation would
            appear to work brilliantly every single time — by marking its own
            homework.
          </p>
        </div>
      )}

      <Gate
        hint="Train a baseline, then train again with transforms on."
        ready={history.length >= 2 && hasBaseline}
        onNext={next}
        label="How much of the brain to unlock"
      />
    </>
  );
}
