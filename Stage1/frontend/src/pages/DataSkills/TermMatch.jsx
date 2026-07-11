import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Speak AI — tap-to-match game pairing AI/ML terms with kid-friendly meanings.
 * Terms come up 4 at a time; match all pairs to advance.
 */
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

const TermMatch = ({ onBack }) => {
  const rounds = useMemo(() => {
    const p = shuffle(PAIRS);
    return [p.slice(0, 4), p.slice(4, 8), p.slice(8, 12)];
  }, []);
  const [round, setRound] = useState(0);
  const [selTerm, setSelTerm] = useState(null);
  const [matched, setMatched] = useState({});   // term -> true
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
    if (pair.d === d) {
      setMatched(m => ({ ...m, [selTerm]: true }));
      setSelTerm(null);
    } else {
      setMisses(x => x + 1);
      setWrongFlash(d);
      setTimeout(() => setWrongFlash(null), 400);
    }
  };

  const nextRound = () => { setRound(r => r + 1); setSelTerm(null); };
  const restart = () => { setRound(0); setSelTerm(null); setMatched({}); setMisses(0); setRestartKey(k => k + 1); };

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Working with Data · Vocabulary"
      accent="#64D2FF"
      title="Speak AI — word match."
      lede="Every builder speaks the language. Match each AI word to its real meaning — 4 at a time, 12 in all."
      realLife={[
        { icon: '🗣️', title: 'Use them out loud', text: 'Next time you train a model in the lab, narrate it: “my DATASET… my FEATURES… my model’s ACCURACY…”' },
        { icon: '📰', title: 'Decode headlines', text: '“AI model shows bias” — you now know exactly what all three of those words mean.' },
        { icon: '👩‍🏫', title: 'Teach someone', text: 'Explain “overfitting” to a friend using the exam-memorisation story. Teaching it locks it in.' },
      ]}
    >
      <div className={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <span className={s.muted}>Round {Math.min(round + 1, 3)} of 3 — tap a word, then tap its meaning</span>
          <span className={s.score}>Misses: {misses}</span>
        </div>

        {!allDone ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 1fr) 2fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pairs.map(p => (
                <button key={p.t}
                  className={`${s.pillBtn} ${selTerm === p.t ? s.pillOn : ''}`}
                  style={{ justifyContent: 'center', opacity: matched[p.t] ? 0.35 : 1, textDecoration: matched[p.t] ? 'line-through' : 'none' }}
                  disabled={!!matched[p.t]}
                  onClick={() => setSelTerm(p.t)}>
                  {p.t}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {defs.map(p => {
                const isMatched = matched[p.t];
                return (
                  <button key={p.d}
                    className={s.opt}
                    style={{
                      marginBottom: 0,
                      opacity: isMatched ? 0.35 : 1,
                      borderColor: wrongFlash === p.d ? '#ff453a' : isMatched ? '#30d158' : undefined,
                      background: isMatched ? 'rgba(48,209,88,.1)' : undefined,
                    }}
                    disabled={isMatched}
                    onClick={() => pickDef(p.d)}>
                    {p.d}
                  </button>
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
    </DemoFlow>
  );
};

export default TermMatch;
