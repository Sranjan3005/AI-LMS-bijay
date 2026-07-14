import React, { useEffect, useState } from 'react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Breaking Point — the "Understanding AI" demonstration.
 * Students meet Chitti, a delivery robot: first they program him with fixed
 * if-then rules (which break when the world changes), then switch on a real
 * Q-learning brain and watch him learn the maze by himself. The interactive is
 * a self-contained lab embedded from /games/chiti (built from the AI-Studio app).
 */

// video slot — drop the AI-generated clip here when ready (see plan Appendix A1)
const VIDEO = '';

function ChittiLab() {
  const gameUrl = `${import.meta.env.BASE_URL}games/chiti/index.html`;
  // The game reports its real height via postMessage so the iframe grows to fit
  // the whole lab — no internal scrollbar, no cramped/half-empty window.
  const [height, setHeight] = useState(1400);
  useEffect(() => {
    const onMsg = (e) => {
      if (e?.data?.type === 'chiti-height' && Number.isFinite(e.data.height)) {
        setHeight(Math.max(700, Math.round(e.data.height)));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  return (
    <div className={s.card}>
      <h3 style={{ margin: '0 0 6px' }}>Program a robot with rules — then let it learn.</h3>
      <p className={s.muted} style={{ marginTop: 0, lineHeight: 1.6 }}>
        Meet <b style={{ color: '#fff' }}>Chitti</b>. In <b>Mode 1</b> you hand him fixed <i>if-then</i> rules —
        they work on the simple map, then break the moment the street changes. In <b>Mode 2</b> you switch on his
        learning brain and watch him solve the maze <b style={{ color: '#fff' }}>by himself</b>, purely from rewards
        and mistakes. That jump — from rules that are <i>written</i> to knowledge that is <i>earned</i> — is the
        whole idea of machine learning.
      </p>
      <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: '#020617', boxShadow: '0 10px 40px rgba(0,0,0,.35)' }}>
        <iframe
          src={gameUrl}
          title="Chitti the Robot — Reinforcement Learning Lab"
          scrolling="no"
          style={{ width: '100%', height: `${height}px`, border: 0, display: 'block' }}
        />
      </div>
      <p className={s.muted} style={{ textAlign: 'center', marginTop: 12 }}>
        Prefer it on its own? —{' '}
        <a href={gameUrl} target="_blank" rel="noreferrer" style={{ color: '#BF5AF2', fontWeight: 600 }}>open the lab in a new tab ↗</a>
      </p>
    </div>
  );
}

const BreakingPoint = ({ onBack }) => (
  <DemoFlow
    onBack={onBack}
    eyebrow="Understanding AI · Demonstration"
    accent="#BF5AF2"
    title={<>When rules break — <span className="grad" style={{ background: 'linear-gradient(120deg,#5E5CE6,#BF5AF2 52%,#64D2FF)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>and robots learn.</span></>}
    lede="First program a delivery robot the old way — with if-else rules. Then watch the real world break them. Then let the robot learn the job all by itself."
    video={VIDEO}
    tryLabel="Try the lab"
    realLife={[
      { icon: '📧', title: 'Spam filters', text: 'Nobody can write rules for every trick spammers invent — so your inbox learns from millions of examples instead.' },
      { icon: '📺', title: 'YouTube recommendations', text: 'No rulebook says what you will like. The system learns from what you (and crores of others) watch.' },
      { icon: '🤖', title: 'Robot vacuum cleaners', text: 'Every home has different furniture. The robot learns the map of your house by exploring it — trial and error.' },
      { icon: '🚗', title: 'Self-driving cars', text: 'Indian roads have cows, carts and surprise scooters. Impossible to hard-code — the car must learn from experience.' },
    ]}
    check={{
      q: 'Quick check: why did the if-else robot keep failing?',
      options: [
        'The computer was too slow',
        'The real world keeps changing, and rules can’t cover every situation',
        'The robot was badly built',
        'It needed a bigger battery',
      ],
      answer: 1,
      explain: 'Exactly. Rules only cover situations the programmer imagined. Learning systems improve from experience — that is the core idea of machine learning.',
    }}
  >
    <ChittiLab />
  </DemoFlow>
);

export default BreakingPoint;
