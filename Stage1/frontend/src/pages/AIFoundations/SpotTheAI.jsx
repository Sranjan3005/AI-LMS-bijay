import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Spot the AI — "Understanding AI" hands-on.
 * Sort everyday apps into AI / Not-AI; every answer reveals the reason:
 * does it LEARN from data, or just FOLLOW fixed rules?
 */
const ITEMS = [
  { e: '🗺️', n: 'Google Maps route suggestions', ai: true,  why: 'It learns from live traffic data of lakhs of phones to predict the fastest route — new data, new answer.' },
  { e: '🔢', n: 'Calculator app', ai: false, why: '2 + 2 is always 4. Fixed rules, same answer every time — no learning anywhere.' },
  { e: '📺', n: 'YouTube video recommendations', ai: true,  why: 'It learns your taste from what you watch, skip and like — and updates constantly.' },
  { e: '⏰', n: 'Alarm clock', ai: false, why: 'It rings at the time you set. It follows one rule and never gets “better” at ringing.' },
  { e: '⌨️', n: 'Autocorrect & next-word suggestions', ai: true,  why: 'It learned from millions of sentences which word usually comes next — that’s a language model.' },
  { e: '🔦', n: 'Phone torch', ai: false, why: 'Switch on → light on. Pure electronics, zero data, zero learning.' },
  { e: '📸', n: 'Face unlock', ai: true,  why: 'It learned the pattern of YOUR face from examples — and can even handle new angles and haircuts.' },
  { e: '📧', n: 'Spam filter in email', ai: true,  why: 'It learns from crores of spam examples. Spammers change tricks; the filter keeps learning new ones.' },
  { e: '🎮', n: 'Snake game on an old phone', ai: false, why: 'The snake follows exact rules written by a programmer. It never improves by playing.' },
  { e: '🎙️', n: 'Voice assistant (Alexa / Siri)', ai: true,  why: 'Understanding your voice — accent, speed, background noise — needs models trained on huge speech data.' },
];

const SpotTheAI = ({ onBack }) => {
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState(null); // true/false = the student's pick
  const [score, setScore] = useState(0);
  const done = idx >= ITEMS.length;
  const item = ITEMS[idx];

  const pick = (choice) => {
    if (answered !== null) return;
    setAnswered(choice);
    if (choice === item.ai) setScore(sc => sc + 1);
  };
  const next = () => { setIdx(i => i + 1); setAnswered(null); };
  const restart = () => { setIdx(0); setAnswered(null); setScore(0); };

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Understanding AI · Hands-on"
      accent="#BF5AF2"
      title="Spot the AI around you."
      lede="Ten things you use every week. Which of them actually learn — and which just follow rules? The difference is the whole idea of AI."
      realLife={[
        { icon: '🧠', title: 'The one-line test', text: 'Ask: “Does it get better with data?” If yes — it’s learning. If it behaves exactly the same forever — it’s rules.' },
        { icon: '🏠', title: 'Try it at home', text: 'Pick any 3 apps on a parent’s phone tonight and run the same test on them.' },
        { icon: '🗞️', title: 'In the news', text: 'When you read “AI-powered”, check: is there data it learns from? If not, it’s probably just marketing.' },
      ]}
    >
      <div className={s.card}>
        {!done ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className={s.muted}>Card {idx + 1} of {ITEMS.length}</span>
              <span className={s.score}>Score: {score}</span>
            </div>
            <div style={{ textAlign: 'center', padding: '18px 0 6px' }}>
              <div style={{ fontSize: '3.2rem' }}>{item.e}</div>
              <h3 style={{ margin: '10px 0 20px', fontSize: '1.35rem' }}>{item.n}</h3>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className={s.navBtn} style={{ minWidth: 140, opacity: answered !== null && !item.ai ? 0.45 : 1 }}
                        onClick={() => pick(true)} disabled={answered !== null}>🤖 It's AI</button>
                <button className={`${s.navBtn} ${s.navGhost}`} style={{ minWidth: 140, opacity: answered !== null && item.ai ? 0.45 : 1 }}
                        onClick={() => pick(false)} disabled={answered !== null}>⚙️ Just rules</button>
              </div>
            </div>
            {answered !== null && (
              <>
                <div className={answered === item.ai ? s.banner : `${s.banner} ${s.bannerWarn}`}>
                  {answered === item.ai ? '✅ Correct — ' : '❌ Not quite — '}
                  <b>{item.ai ? 'this one learns.' : 'this one only follows rules.'}</b> {item.why}
                </div>
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button className={s.navBtn} onClick={next}>{idx === ITEMS.length - 1 ? 'See my result' : 'Next card'} →</button>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: '3rem' }}>{score >= 8 ? '🏆' : score >= 5 ? '🎉' : '💪'}</div>
            <h3 style={{ fontSize: '1.5rem', margin: '10px 0' }}>{score} / {ITEMS.length} spotted correctly</h3>
            <p className={s.muted} style={{ maxWidth: 460, margin: '0 auto 18px', lineHeight: 1.6 }}>
              The secret you now know: <b style={{ color: '#fff' }}>AI = software that learns from data.</b> Everything
              else — however fancy — is just rules someone typed.
            </p>
            <button className={`${s.navBtn} ${s.navGhost}`} onClick={restart}><RotateCcw size={15} /> Play again</button>
          </div>
        )}
      </div>
    </DemoFlow>
  );
};

export default SpotTheAI;
