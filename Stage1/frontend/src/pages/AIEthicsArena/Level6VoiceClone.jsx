import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronRight, Zap, Volume2, VolumeX } from 'lucide-react';
import styles from './EthicsLevels.module.css';

const SENTENCES = [
  "Good morning students. Today's assembly will be at 9 AM in the main hall.",
  "Your exam results have been uploaded to the school portal. Please check immediately.",
  "This is an important announcement. School will remain closed tomorrow due to heavy rainfall.",
  "Congratulations! You have been selected for the district-level science competition."
];

const Level6VoiceClone = ({ onBackToHub, onComplete }) => {
  const [availableVoices, setAvailableVoices] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [playingVoice, setPlayingVoice] = useState(null); // 'A' or 'B'
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [phase, setPhase] = useState('game'); // game | scam
  const [scamAnswer, setScamAnswer] = useState(null);
  const synthRef = useRef(window.speechSynthesis);

  // Randomize which side is the "clone"
  const [cloneSide, setCloneSide] = useState('B');

  useEffect(() => {
    const loadVoices = () => {
      const voices = synthRef.current.getVoices();
      setAvailableVoices(voices);
    };
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
    
    // Randomize clone side for each round
    setCloneSide(Math.random() > 0.5 ? 'A' : 'B');
    
    return () => {
      synthRef.current.cancel();
    };
  }, [currentRound]);

  const getNaturalVoice = () => {
    // Try to find a natural-sounding English voice
    const preferred = availableVoices.find(v => 
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || availableVoices.find(v => 
      v.name.includes('Microsoft') && v.lang.startsWith('en') && (v.name.includes('Online') || v.name.includes('Natural'))
    ) || availableVoices.find(v => v.lang.startsWith('en-'));
    return preferred || availableVoices[0];
  };

  const getRoboticVoice = () => {
    // Find a distinctly different/robotic-sounding voice
    const robotic = availableVoices.find(v => 
      v.lang.startsWith('en') && !v.name.includes('Google') && !v.name.includes('Natural') && !v.name.includes('Online')
    ) || availableVoices.find(v => v.lang.startsWith('en'));
    return robotic || availableVoices[availableVoices.length - 1] || availableVoices[0];
  };

  const playVoice = (side) => {
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(SENTENCES[currentRound]);
    
    if ((side === 'A' && cloneSide === 'A') || (side === 'B' && cloneSide === 'B')) {
      // This is the "AI clone" side — use robotic voice
      const voice = getRoboticVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 0.85;
    } else {
      // This is the "real" side — use natural voice
      const voice = getNaturalVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }
    
    setPlayingVoice(side);
    utterance.onend = () => setPlayingVoice(null);
    utterance.onerror = () => setPlayingVoice(null);
    synthRef.current.speak(utterance);
  };

  const handleSelect = (side) => {
    if (revealed) return;
    setSelected(side);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === cloneSide;
    if (correct) setScore(prev => prev + 1);
    setRevealed(true);
  };

  const handleNext = () => {
    synthRef.current.cancel();
    setSelected(null);
    setRevealed(false);
    setPlayingVoice(null);
    
    if (currentRound + 1 >= 3) {
      setPhase('scam');
    } else {
      setCloneSide(Math.random() > 0.5 ? 'A' : 'B');
      setCurrentRound(prev => prev + 1);
    }
  };

  const handleScamAnswer = (answer) => {
    setScamAnswer(answer);
  };

  return (
    <div className={styles.levelPage}>
      <div className={styles.scanlines} />

      {/* Nav */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToHub}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <span className={styles.navTitle}>Mission 6 · Voice Clone</span>
        <div className={styles.navScore}>
          <Zap size={14} /> Score: {score}/3
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge} style={{ background: 'rgba(255, 107, 0, 0.1)', color: '#FF6B00', borderColor: 'rgba(255, 107, 0, 0.25)' }}>
            🎙️ Level 6 · Hard
          </div>
          <h1 className={styles.levelTitle}>
            Voice Clone <em>Challenge</em>
          </h1>
          <p className={styles.levelSubtitle}>
            {phase === 'game'
              ? 'Two voices read the same text. One is a real person, one is an AI clone. Listen carefully and pick the fake!'
              : 'Can voice cloning be used for scams?'
            }
          </p>
        </div>

        {/* GAME PHASE */}
        {phase === 'game' && (
          <>
            {/* Progress Dots */}
            <div className={styles.progressDots}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`${styles.dot} ${i < currentRound ? styles.dotCompleted : ''} ${i === currentRound ? styles.dotActive : ''}`}
                />
              ))}
            </div>

            {/* Current Sentence */}
            <div className={styles.gameCard} style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: '0.78rem', color: '#8B949E', marginBottom: 8, fontWeight: 600 }}>
                BOTH VOICES SAY:
              </div>
              <p style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '1.15rem', fontWeight: 500,
                color: '#f4f1ea', lineHeight: 1.6, fontStyle: 'italic'
              }}>
                "{SENTENCES[currentRound]}"
              </p>
            </div>

            {/* Voice Cards */}
            <div className={styles.voiceGrid}>
              <div
                className={`${styles.voiceCard} ${playingVoice === 'A' ? styles.voicePlaying : ''} ${selected === 'A' ? styles.imageCardSelected : ''}`}
                onClick={() => {
                  playVoice('A');
                  handleSelect('A');
                }}
                style={revealed && cloneSide === 'A' ? { borderColor: '#FF3366' } : {}}
              >
                <div className={styles.voiceIcon}>
                  {playingVoice === 'A' ? <Volume2 size={48} color="#00FF88" /> : '🔊'}
                </div>
                <div className={styles.voiceLabel}>Voice A</div>
                <div style={{ fontSize: '0.8rem', color: '#8B949E', marginTop: 6 }}>
                  {playingVoice === 'A' ? 'Playing...' : 'Click to listen'}
                </div>
                {revealed && (
                  <div style={{
                    marginTop: 10, fontSize: '0.82rem', fontWeight: 700,
                    color: cloneSide === 'A' ? '#FF3366' : '#00FF88'
                  }}>
                    {cloneSide === 'A' ? '🤖 AI Clone' : '✅ Real Voice'}
                  </div>
                )}
              </div>

              <div
                className={`${styles.voiceCard} ${playingVoice === 'B' ? styles.voicePlaying : ''} ${selected === 'B' ? styles.imageCardSelected : ''}`}
                onClick={() => {
                  playVoice('B');
                  handleSelect('B');
                }}
                style={revealed && cloneSide === 'B' ? { borderColor: '#FF3366' } : {}}
              >
                <div className={styles.voiceIcon}>
                  {playingVoice === 'B' ? <Volume2 size={48} color="#00FF88" /> : '🔊'}
                </div>
                <div className={styles.voiceLabel}>Voice B</div>
                <div style={{ fontSize: '0.8rem', color: '#8B949E', marginTop: 6 }}>
                  {playingVoice === 'B' ? 'Playing...' : 'Click to listen'}
                </div>
                {revealed && (
                  <div style={{
                    marginTop: 10, fontSize: '0.82rem', fontWeight: 700,
                    color: cloneSide === 'B' ? '#FF3366' : '#00FF88'
                  }}>
                    {cloneSide === 'B' ? '🤖 AI Clone' : '✅ Real Voice'}
                  </div>
                )}
              </div>
            </div>

            {/* Submit / Next */}
            {!revealed ? (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <p style={{ color: '#8B949E', fontSize: '0.88rem', marginBottom: 12 }}>
                  Which voice is the AI clone?
                </p>
                <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!selected}>
                  <VolumeX size={16} /> That's the Clone!
                </button>
              </div>
            ) : (
              <div className={styles.revealPanel}>
                <div className={`${styles.resultCard} ${selected === cloneSide ? styles.resultCorrect : styles.resultWrong}`}>
                  <div className={styles.resultIcon}>{selected === cloneSide ? '🎉' : '😮'}</div>
                  <div className={styles.resultText}>
                    {selected === cloneSide ? 'Sharp ears! You caught the clone!' : 'Tricky, right? The AI voice was very convincing!'}
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className={styles.btnPrimary} onClick={handleNext}>
                    <ChevronRight size={16} /> {currentRound + 1 >= 3 ? 'Scam Scenario' : 'Next Round'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* SCAM SCENARIO PHASE */}
        {phase === 'scam' && !showComplete && (
          <div className={styles.revealPanel}>
            <div className={styles.gameCard}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📞</div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 600, marginBottom: 10 }}>
                  Scenario: The Phone Call
                </h3>
              </div>

              <div style={{
                padding: '20px 24px', borderRadius: 14,
                background: 'rgba(255, 204, 0, 0.06)', border: '1px solid rgba(255, 204, 0, 0.15)',
                marginBottom: 24
              }}>
                <p style={{ lineHeight: 1.7, color: '#c4c0d4', fontSize: '0.95rem' }}>
                  You receive a phone call. The voice sounds <strong style={{ color: '#f4f1ea' }}>exactly like your school principal</strong>. 
                  The caller says:
                </p>
                <p style={{
                  fontStyle: 'italic', color: '#FFCC00', margin: '12px 0',
                  fontSize: '1.05rem', lineHeight: 1.6
                }}>
                  "Hello dear, this is your principal speaking. Due to an emergency situation, 
                  school is cancelled for the rest of the week. But I need your parent's phone 
                  number to inform them directly. Can you share it with me right now?"
                </p>
              </div>

              <p style={{ textAlign: 'center', color: '#8B949E', marginBottom: 16 }}>
                What should you do?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  className={styles.btnOutline}
                  onClick={() => handleScamAnswer('share')}
                  style={{
                    textAlign: 'left', padding: '14px 18px',
                    borderColor: scamAnswer === 'share' ? '#FF3366' : undefined,
                    background: scamAnswer === 'share' ? 'rgba(255, 51, 102, 0.08)' : undefined
                  }}
                >
                  A. Share the number — it sounds exactly like the principal!
                </button>
                <button
                  className={styles.btnOutline}
                  onClick={() => handleScamAnswer('verify')}
                  style={{
                    textAlign: 'left', padding: '14px 18px',
                    borderColor: scamAnswer === 'verify' ? '#00FF88' : undefined,
                    background: scamAnswer === 'verify' ? 'rgba(0, 255, 136, 0.08)' : undefined
                  }}
                >
                  B. Don't share anything. Hang up and call the school's official number to verify.
                </button>
                <button
                  className={styles.btnOutline}
                  onClick={() => handleScamAnswer('ignore')}
                  style={{
                    textAlign: 'left', padding: '14px 18px',
                    borderColor: scamAnswer === 'ignore' ? '#FFCC00' : undefined,
                    background: scamAnswer === 'ignore' ? 'rgba(255, 204, 0, 0.06)' : undefined
                  }}
                >
                  C. Ignore the call entirely.
                </button>
              </div>

              {scamAnswer && (
                <div className={styles.revealPanel} style={{ marginTop: 20 }}>
                  <div className={`${styles.resultCard} ${scamAnswer === 'verify' ? styles.resultCorrect : styles.resultWrong}`}>
                    <div className={styles.resultIcon}>
                      {scamAnswer === 'verify' ? '🛡️' : '⚠️'}
                    </div>
                    <div className={styles.resultText}>
                      {scamAnswer === 'verify' 
                        ? 'Perfect response!' 
                        : scamAnswer === 'share'
                        ? 'Careful! That voice could be cloned!'
                        : 'Not bad, but verifying is even better!'
                      }
                    </div>
                    <div className={styles.resultExplain}>
                      The safest action is always to <strong>hang up and call back using the official number</strong>. 
                      AI can now clone someone's voice from just a few seconds of audio. 
                      A scammer could use a cloned voice of your principal, parent, or friend to trick you.
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 16 }}>
                    <button className={styles.btnPrimary} onClick={() => setShowComplete(true)}>
                      <ChevronRight size={16} /> See Learning Outcome
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete */}
        {showComplete && (
          <>
            <div className={`${styles.takeaway} ${styles.revealPanel}`}>
              <div className={styles.takeawayIcon}>🎙️</div>
              <div className={styles.takeawayTitle}>AI Can Clone Any Voice</div>
              <div className={styles.takeawayText}>
                <strong>AI voice cloning technology can replicate someone's voice from just a few seconds of audio.</strong> 
                This can be used for scams, impersonation, and spreading misinformation. 
                If you receive an unexpected call asking for personal information — even if the voice sounds familiar — 
                always <strong>verify through an official channel</strong> before sharing anything.
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '16px 32px', borderRadius: 14,
                background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.25)',
                marginBottom: 20
              }}>
                <span style={{ color: '#8B949E', fontSize: '0.9rem' }}>Voice Rounds Score:</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#00FF88' }}>
                  {score}/3
                </span>
              </div>
              <br />
              <button className={styles.btnPrimary} onClick={() => { if (onComplete) onComplete(); onBackToHub(); }}>
                <ChevronRight size={16} /> Back to Arena
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Level6VoiceClone;
