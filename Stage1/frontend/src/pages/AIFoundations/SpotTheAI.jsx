import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Spot the AI — "Understanding AI" hands-on.
 * Sort everyday apps into AI / Not-AI; every answer reveals the reason:
 * does it LEARN from data, or just FOLLOW fixed rules?
 */
const ITEMS = [
  { videoName: 'google_maps', e: '🗺️', n: 'Google Maps route suggestions', ai: true,  why: 'Passed the Adaptability Test! It changes its routes dynamically based on live traffic, adapting continuously.' },
  { videoName: 'calculator', e: '🔢', n: 'Calculator app', ai: false, why: 'Failed the Messy Input Test! It strictly follows 2+2=4. If you type letters, it crashes. No learning, just rigid rules.' },
  { videoName: 'youtube', e: '📺', n: 'YouTube video recommendations', ai: true,  why: 'Passed the Adaptability Test! The homepage changes every week based on what you watch and skip. It learns your habits.' },
  { videoName: 'alarm_clock', e: '⏰', n: 'Alarm clock', ai: false, why: 'Failed the Adaptability Test! It rings exactly at 7:00 AM every day. It never learns that you want to sleep in on Sundays.' },
  { videoName: 'autocorrect', e: '⌨️', n: 'Autocorrect & next-word suggestions', ai: true,  why: 'Passed the Messy Input Test! It understands your typos ("teh" -> "the") because it learned from millions of sentences.' },
  { videoName: 'phone_torch', e: '🔦', n: 'Phone torch', ai: false, why: 'Strict rule: button pushed = light on. It never learns or adapts. Just pure electronic rules.' },
  { videoName: 'face_unlock', e: '📸', n: 'Face unlock', ai: true,  why: 'Passed the Human Task Test! It "sees" your face, even if you wear a hat, glasses, or change lighting. Rules would break!' },
  { videoName: 'spam_filter', e: '📧', n: 'Spam filter in email', ai: true,  why: 'Passed the Adaptability Test! Spammers change their tricks daily, but the filter learns the new patterns to keep your inbox clean.' },
  { videoName: 'snake_game', e: '🎮', n: 'Snake game on an old phone', ai: false, why: 'The snake moves exactly as programmed. It never gets smarter or learns new strategies by playing.' },
  { videoName: 'voice_assistant', e: '🎙️', n: 'Voice assistant (Alexa / Siri)', ai: true,  why: 'Passed the Messy Input & Human Task tests! It "listens" and understands you despite background noise or heavy accents.' },
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
        { icon: '🌪️', title: 'The Messy Input Test', text: 'Give it a typo, accent, or messy photo. If it still understands you (like Google Search), it’s AI. If it crashes (like a calculator), it’s rule-based.' },
        { icon: '🔄', title: 'The Adaptability Test', text: 'Use it for a week. Does it change based on your habits? (YouTube). If it stays exactly the same forever (Alarm Clock), it’s rules.' },
        { icon: '👁️', title: 'The Human Task Test', text: 'Is it doing something that normally needs human eyes or ears? (Reading handwriting, recognizing songs). If yes, it’s AI.' },
      ]}
    >
      <div className={s.card}>
        {!done ? (
          <div style={{ display: 'flex', gap: 24, minHeight: 340, flexDirection: 'column', md: { flexDirection: 'row' }, alignItems: 'stretch' }}>
            {/* Left side: Actual MP4 Video Demo */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#020617', borderRadius: 16, overflow: 'hidden' }}>
              <video 
                key={item.videoName}
                src={`/videos/${item.videoName}_demo.mp4`} 
                autoPlay 
                loop 
                muted 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            
            {/* Right side: Interaction panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className={s.muted}>Card {idx + 1} of {ITEMS.length}</span>
                <span className={s.score}>Score: {score}</span>
              </div>
              
              <div style={{ textAlign: 'center', padding: '10px 0 0', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '2.5rem' }}>{item.e}</div>
                <h3 style={{ margin: '8px 0 16px', fontSize: '1.25rem' }}>{item.n}</h3>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button className={s.navBtn} style={{ minWidth: 140, opacity: answered !== null && !item.ai ? 0.45 : 1 }}
                          onClick={() => pick(true)} disabled={answered !== null}>🤖 It's AI</button>
                  <button className={s.navBtn} style={{ minWidth: 140, opacity: answered !== null && item.ai ? 0.45 : 1 }}
                          onClick={() => pick(false)} disabled={answered !== null}>⚙️ Just rules</button>
                </div>
              </div>
              
              <div style={{ minHeight: 110, marginTop: 12 }}>
                {answered !== null && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className={answered === item.ai ? s.banner : `${s.banner} ${s.bannerWarn}`}>
                      {answered === item.ai ? '✅ Correct — ' : '❌ Not quite — '}
                      <b>{item.ai ? 'this one learns.' : 'this one only follows rules.'}</b> {item.why}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <button className={s.navBtn} onClick={next}>{idx === ITEMS.length - 1 ? 'See my result' : 'Next card'} →</button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
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
