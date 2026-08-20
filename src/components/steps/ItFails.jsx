import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate } from '../../lib/guide/script.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import { Visual } from '../visuals/index.jsx';
import { Gate, PredictionBars } from '../ui.jsx';

/**
 * Step 3 -- the hook. Ask for the species and watch the vocabulary run out.
 *
 * THE HONEST VERSION OF THIS SCREEN.
 *
 * The original blueprint had the base model answer "Dog" and fail to name the
 * breed. That is not what ImageNet does: it contains about 120 dog breeds, so
 * ResNet-50 will happily say "golden retriever" and the hook collapses on
 * stage. It is genuinely thin on flower and mushroom *species* though -- a
 * handful of labels covering thousands of real ones -- which is why those are
 * the domains this module uses.
 *
 * So the failure demonstrated here is not "it was vague". It is the sharper and
 * more useful one: **it answered confidently in the only words it has, and the
 * word you wanted was never among them.** The student searches the model's
 * actual vocabulary and finds the absence themselves.
 */
export default function ItFails() {
  const { baseAnswer, probe, next } = useFlow();
  const chiti = useChiti();
  const { beat, done } = useLesson();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);

  // Narration comes from the lesson script; this step reports the task only.

  // The model's vocabulary is its 1,000 ImageNet labels. We only ever see the
  // ones it returns, so rather than shipping a copy of the list (and inviting
  // it to drift out of sync with the weights) the check is honest about what it
  // can and cannot prove.
  const answered = (baseAnswer || []).map((p) => p.label.toLowerCase());
  const hit = query.trim() && answered.some((l) => l.includes(query.trim().toLowerCase()));

  return (
    <>
      <div className="card">
        <p>
          The model gave its answer. Now try to get something more specific out
          of it — the exact species, the exact variety, the actual name you would
          write on a label.
        </p>

        <div className="grid2">
          <div>
            {probe && <img src={probe.img.src} alt="" style={{ width: '100%', borderRadius: 12 }} />}
          </div>
          <div>
            <h4>Everything it offered</h4>
            <PredictionBars predictions={baseAnswer || []} max={5} />

            <h4 style={{ marginTop: 18 }}>Is the word you want in there?</h4>
            <Spot id="vocab-search" className="btn-row">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
                placeholder="type the species you were after"
                style={{
                  flex: 1,
                  minWidth: 180,
                  padding: '10px 13px',
                  borderRadius: 11,
                  border: '1px solid var(--line-strong)',
                  background: 'var(--panel-2)',
                  color: 'var(--ink)',
                  font: 'inherit',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query.trim()) {
                    setSearched(true);
                    done(TASKS.SEARCHED_VOCAB);
                  }
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => { setSearched(true); done(TASKS.SEARCHED_VOCAB); }}
                disabled={!query.trim()}
              >
                <Search size={15} /> Look it up
              </button>
            </Spot>

            {searched && (
              hit ? (
                <div className="banner warn">
                  It did offer that one — so for this photo the generalist had
                  the word. That happens: ImageNet contains a few flower and
                  mushroom names, and about 120 dog breeds. Try something it is
                  less likely to know, or move on and see what a specialist
                  looks like.
                </div>
              ) : (
                <div className="banner bad">
                  <X size={14} style={{ verticalAlign: -2 }} />{' '}
                  <b>&ldquo;{query.trim()}&rdquo;</b> is not among the labels it
                  returned — and it never will be, because the model can only
                  answer in words it was trained on. It did not decline to
                  answer. It gave you its closest available label,{' '}
                  <b>{baseAnswer?.[0]?.label}</b>, with{' '}
                  {Math.round((baseAnswer?.[0]?.score ?? 0) * 100)}% confidence.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {beat?.show && (
        <div className="card tight">
          <Visual name={beat.show} wanted={query.trim() || undefined} />
        </div>
      )}

      <div className="card tight">
        <h4>This is the whole problem</h4>
        <p className="muted" style={{ marginBottom: 0 }}>
          A generalist is not a bad model. It is a model that was taught 1,000
          words, and no amount of asking will get a 1,001st out of it. If you
          want it to name species, somebody has to teach it species — which is
          exactly what you are about to do.
        </p>
      </div>

      <Gate
        hint="Search the model's answer for the word you wanted."
        ready={searched}
        onNext={next}
        label="Send it to specialist school"
      />
    </>
  );
}
