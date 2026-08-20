import { useEffect, useState } from 'react';
import { Wand2 } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate, react } from '../../lib/guide/script.js';
import { classifyAndEmbed } from '../../lib/ml/backbone.js';
import { predictWith } from '../../lib/ml/head.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import { Visual } from '../visuals/index.jsx';
import LibraryImageDrop from '../LibraryImageDrop.jsx';
import {
  PredictionBars, Gate, pct,
} from '../ui.jsx';

/**
 * Step 6 -- the boundary test. Predict first, then look.
 *
 * The predict-first mechanic is not a gimmick. Being wrong about what the model
 * will do is what makes the result stick; being shown the result and told why
 * mostly does not. So the guess is recorded before the button unlocks, and the
 * screen afterwards says which of the three the student picked.
 *
 * The generalist is run on the same out-of-domain photo alongside, because the
 * honest conclusion is not "the specialist is worse". It is that the specialist
 * traded away breadth for depth, and here is the invoice.
 */
const GUESSES = [
  { id: 'refuse', label: 'It will say it does not know' },
  { id: 'low', label: 'It will guess, but with low confidence' },
  { id: 'confident', label: 'It will be confidently wrong' },
];

export default function BoundaryTest() {
  const { specialist, primaryId, next } = useFlow();
  const chiti = useChiti();
  const { beat, done } = useLesson();
  const [image, setImage] = useState(null);
  const [guess, setGuess] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [busy, setBusy] = useState(false);

  // Narration comes from the lesson script; this step reports tasks only.

  const run = async () => {
    if (!image || !specialist) return;
    setBusy(true);
    try {
      // One forward pass, both answers -- the specialist's head runs on the
      // features, and the generalist's 1,000-way logits come out of the same
      // run. This screen shows them side by side, so computing them separately
      // would be two waits for numbers the model produced together.
      const { predictions, features } = await classifyAndEmbed(image, 3);
      setAnswer(await predictWith(specialist, features));
      setBaseline(predictions);
      done(TASKS.BOUNDARY_TESTED);
    } finally {
      setBusy(false);
    }
  };

  const top = answer?.[0];
  const wasConfident = top && top.score >= 0.6;

  return (
    <>
      <div className="card">
        <p>
          Your specialist knows <b>{specialist?.labels.join(', ')}</b> and
          nothing else. Show it something from a completely different category —
          a mushroom if you trained on flowers, your shoe, anything at all.
        </p>

        <div className="grid2">
          <div>
            <Spot id="boundary-drop">
              <LibraryImageDrop
                image={image}
                onImage={(img) => { setImage(img); setAnswer(null); setBaseline(null); }}
                hint="Drop something it was never trained on"
              />
            </Spot>
          </div>

          <div>
            <h4>First — what do you think happens?</h4>
            <Spot id="guess-box" style={{ display: 'grid', gap: 8 }}>
              {GUESSES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`toggle${guess === g.id ? ' on' : ''}`}
                  onClick={() => { setGuess(g.id); done(TASKS.GUESSED); }}
                  disabled={!!answer}
                >
                  <span className="toggle-box" />
                  <span className="nm">{g.label}</span>
                </button>
              ))}
            </Spot>

            <div className="btn-row" style={{ marginTop: 14 }}>
              <button type="button" className="btn primary" onClick={run} disabled={!image || !guess || busy}>
                {busy ? <span className="spinner" /> : <Wand2 size={15} />}
                Find out
              </button>
            </div>
            {!guess && image && <p className="small muted">Make a guess first — it is worth committing.</p>}
          </div>
        </div>
      </div>

      {answer && (
        <div className="card">
          <h3>What actually happened</h3>

          <div className="grid2">
            <div>
              <h4>Your specialist</h4>
              <PredictionBars predictions={answer} max={4} />
              <div className={`banner ${wasConfident ? 'bad' : 'warn'}`}>
                <b>{top.label}</b>, {pct(top.score)} confident — and wrong.
                {' '}
                {wasConfident
                  ? 'Not hedging, not unsure. It has no way to say "none of the above", '
                    + 'because "none of the above" was never one of its options.'
                  : 'At least it is uncertain. But it still had to pick one of its own '
                    + 'labels, because those are the only answers it can produce.'}
                {guess === 'refuse' && ' You guessed it would decline — models generally cannot. '
                  + 'A classifier always returns a distribution over its own classes.'}
                {guess === 'confident' && wasConfident && ' You called it.'}
              </div>
            </div>

            <div>
              <h4>The original generalist, same photo</h4>
              {baseline && <PredictionBars predictions={baseline} max={3} />}
              <p className="small muted">
                Still there, still knows a thousand things, still broadly right.
                Fine-tuning did not make the model worse — it made a{' '}
                <b>different</b> model, one that traded a thousand shallow
                answers for {specialist?.labels.length} deep ones.
              </p>
            </div>
          </div>

          {beat?.show && <Visual name={beat.show} />}

          <div className="banner">
            <b>Confidence is not correctness.</b> A high percentage means the
            model found this image more like one of its classes than the others.
            It says nothing about whether the right answer was ever on the menu.
          </div>
        </div>
      )}

      <Gate
        hint="Guess, then test, to continue."
        ready={!!answer}
        onNext={next}
        label="Into the labs"
      />
    </>
  );
}
