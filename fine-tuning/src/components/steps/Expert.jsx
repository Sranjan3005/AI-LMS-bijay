import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate } from '../../lib/guide/script.js';
import { embed, BASE_MODEL_CARD } from '../../lib/ml/backbone.js';
import { predictWith } from '../../lib/ml/head.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import LibraryImageDrop from '../LibraryImageDrop.jsx';
import {
  PredictionBars, Gate, pct,
} from '../ui.jsx';

/**
 * Step 5 -- same photo, same eyes, different answer.
 *
 * Both answers are shown side by side on purpose. The generalist's prediction
 * is not deleted or hidden; the student can see that the underlying model has
 * not been replaced, only re-labelled. That comparison is what makes the frozen
 * -backbone idea concrete rather than a claim in a diagram.
 */
export default function Expert() {
  const {
    probe, setProbe, baseAnswer, specialist, next,
  } = useFlow();
  const chiti = useChiti();
  const { done, fact } = useLesson();
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);

  // Both labels go to the script so its line can quote the real comparison.
  useEffect(() => {
    if (!answer?.length) return;
    fact('specialist', answer[0].label);
    if (baseAnswer?.length) fact('generalist', baseAnswer[0].label);
    done(TASKS.COMPARED);
  }, [answer, baseAnswer, fact, done]);

  const run = async () => {
    if (!probe || !specialist) return;
    setBusy(true);
    try {
      // Straight to embed(): it letterboxes and resamples internally, through
      // the same Pillow-compatible path Python uses. Rendering to a canvas
      // first would resample twice -- once badly -- and pull the features off
      // the ones the head was fitted on.
      const vec = await embed(probe.img);
      setAnswer(await predictWith(specialist, vec));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <p className="muted">
          Give it the same photo as before. Nothing about how the model sees has
          changed — the only new thing in the entire system is a layer with{' '}
          {specialist ? specialist.paramCount.toLocaleString() : 'a few thousand'} weights
          that was fitted on your images.
        </p>

        <div className="grid2">
          <div>
            <Spot id="expert-drop">
              <LibraryImageDrop
                image={probe?.img}
                onImage={(img, name) => { setProbe({ img, name }); setAnswer(null); }}
              />
            </Spot>
            <div className="btn-row" style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" onClick={run} disabled={!probe || !specialist || busy}>
                {busy ? <span className="spinner" /> : <Wand2 size={15} />}
                Ask the specialist
              </button>
            </div>
          </div>

          <div>
            <h4 className="muted">The generalist said</h4>
            {baseAnswer ? <PredictionBars predictions={baseAnswer} max={3} /> : <p className="small muted">—</p>}

            <h4 style={{ marginTop: 18 }}>The specialist says</h4>
            {answer ? (
              <>
                <PredictionBars predictions={answer} max={5} />
                <p className="small muted">
                  Notice it can only answer in{' '}
                  <b>{specialist?.labels.join(', ')}</b>. That is its entire
                  vocabulary now — smaller than the generalist&rsquo;s 1,000, and
                  far more useful for this one job. Remember that trade; the next
                  screen is about what it cost.
                </p>
              </>
            ) : <p className="small muted">Run it to see.</p>}
          </div>
        </div>
      </div>

      {answer && specialist && (
        <div className="card tight">
          <div className="banner good">
            Same pixels in. The same {BASE_MODEL_CARD.paramCount.toLocaleString()}{' '}
            frozen weights doing the looking. The only thing that changed is{' '}
            {specialist.paramCount.toLocaleString()} numbers on the end — about{' '}
            {((specialist.paramCount / BASE_MODEL_CARD.paramCount) * 100).toFixed(2)}%
            {' '}of the model. It scored {pct(specialist.accuracy.test)} on photos it
            had never seen
            {specialist.provenance?.kind === 'precomputed'
              ? ', measured on a held-out set when this head was built.'
              : `, after ${specialist.trainSeconds.toFixed(1)} seconds of training in your browser.`}
          </div>
        </div>
      )}

      <Gate
        hint="Run the specialist on your photo to continue."
        ready={!!answer}
        onNext={next}
        label="Now the interesting part"
      />
    </>
  );
}
