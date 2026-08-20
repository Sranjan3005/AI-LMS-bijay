import { useEffect, useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { useFlow } from '../../lib/flowState.jsx';
import { useChiti } from '../../lib/chiti/ChitiProvider.jsx';
import { narrate } from '../../lib/guide/script.js';
import { toCanvas } from '../../lib/ml/augment.js';
import { useLesson } from '../../lib/chiti/LessonProvider.jsx';
import { TASKS } from '../../lib/chiti/lesson.js';
import { Spot } from '../../lib/chiti/Spotlight.jsx';
import LibraryImageDrop from '../LibraryImageDrop.jsx';
import { PredictionBars } from '../ui.jsx';

/**
 * Step 10 -- the reveal. One label is not the only thing a model can give back.
 *
 * The three tiers on this screen are the module in one frame, and two of the
 * three are filled in with results the student actually produced earlier:
 *   generalist   1,000 shallow labels        (their step 2 run)
 *   specialist   a few deep labels           (their step 5 run)
 *   multimodal   language about the image    (this screen)
 *
 * THE THIRD TIER NEEDS A BACKEND. This standalone build has none, so rather
 * than shipping a canned "AI response" it states plainly that the call is not
 * wired and shows the exact request it would make. When this ports into Stage1
 * it goes through the existing Azure OpenAI client in agentic_flow -- set
 * VITE_LLM_PROXY to try it against any endpoint that accepts the payload below.
 */

const ENDPOINT = import.meta.env?.VITE_LLM_PROXY || '';

const SUGGESTED = [
  'Is this safe to eat?',
  'What should I look for to tell it apart from similar ones?',
  'Where does this normally grow, and in which season?',
  'Write one sentence about this for a museum label.',
];

export default function Multimodal() {
  const { probe, setProbe, baseAnswer, specialist } = useFlow();
  const chiti = useChiti();
  const { done } = useLesson();
  const [question, setQuestion] = useState(SUGGESTED[0]);
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { chiti.say(narrate('multimodal'), { key: 'step:multimodal' }); }, [chiti]);

  const ask = async () => {
    if (!probe || !ENDPOINT) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const dataUrl = toCanvas(probe.img).toDataURL('image/jpeg', 0.85);
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, prompt: question }),
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const body = await res.json();
      setAnswer(body.text || body.answer || JSON.stringify(body));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <h3>Three models, one photo</h3>
        <div className="grid3">
          <div className="stat" style={{ padding: 16 }}>
            <div className="k">The generalist</div>
            <p className="small muted" style={{ margin: '6px 0' }}>1,000 labels, shallow</p>
            {baseAnswer
              ? <b>{baseAnswer[0].label}</b>
              : <span className="muted small">—</span>}
          </div>
          <div className="stat" style={{ padding: 16 }}>
            <div className="k">Your specialist</div>
            <p className="small muted" style={{ margin: '6px 0' }}>
              {specialist ? `${specialist.labels.length} labels, deep` : 'not trained'}
            </p>
            {specialist
              ? <b>{specialist.labels.join(' / ')}</b>
              : <span className="muted small">—</span>}
          </div>
          <div className="stat" style={{ padding: 16, borderColor: 'rgba(255,159,10,.5)' }}>
            <div className="k">A multimodal model</div>
            <p className="small muted" style={{ margin: '6px 0' }}>no labels at all</p>
            <b style={{ color: 'var(--accent)' }}>language</b>
          </div>
        </div>

        <p style={{ marginTop: 16 }}>
          Both of the models you have used answer the same question: <i>which of
          my classes is this?</i> They cannot answer anything else, because a
          probability over a list of labels is the only shape their output has.
        </p>
        <p className="muted">
          A multimodal model reads the picture and your sentence together, and
          answers in sentences. It was trained on images and text at the same
          time, so it can talk about what it sees rather than only sort it.
        </p>
      </div>

      <div className="card">
        <div className="grid2">
          <div>
            <LibraryImageDrop image={probe?.img} onImage={(img, name) => { setProbe({ img, name }); setAnswer(null); }} />
          </div>
          <div>
            <h4>Ask it something a label could never tell you</h4>
            <div style={{ display: 'grid', gap: 7, marginBottom: 12 }}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`toggle${question === q ? ' on' : ''}`}
                  style={{ padding: '9px 12px' }}
                  onClick={() => setQuestion(q)}
                >
                  <span className="toggle-box" />
                  <span className="nm small">{q}</span>
                </button>
              ))}
            </div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="or type your own"
              style={{
                width: '100%', padding: '10px 13px', borderRadius: 11,
                border: '1px solid var(--line-strong)', background: 'var(--panel-2)',
                color: 'var(--ink)', font: 'inherit',
              }}
            />
            <Spot id="mm-ask" className="btn-row" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn primary"
                onClick={() => { done(TASKS.ASKED_MULTIMODAL); ask(); }}
                disabled={!probe || !ENDPOINT || busy}
              >
                {busy ? <span className="spinner" /> : <Send size={15} />}
                Ask
              </button>
              {!ENDPOINT && (
                // Without a backend this beat could never be satisfied, and the
                // lesson would dead-end on its final step.
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => done(TASKS.ASKED_MULTIMODAL)}
                >
                  Skip — no server wired
                </button>
              )}
            </Spot>
          </div>
        </div>

        {!ENDPOINT && (
          <div className="banner warn">
            <b>Not wired in this standalone build.</b> A multimodal model needs a
            server; this module deliberately ships without one so that everything
            else here runs offline and free. Nothing fake is shown in its place.
            <div className="small muted" style={{ marginTop: 8 }}>
              To try it: set <code>VITE_LLM_PROXY</code> to any endpoint that
              accepts <code>{'{ image: dataUrl, prompt: string }'}</code> and
              returns <code>{'{ text: string }'}</code>. On the port into Stage1
              this goes through the existing Azure OpenAI client instead.
            </div>
          </div>
        )}

        {error && <div className="banner bad">The call failed: {error}</div>}

        {answer && (
          <div className="banner good">
            <MessageSquare size={15} style={{ verticalAlign: -3 }} /> {answer}
          </div>
        )}

        {baseAnswer && (
          <>
            <h4 style={{ marginTop: 18 }}>What the classifier said about the same photo</h4>
            <PredictionBars predictions={baseAnswer} max={3} />
            <p className="small muted">
              Neither is better. They answer different questions, and knowing
              which one your problem actually needs is most of the job.
            </p>
          </>
        )}
      </div>

      <div className="card">
        <h3>What you did today</h3>
        <ul className="plain">
          <li>Ran a real convolutional network trained on 1.2 million photographs, and found the edge of its vocabulary.</li>
          <li>Froze 25.6 million weights and fitted a few thousand on your own images — that is fine-tuning.</li>
          <li>Watched a specialist fail on the first thing outside its subject, confidently.</li>
          <li>Measured how accuracy moves with data volume, instead of being told.</li>
          <li>Multiplied a small dataset with transforms, and checked whether it actually helped.</li>
          <li>Unlocked a whole network and measured exactly what it forgot.</li>
        </ul>
        <p className="muted" style={{ marginBottom: 0 }}>
          Every number you saw was computed on your machine, from your data,
          while you watched.
        </p>
      </div>
    </>
  );
}
