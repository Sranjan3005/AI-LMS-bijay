import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Gamepad2, Globe2, RotateCcw, PlayCircle } from 'lucide-react';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Speak AI — learn the words first (video + glossary), THEN play the match game.
 * Steps: ① Learn (video demo + all 12 terms) → ② Match (tap-to-pair game) → ③ In real life.
 */

// video slot — drop the AI-generated "AI vocabulary" clip here when ready (see plan Appendix A6)
const VIDEO = '';

const PAIRS = [
  { t: 'Model',          d: 'The “brain” a computer builds after studying data' },
  { t: 'Training',       d: 'The practice phase where the model studies examples' },
  { t: 'Dataset',        d: 'The big collection of examples the model studies' },
  { t: 'Label',          d: 'The correct answer attached to an example' },
  { t: 'Feature',        d: 'One clue/measurement the model looks at (like height or colour)' },
  { t: 'Prediction',     d: 'The model’s best guess about something it hasn’t seen' },
  { t: 'Accuracy',       d: 'How often the model’s guesses are right' },
  { t: 'Bias',           d: 'Unfairness that sneaks in when the examples are one-sided' },
  { t: 'Overfitting',    d: 'Memorising the practice questions but failing the real exam' },
  { t: 'Neural network', d: 'A model made of many tiny connected decision-makers' },
  { t: 'Algorithm',      d: 'The step-by-step recipe a computer follows' },
  { t: 'AI agent',       d: 'An AI that plans steps and uses tools to finish a task' },
];

const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

const STEPS = [
  { key: 'learn', label: 'Learn the words', icon: <BookOpen size={15} /> },
  { key: 'match', label: 'Match them', icon: <Gamepad2 size={15} /> },
  { key: 'real', label: 'In real life', icon: <Globe2 size={15} /> },
];

/* ── Step 1: learn ── */
function Learn() {
  const isYouTube = typeof VIDEO === 'string' && VIDEO.includes('youtube');
  return (
    <div className={s.card}>
      {VIDEO ? (
        <>
          <div className={s.videoWrap}>
            {isYouTube ? <iframe src={VIDEO} title="AI vocabulary" allowFullScreen /> : <video src={VIDEO} controls playsInline />}
          </div>
          <p className={s.videoNote}>Watch first — these are the words every AI builder uses. Then read them once more below.</p>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderRadius: 12, background: 'rgba(100,210,255,.06)', border: '1px dashed rgba(100,210,255,.35)', marginBottom: 18 }}>
          <PlayCircle size={20} color="#64D2FF" />
          <span className={s.muted} style={{ fontSize: '.92rem' }}>A short video that teaches these words is coming here soon. For now, read them below — then play the match game.</span>
        </div>
      )}
      <h3 style={{ margin: '4px 0 6px' }}>The 12 words of AI</h3>
      <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.6 }}>Read each one — you&apos;ll match them from memory in the next step.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
        {PAIRS.map(p => (
          <div key={p.t} className={s.rlCard}>
            <h4 style={{ color: '#64D2FF' }}>{p.t}</h4>
            <p>{p.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: match game ── */
function Match() {
  const rounds = useMemo(() => {
    const p = shuffle(PAIRS);
    return [p.slice(0, 4), p.slice(4, 8), p.slice(8, 12)];
  }, []);
  const [round, setRound] = useState(0);
  const [selTerm, setSelTerm] = useState(null);
  const [matched, setMatched] = useState({});
  const [wrongFlash, setWrongFlash] = useState(null);
  const [misses, setMisses] = useState(0);
  const [restartKey, setRestartKey] = useState(0);

  const pairs = rounds[Math.min(round, 2)];
  const defs = useMemo(() => shuffle(pairs), [pairs, restartKey]);
  const roundDone = pairs.every(p => matched[p.t]);
  const allDone = round === 2 && roundDone;

  const pickDef = (d) => {
    if (!selTerm || matched[selTerm]) return;
    const pair = pairs.find(p => p.t === selTerm);
    if (pair.d === d) { setMatched(m => ({ ...m, [selTerm]: true })); setSelTerm(null); }
    else { setMisses(x => x + 1); setWrongFlash(d); setTimeout(() => setWrongFlash(null), 400); }
  };
  const nextRound = () => { setRound(r => r + 1); setSelTerm(null); };
  const restart = () => { setRound(0); setSelTerm(null); setMatched({}); setMisses(0); setRestartKey(k => k + 1); };

  return (
    <div className={s.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <span className={s.muted}>Round {Math.min(round + 1, 3)} of 3 — tap a word, then tap its meaning</span>
        <span className={s.score}>Misses: {misses}</span>
      </div>

      {!allDone ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) 2fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pairs.map(p => (
              <button key={p.t} className={`${s.pillBtn} ${selTerm === p.t ? s.pillOn : ''}`}
                style={{ justifyContent: 'center', opacity: matched[p.t] ? 0.35 : 1, textDecoration: matched[p.t] ? 'line-through' : 'none' }}
                disabled={!!matched[p.t]} onClick={() => setSelTerm(p.t)}>{p.t}</button>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {defs.map(p => {
              const isMatched = matched[p.t];
              return (
                <button key={p.d} className={s.opt}
                  style={{ marginBottom: 0, opacity: isMatched ? 0.35 : 1,
                    borderColor: wrongFlash === p.d ? '#ff453a' : isMatched ? '#30d158' : undefined,
                    background: isMatched ? 'rgba(48,209,88,.1)' : undefined }}
                  disabled={isMatched} onClick={() => pickDef(p.d)}>{p.d}</button>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '18px 0' }}>
          <div style={{ fontSize: '3rem' }}>{misses <= 3 ? '🏆' : '🎉'}</div>
          <h3 style={{ fontSize: '1.4rem', margin: '8px 0' }}>All 12 words matched!</h3>
          <p className={s.muted} style={{ maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.6 }}>
            {misses <= 3 ? 'Barely any misses — you already speak AI.' : `You got there with ${misses} misses — one more round and it sticks.`}
          </p>
          <button className={`${s.navBtn} ${s.navGhost}`} onClick={restart}><RotateCcw size={15} /> Shuffle &amp; play again</button>
        </div>
      )}

      {roundDone && !allDone && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button className={s.navBtn} onClick={nextRound}>Next 4 words →</button>
        </div>
      )}
    </div>
  );
}

const TermMatch = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const cur = STEPS[step].key;

  return (
    <div className={s.page} style={{ '--acc': '#64D2FF' }}>
      <div className={s.top}>
        <button className={s.back} onClick={onBack}><ArrowLeft size={16} /> Back to my flow</button>
      </div>
      <div className={s.head}>
        <span className={s.eyebrow}>Working with Data · Vocabulary</span>
        <h1>Speak AI — <span className="grad" style={{ background: 'linear-gradient(120deg,#5E5CE6,#BF5AF2 52%,#64D2FF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>word match.</span></h1>
        <p className={s.lede}>First learn the words every AI builder uses — then match them from memory, 4 at a time.</p>
      </div>

      <div className={s.stepsNav}>
        {STEPS.map((st, i) => (
          <button key={st.key} className={`${s.stepBtn} ${i === step ? s.stepOn : ''}`} onClick={() => setStep(i)}>
            <span className={s.stepNum}>{i + 1}</span>{st.icon}{st.label}
          </button>
        ))}
      </div>

      <div className={s.body}>
        {cur === 'learn' && <Learn />}
        {cur === 'match' && <Match />}
        {cur === 'real' && (
          <div className={s.card}>
            <div className={s.rlGrid}>
              <div className={s.rlCard}><div className={s.rlIcon}>🗣️</div><h4>Use them out loud</h4><p>Next time you train a model, narrate it: “my DATASET… my FEATURES… my model’s ACCURACY…”</p></div>
              <div className={s.rlCard}><div className={s.rlIcon}>📰</div><h4>Decode headlines</h4><p>“AI model shows bias” — you now know exactly what all three of those words mean.</p></div>
              <div className={s.rlCard}><div className={s.rlIcon}>👩‍🏫</div><h4>Teach someone</h4><p>Explain “overfitting” to a friend using the exam-memorisation story. Teaching it locks it in.</p></div>
            </div>
          </div>
        )}

        <div className={s.foot}>
          <button className={`${s.navBtn} ${s.navGhost}`} disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Previous
          </button>
          {step < STEPS.length - 1
            ? <button className={s.navBtn} onClick={() => setStep(step + 1)}>{step === 0 ? 'I know these — play!' : 'Next'} <ArrowRight size={16} /></button>
            : <button className={s.navBtn} onClick={onBack}>Finish <ArrowRight size={16} /></button>}
        </div>
      </div>
    </div>
  );
};

export default TermMatch;
