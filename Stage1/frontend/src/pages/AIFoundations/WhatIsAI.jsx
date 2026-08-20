import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles, RotateCcw } from 'lucide-react';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * What is AI, really? — the "Understanding AI" theory experience (Sutra-styled).
 * Four sections: AI is everywhere → the ONE big idea (Teach the Machine
 * interactive: learning from examples) → AI vs a normal program → where it
 * helps in India + a quick check. Replaces the old math-history lesson and the
 * puppy demo with a single coherent "what is AI" flow.
 */

const SECTIONS = ['Everywhere', 'The big idea', 'AI vs a program', 'Why it matters'];

/* ── Section 1: tap-to-reveal grid ── */
const EVERYDAY = [
  { e: '🗺️', n: 'Maps', r: 'learns from millions of phones\' live traffic to pick your fastest route.' },
  { e: '📺', n: 'YouTube', r: 'learns what you like from what you watch, and recommends more.' },
  { e: '🔓', n: 'Face unlock', r: 'learned the pattern of YOUR face from a few example photos.' },
  { e: '🎙️', n: 'Voice assistant', r: 'learned to understand speech from millions of voice recordings.' },
  { e: '⌨️', n: 'Autocorrect', r: 'learned which word usually comes next from billions of sentences.' },
  { e: '📸', n: 'Camera filters', r: 'learned where your eyes, nose and mouth are from labelled face photos.' },
];

function Everywhere() {
  const [open, setOpen] = useState({});
  return (
    <div className={s.card}>
      <h3 style={{ margin: '0 0 6px' }}>You already use AI every single day.</h3>
      <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.6 }}>
        Tap each one to see the hidden AI inside it. Notice the word that keeps coming up: <b style={{ color: '#fff' }}>learns</b>.
      </p>
      <div className={s.rlGrid}>
        {EVERYDAY.map((x, i) => (
          <button key={i} onClick={() => setOpen(o => ({ ...o, [i]: !o[i] }))}
            className={s.rlCard} style={{ textAlign: 'left', cursor: 'pointer', border: open[i] ? '1px solid rgba(191,90,242,.5)' : undefined }}>
            <div className={s.rlIcon}>{x.e}</div>
            <h4>{x.n}</h4>
            <p>{open[i] ? `It ${x.r}` : 'Tap to reveal the AI inside →'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Section 2: Teach the Machine (learning from examples) ── */
const TRAIN = [
  { id: 't1', emoji: '🍎', redness: 88 },
  { id: 't2', emoji: '🍊', redness: 22 },
  { id: 't3', emoji: '🍎', redness: 74 },
  { id: 't4', emoji: '🍊', redness: 35 },
  { id: 't5', emoji: '🍎', redness: 68 },
  { id: 't6', emoji: '🍊', redness: 15 },
];
const TEST = [
  { id: 'x1', emoji: '🍎', redness: 80, truth: 'apple' },
  { id: 'x2', emoji: '🍊', redness: 28, truth: 'orange' },
  { id: 'x3', emoji: '🍎', redness: 60, truth: 'apple' },
];
const RedBar = ({ v }) => (
  <div style={{ height: 8, borderRadius: 4, background: `linear-gradient(90deg,#FF9F0A,#FF453A)`, position: 'relative', margin: '6px 0' }}>
    <div style={{ position: 'absolute', left: `calc(${v}% - 6px)`, top: -3, width: 12, height: 12, borderRadius: '50%', background: '#fff', border: '2px solid #05060f' }} />
  </div>
);

function TeachMachine() {
  const [labels, setLabels] = useState({});   // id -> 'apple' | 'orange'
  const [phase, setPhase] = useState('train'); // train | result
  const allLabeled = TRAIN.every(f => labels[f.id]);
  const hasBoth = Object.values(labels).includes('apple') && Object.values(labels).includes('orange');

  const learn = () => {
    const apples = TRAIN.filter(f => labels[f.id] === 'apple').map(f => f.redness);
    const oranges = TRAIN.filter(f => labels[f.id] === 'orange').map(f => f.redness);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    const threshold = (mean(apples) + mean(oranges)) / 2;
    setPhase({ threshold });
  };
  const reset = () => { setLabels({}); setPhase('train'); };

  const threshold = typeof phase === 'object' ? phase.threshold : null;
  const predictions = threshold != null
    ? TEST.map(f => ({ ...f, pred: f.redness > threshold ? 'apple' : 'orange' }))
    : [];
  const correct = predictions.filter(p => p.pred === p.truth).length;

  return (
    <div className={s.card}>
      <h3 style={{ margin: '0 0 6px' }}>The one big idea: AI learns from examples.</h3>
      <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.6 }}>
        A normal program needs you to write a rule like <i>"if red then apple"</i>. An AI figures the rule
        out <b style={{ color: '#fff' }}>by itself</b> — if you just show it examples. Let&apos;s prove it. Label these
        6 fruits, then watch the machine guess brand-new ones it has never seen.
      </p>

      {threshold == null ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            {TRAIN.map(f => (
              <div key={f.id} className={s.rlCard} style={{ textAlign: 'center', border: labels[f.id] ? '1px solid rgba(48,209,88,.4)' : undefined }}>
                <div style={{ fontSize: '2rem' }}>{f.emoji}</div>
                <RedBar v={f.redness} />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 6 }}>
                  <button className={`${s.pillBtn} ${labels[f.id] === 'apple' ? s.pillOn : ''}`} style={{ padding: '5px 10px' }}
                    onClick={() => setLabels(l => ({ ...l, [f.id]: 'apple' }))}>🍎 Apple</button>
                  <button className={`${s.pillBtn} ${labels[f.id] === 'orange' ? s.pillOn : ''}`} style={{ padding: '5px 10px' }}
                    onClick={() => setLabels(l => ({ ...l, [f.id]: 'orange' }))}>🍊 Orange</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className={s.navBtn} disabled={!allLabeled || !hasBoth} onClick={learn}>
              <Sparkles size={15} /> Teach the machine
            </button>
            {allLabeled && !hasBoth && <p className={`${s.muted}`} style={{ marginTop: 8 }}>Label at least one apple AND one orange so it has both to learn from.</p>}
          </div>
        </>
      ) : (
        <>
          <div className={s.banner}>
            🧠 The machine studied your labels and worked out its own rule: <b>“if redness is above about {Math.round(threshold)}, call it an apple.”</b> You never typed that rule — it learned it.
          </div>
          <h4 style={{ margin: '16px 0 8px' }}>Now it guesses 3 fruits it has never seen:</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
            {predictions.map(p => (
              <div key={p.id} className={s.rlCard} style={{ textAlign: 'center', border: `1px solid ${p.pred === p.truth ? 'rgba(48,209,88,.5)' : 'rgba(255,69,58,.5)'}` }}>
                <div style={{ fontSize: '2rem' }}>{p.emoji}</div>
                <RedBar v={p.redness} />
                <div style={{ fontWeight: 700, marginTop: 6 }}>
                  {p.pred === p.truth ? '✅' : '❌'} guessed {p.pred === 'apple' ? '🍎 Apple' : '🍊 Orange'}
                </div>
              </div>
            ))}
          </div>
          <div className={correct === TEST.length ? s.banner : `${s.banner} ${s.bannerWarn}`} style={{ marginTop: 14 }}>
            {correct} out of {TEST.length} correct — from examples alone. <b>That is machine learning:</b> you give it examples, it finds the pattern. No rules written by hand.
          </div>
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button className={`${s.navBtn} ${s.navGhost}`} onClick={reset}><RotateCcw size={15} /> Try again</button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Section 3: AI vs a normal program ── */
function VsProgram() {
  return (
    <div className={s.card}>
      <h3 style={{ margin: '0 0 12px' }}>So how is AI different from a normal program?</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
        <div className={s.rlCard} style={{ border: '1px solid rgba(100,210,255,.35)' }}>
          <div className={s.rlIcon}>⚙️</div>
          <h4>A normal program</h4>
          <p>Follows a fixed recipe you wrote, step by step. Fast and exact — but totally clueless the moment something new or messy shows up, because nobody wrote a rule for it.</p>
        </div>
        <div className={s.rlCard} style={{ border: '1px solid rgba(191,90,242,.4)' }}>
          <div className={s.rlIcon}>🧠</div>
          <h4>Artificial Intelligence</h4>
          <p>Learns patterns from examples instead of fixed rules. It can handle messiness and things it has never seen before — but it needs lots of examples, and it can still be wrong.</p>
        </div>
      </div>
      <div className={s.banner} style={{ marginTop: 14 }}>
        👉 In the next part — the <b>Demonstration</b> — you&apos;ll watch a normal program (a robot following if-else rules) hit a wall in the real world… and then watch an AI <b>learn</b> to get past it all by itself.
      </div>
    </div>
  );
}

/* ── Section 4: why it matters + check ── */
function WhyMatters({ picked, setPicked }) {
  return (
    <div className={s.card}>
      <h3 style={{ margin: '0 0 6px' }}>Why should you care?</h3>
      <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.6 }}>
        AI is already changing daily life around you in India:
      </p>
      <div className={s.rlGrid}>
        <div className={s.rlCard}><div className={s.rlIcon}>🌾</div><h4>Farming</h4><p>Apps photograph a crop leaf and spot disease early — saving a farmer&apos;s harvest.</p></div>
        <div className={s.rlCard}><div className={s.rlIcon}>🏥</div><h4>Health</h4><p>AI helps doctors read X-rays and scans faster in busy hospitals.</p></div>
        <div className={s.rlCard}><div className={s.rlIcon}>🗣️</div><h4>Language</h4><p>Instant translation between Hindi, Tamil, Bengali and English on your phone.</p></div>
        <div className={s.rlCard}><div className={s.rlIcon}>🚦</div><h4>Cities</h4><p>Smart traffic signals learn rush-hour patterns to cut jams.</p></div>
      </div>
      <div className={s.check}>
        <div className={s.checkQ}>Quick check: what makes something &quot;AI&quot; rather than a normal program?</div>
        {[
          'It runs on a very fast computer',
          'It learns patterns from examples instead of following only fixed rules',
          'It is connected to the internet',
          'It has a nice colourful screen',
        ].map((o, i) => (
          <button key={i} className={`${s.opt} ${picked !== null && i === 1 ? s.optRight : ''} ${picked === i && i !== 1 ? s.optWrong : ''}`}
            onClick={() => setPicked(i)} disabled={picked !== null}>{o}</button>
        ))}
        {picked !== null && <div className={s.explain}>The heart of AI is <b>learning from data</b>. A fast computer or an internet connection doesn&apos;t make something AI — learning from examples does.</div>}
      </div>
    </div>
  );
}

const WhatIsAI = ({ onBack }) => {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);

  return (
    <div className={s.page} style={{ '--acc': '#BF5AF2' }}>
      <div className={s.top}>
        <button className={s.back} onClick={onBack}><ArrowLeft size={16} /> Back to my flow</button>
      </div>

      <div className={s.head}>
        <span className={s.eyebrow}><Sparkles size={14} /> Understanding AI · Theory</span>
        <h1>What is AI, <span className="grad" style={{ background: 'linear-gradient(120deg,#5E5CE6,#BF5AF2 52%,#64D2FF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>really?</span></h1>
        <p className={s.lede}>Not robots taking over the world — something you already use every day. In four quick steps you&apos;ll teach a machine yourself and see exactly what makes it &quot;intelligent&quot;.</p>
      </div>

      <div className={s.stepsNav}>
        {SECTIONS.map((label, i) => (
          <button key={i} className={`${s.stepBtn} ${i === step ? s.stepOn : ''}`} onClick={() => setStep(i)}>
            <span className={s.stepNum}>{i + 1}</span>{label}
          </button>
        ))}
      </div>

      <div className={s.body}>
        {step === 0 && <Everywhere />}
        {step === 1 && <TeachMachine />}
        {step === 2 && <VsProgram />}
        {step === 3 && <WhyMatters picked={picked} setPicked={setPicked} />}

        <div className={s.foot}>
          <button className={`${s.navBtn} ${s.navGhost}`} disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Previous
          </button>
          {step < SECTIONS.length - 1
            ? <button className={s.navBtn} onClick={() => setStep(step + 1)}>Next <ArrowRight size={16} /></button>
            : <button className={s.navBtn} onClick={onBack}>Finish <ArrowRight size={16} /></button>}
        </div>
      </div>
    </div>
  );
};

export default WhatIsAI;
