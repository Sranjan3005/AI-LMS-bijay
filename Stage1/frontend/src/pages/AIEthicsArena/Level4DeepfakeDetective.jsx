import React, { useState } from 'react';
import { ArrowLeft, Zap, ChevronRight, Eye } from 'lucide-react';
import styles from './EthicsLevels.module.css';

// Each round has two images (described via SVG illustrations) — one "real", one "AI-generated"
const ROUNDS = [
  {
    id: 1,
    theme: 'Portrait Photo',
    imageA: { label: 'Image A', isAI: true, description: 'A portrait of a smiling young woman' },
    imageB: { label: 'Image B', isAI: false, description: 'A portrait of a man at a park' },
    aiAnswer: 'A',
    clue: 'Look at the ears — one is slightly higher than the other and the earring merges into skin. AI often struggles with asymmetric details and jewelry.',
    difficulty: 'Easy'
  },
  {
    id: 2,
    theme: 'Classroom Scene',
    imageA: { label: 'Image A', isAI: false, description: 'Students in a real classroom' },
    imageB: { label: 'Image B', isAI: true, description: 'Students in a generated classroom' },
    aiAnswer: 'B',
    clue: 'Count the fingers on the student writing — there are 6 fingers! AI-generated images frequently produce extra or merged fingers.',
    difficulty: 'Easy'
  },
  {
    id: 3,
    theme: 'City Street',
    imageA: { label: 'Image A', isAI: true, description: 'A busy Indian street scene' },
    imageB: { label: 'Image B', isAI: false, description: 'A real photo of a market' },
    aiAnswer: 'A',
    clue: 'Look at the shop signs — the text is gibberish and warped. AI can\'t reliably generate readable text in images.',
    difficulty: 'Medium'
  },
  {
    id: 4,
    theme: 'Food Photo',
    imageA: { label: 'Image A', isAI: false, description: 'A real plate of biryani' },
    imageB: { label: 'Image B', isAI: true, description: 'An AI-generated plate of food' },
    aiAnswer: 'B',
    clue: 'The spoon handle passes through the bowl rim instead of resting on it. AI often fails with object physics and spatial relationships.',
    difficulty: 'Hard'
  },
];

// SVG-based visual representations
const ImageIllustration = ({ type, isAI, theme }) => {
  const colors = isAI 
    ? { bg: '#1a1035', accent: '#B200FF', secondary: '#FF3366' }
    : { bg: '#0d1a1f', accent: '#00F0FF', secondary: '#00FF88' };
  
  return (
    <div style={{
      width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden',
      background: `linear-gradient(135deg, ${colors.bg}, #0B0D17)`,
      border: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      position: 'relative', padding: 16
    }}>
      {/* Visual representation using emoji + styled elements */}
      <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>
        {theme === 'Portrait Photo' && (isAI ? '👩‍💼' : '👨‍🌾')}
        {theme === 'Classroom Scene' && '🏫'}
        {theme === 'City Street' && '🏙️'}
        {theme === 'Food Photo' && '🍛'}
      </div>
      <div style={{
        fontSize: '0.8rem', color: colors.accent, fontWeight: 600,
        fontFamily: 'Outfit, sans-serif', textAlign: 'center', lineHeight: 1.4
      }}>
        {type.description}
      </div>
      
      {/* AI artifact hints (subtle visual glitches) */}
      {isAI && (
        <>
          <div style={{
            position: 'absolute', top: 8, right: 8,
            width: 24, height: 24, borderRadius: '50%',
            background: `${colors.secondary}15`, border: `1px solid ${colors.secondary}30`
          }} />
          <div style={{
            position: 'absolute', bottom: 12, left: 12, right: 12,
            height: 2, background: `linear-gradient(90deg, ${colors.secondary}40, transparent)`,
            borderRadius: 4
          }} />
        </>
      )}
      
      {/* Watermark style label */}
      <div style={{
        position: 'absolute', bottom: 6, right: 8,
        fontSize: '0.65rem', color: 'rgba(255,255,255,0.15)',
        fontStyle: 'italic'
      }}>
        {isAI ? 'generated_v3.2' : 'photo_original'}
      </div>
    </div>
  );
};

const Level4DeepfakeDetective = ({ onBackToHub, onComplete }) => {
  const [currentRound, setCurrentRound] = useState(0);
  const [selected, setSelected] = useState(null); // 'A' or 'B'
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [showComplete, setShowComplete] = useState(false);

  const round = ROUNDS[currentRound];

  const handleSelect = (choice) => {
    if (revealed) return;
    setSelected(choice);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const correct = selected === round.aiAnswer;
    if (correct) setScore(prev => prev + 1);
    setRevealed(true);
  };

  const handleNext = () => {
    setSelected(null);
    setRevealed(false);
    if (currentRound + 1 >= ROUNDS.length) {
      setShowComplete(true);
    } else {
      setCurrentRound(prev => prev + 1);
    }
  };

  return (
    <div className={styles.levelPage}>
      <div className={styles.scanlines} />

      {/* Nav */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToHub}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <span className={styles.navTitle}>Mission 4 · Deepfake Detective</span>
        <div className={styles.navScore}>
          <Zap size={14} /> Score: {score}/{ROUNDS.length}
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge} style={{ background: 'rgba(255, 51, 102, 0.1)', color: '#FF3366', borderColor: 'rgba(255, 51, 102, 0.25)' }}>
            🖼️ Level 4 · Hard
          </div>
          <h1 className={styles.levelTitle}>
            Deepfake <em>Detective</em>
          </h1>
          <p className={styles.levelSubtitle}>
            One image is real, one is AI-generated. Examine them carefully and pick the fake!
          </p>
        </div>

        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {ROUNDS.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i < currentRound ? styles.dotCompleted : ''} ${i === currentRound ? styles.dotActive : ''}`}
            />
          ))}
        </div>

        {!showComplete && (
          <>
            {/* Round Info */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{
                padding: '4px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600,
                background: 'rgba(255, 255, 255, 0.04)', color: '#8B949E',
                fontFamily: 'Outfit, sans-serif'
              }}>
                Round {currentRound + 1} · {round.theme} · {round.difficulty}
              </span>
            </div>

            {/* Image Grid */}
            <div className={styles.imageGrid}>
              <div
                className={`${styles.imageCard} ${selected === 'A' ? styles.imageCardSelected : ''}`}
                onClick={() => handleSelect('A')}
                style={revealed && round.aiAnswer === 'A' ? { borderColor: '#FF3366', boxShadow: '0 0 20px rgba(255,51,102,0.2)' } : {}}
              >
                <div className={styles.imagePreview}>
                  <ImageIllustration type={round.imageA} isAI={round.imageA.isAI} theme={round.theme} />
                </div>
                <div className={styles.imageLabel}>
                  {round.imageA.label}
                  {revealed && round.aiAnswer === 'A' && (
                    <span style={{ color: '#FF3366', marginLeft: 8, fontSize: '0.82rem' }}>← AI Generated</span>
                  )}
                  {revealed && round.aiAnswer !== 'A' && (
                    <span style={{ color: '#00FF88', marginLeft: 8, fontSize: '0.82rem' }}>← Real</span>
                  )}
                </div>
              </div>

              <div
                className={`${styles.imageCard} ${selected === 'B' ? styles.imageCardSelected : ''}`}
                onClick={() => handleSelect('B')}
                style={revealed && round.aiAnswer === 'B' ? { borderColor: '#FF3366', boxShadow: '0 0 20px rgba(255,51,102,0.2)' } : {}}
              >
                <div className={styles.imagePreview}>
                  <ImageIllustration type={round.imageB} isAI={round.imageB.isAI} theme={round.theme} />
                </div>
                <div className={styles.imageLabel}>
                  {round.imageB.label}
                  {revealed && round.aiAnswer === 'B' && (
                    <span style={{ color: '#FF3366', marginLeft: 8, fontSize: '0.82rem' }}>← AI Generated</span>
                  )}
                  {revealed && round.aiAnswer !== 'B' && (
                    <span style={{ color: '#00FF88', marginLeft: 8, fontSize: '0.82rem' }}>← Real</span>
                  )}
                </div>
              </div>
            </div>

            {/* Submit / Reveal */}
            {!revealed ? (
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className={styles.btnPrimary} onClick={handleSubmit} disabled={!selected}>
                  <Eye size={16} /> Which is AI-Generated?
                </button>
              </div>
            ) : (
              <div className={styles.revealPanel}>
                <div className={`${styles.resultCard} ${selected === round.aiAnswer ? styles.resultCorrect : styles.resultWrong}`}>
                  <div className={styles.resultIcon}>{selected === round.aiAnswer ? '🎉' : '😮'}</div>
                  <div className={styles.resultText}>
                    {selected === round.aiAnswer ? 'You spotted it!' : 'That one was tricky!'}
                  </div>
                </div>

                <div className={styles.clueBox}>
                  <div className={styles.clueIcon}>🔎</div>
                  <div className={styles.clueText}>
                    <strong>How to spot it: </strong>{round.clue}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button className={styles.btnPrimary} onClick={handleNext}>
                    <ChevronRight size={16} /> {currentRound + 1 >= ROUNDS.length ? 'See Results' : 'Next Round'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Complete */}
        {showComplete && (
          <>
            <div className={`${styles.takeaway} ${styles.revealPanel}`}>
              <div className={styles.takeawayIcon}>🖼️</div>
              <div className={styles.takeawayTitle}>Not Everything You See is Real</div>
              <div className={styles.takeawayText}>
                <strong>AI-generated images are getting harder to detect.</strong> Common signs include: 
                unnatural hands and fingers, garbled text, asymmetric jewelry or earrings, 
                impossible object physics, and overly smooth or plastic-looking skin.
                Always think critically about images you see online.
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                padding: '16px 32px', borderRadius: 14,
                background: 'rgba(0, 255, 136, 0.08)', border: '1px solid rgba(0, 255, 136, 0.25)',
                marginBottom: 20
              }}>
                <span style={{ color: '#8B949E', fontSize: '0.9rem' }}>Final Score:</span>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 700, color: '#00FF88' }}>
                  {score}/{ROUNDS.length}
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

export default Level4DeepfakeDetective;
