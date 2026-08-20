import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate, react } from '../../lib/guide/script.js';
import { classify } from '../../lib/ml/backbone.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import LibraryImageDrop from '../LibraryImageDrop.jsx';
import { pct, PredictionBars, Gate } from '../ui.jsx';

/**
 * Step 2 -- the generalist doing what it is good at.
 *
 * Whatever it says is what it said. There is no curated "correct" answer here
 * and no scripted line: Chiti reads back the actual top prediction and its
 * actual confidence. If the model gets it wrong on the student's photo, that is
 * a fine outcome and step 3 works even better.
 */
export default function ItWorks() {
  const { probe, setProbe, baseAnswer, setBaseAnswer, next } = useFlow();
  const chiti = useChiti();
  const { done, fact } = useLesson();
  const [busy, setBusy] = useState(false);

  // Feed the real prediction back so the script can quote it. Nothing here is
  // authored: {top} and {confidence} come straight from the model's output.
  useEffect(() => {
    if (!baseAnswer?.length) return;
    fact('top', baseAnswer[0].label);
    fact('confidence', pct(baseAnswer[0].score));
    done(TASKS.PREDICTED);
  }, [baseAnswer, fact, done]);

  const run = async () => {
    if (!probe) return;
    setBusy(true);
    try {
      const preds = await classify(probe.img, 5);
      setBaseAnswer(preds);
      if (preds[0].score < 0.4) {
        const r = react('low_confidence', { label: preds[0].label, score: preds[0].score });
        chiti.say(r.text, { key: r.key });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <p className="muted">
          Give it any photo. A plant, a mushroom, your bag, whatever is nearby.
          The model has never seen this particular image, so whatever comes back
          is genuinely a guess it is making right now.
        </p>

        <div className="grid2">
          <div>
            <Spot id="photo-drop">
              <LibraryImageDrop
                image={probe?.img}
                onImage={(img, name) => {
                  setProbe({ img, name });
                  setBaseAnswer(null);
                  done(TASKS.PHOTO_CHOSEN);
                }}
              />
            </Spot>
          </div>
          <div>
            <Spot id="predict-btn" className="btn-row">
              <button type="button" className="btn primary" onClick={run} disabled={!probe || busy}>
                {busy ? <span className="spinner" /> : <Wand2 size={15} />}
                {busy ? 'Looking…' : 'What is this?'}
              </button>
            </Spot>

            {baseAnswer && (
              <>
                <PredictionBars predictions={baseAnswer} max={5} />
                <p className="small muted">
                  Those are the five labels it rates highest, out of the 1,000 it
                  knows. The percentages are the model&rsquo;s own confidence —
                  they always add up across all 1,000, so a low top score means
                  it is spreading its bet.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <Gate
        hint="Run one prediction to continue."
        ready={!!baseAnswer}
        onNext={next}
        label="Now ask it something harder"
      />
    </>
  );
}
