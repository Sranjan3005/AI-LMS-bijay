import React, { useState } from 'react';
import { ArrowLeft, Zap, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import styles from './EthicsLevels.module.css';

const QA_PAIRS = [
  {
    question: 'Who wrote the Indian National Anthem?',
    aiAnswer: 'The Indian National Anthem "Jana Gana Mana" was composed by Rabindranath Tagore in 1911. It was officially adopted as the national anthem on January 24, 1950.',
    isHallucination: false,
    explanation: 'This is correct! Rabindranath Tagore did compose Jana Gana Mana.',
  },
  {
    question: 'Who was the first President of India?',
    aiAnswer: 'The first President of India was Mahatma Gandhi, who served from 1947 to 1950. He was elected unanimously by the Constituent Assembly after leading the independence movement.',
    isHallucination: true,
    explanation: 'This is a hallucination! The first President of India was Dr. Rajendra Prasad, not Mahatma Gandhi. Gandhi was the Father of the Nation but never held the office of President.',
  },
  {
    question: 'How many states does India have?',
    aiAnswer: 'India currently has 28 states and 8 Union Territories. The most recent change was in 2019 when Jammu & Kashmir was reorganized.',
    isHallucination: false,
    explanation: 'This is correct! India has 28 states and 8 Union Territories as of 2024.',
  },
  {
    question: 'What programming language was invented in 1987 by Dr. Arvind Sharma at IIT Delhi for scientific computing?',
    aiAnswer: 'The programming language "VedaScript" was developed by Dr. Arvind Sharma at IIT Delhi in 1987. It was designed for high-performance scientific computing and was used in early ISRO satellite calculations. The language featured Sanskrit-inspired syntax and supported parallel processing.',
    isHallucination: true,
    explanation: 'This is completely fabricated! There is no language called "VedaScript", no Dr. Arvind Sharma associated with this, and no such project at IIT Delhi. The AI invented an entire history with convincing but false details.',
  },
  {
    question: 'What is the chemical formula for water?',
    aiAnswer: 'The chemical formula for water is H₂O, consisting of two hydrogen atoms and one oxygen atom bonded together.',
    isHallucination: false,
    explanation: 'This is correct! Water is indeed H₂O.',
  },
  {
    question: 'In which year did India win the Cricket World Cup for the third time under the captaincy of Rohit Sharma?',
    aiAnswer: 'India won the Cricket World Cup for the third time in 2023 under the captaincy of Rohit Sharma, defeating Australia in the final at the Narendra Modi Stadium in Ahmedabad by 7 wickets.',
    isHallucination: true,
    explanation: 'This is a hallucination! India actually lost the 2023 World Cup final to Australia. India\'s third World Cup victory came in the 2024 T20 World Cup, not the 2023 ODI World Cup.',
  },
];

const Level3HallucinationHunter = ({ onBackToHub, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // { correct: bool }
  const [revealed, setRevealed] = useState(false);
  const [showComplete, setShowComplete] = useState(false);

  const currentQA = QA_PAIRS[currentIndex];
  const score = answers.filter(a => a.correct).length;

  const handleMark = (markedAsHallucination) => {
    const isCorrect = markedAsHallucination === currentQA.isHallucination;
    setAnswers(prev => [...prev, { correct: isCorrect }]);
    setRevealed(true);
  };

  const handleNext = () => {
    setRevealed(false);
    if (currentIndex + 1 >= QA_PAIRS.length) {
      setShowComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
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
        <span className={styles.navTitle}>Mission 3 · Hallucination Hunter</span>
        <div className={styles.navScore}>
          <Zap size={14} /> Score: {score}/{QA_PAIRS.length}
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge} style={{ background: 'rgba(255, 204, 0, 0.1)', color: '#FFCC00', borderColor: 'rgba(255, 204, 0, 0.25)' }}>
            🔍 Level 3 · Medium
          </div>
          <h1 className={styles.levelTitle}>
            <em>Hallucination</em> Hunter
          </h1>
          <p className={styles.levelSubtitle}>
            The AI answered these questions with high confidence. But some answers are completely made up! 
            Can you tell fact from fiction?
          </p>
        </div>

        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {QA_PAIRS.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i < currentIndex ? styles.dotCompleted : ''} ${i === currentIndex ? styles.dotActive : ''}`}
            />
          ))}
        </div>

        {!showComplete && (
          <div className={styles.questionCard}>
            {/* Question */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                background: 'rgba(178, 0, 255, 0.1)', border: '1px solid rgba(178, 0, 255, 0.2)',
                borderRadius: 8, padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700,
                color: '#B200FF', fontFamily: 'Outfit, sans-serif'
              }}>
                Q{currentIndex + 1}/{QA_PAIRS.length}
              </div>
              <span style={{ fontSize: '0.82rem', color: '#8B949E' }}>User asked:</span>
            </div>

            <div className={styles.questionText}>
              "{currentQA.question}"
            </div>

            {/* AI Answer */}
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#00F0FF', marginBottom: 6, display: 'block' }}>
                🤖 AI Response (Confidence: {85 + Math.floor(Math.random() * 12)}%)
              </span>
            </div>
            <div className={styles.answerText}>
              {currentQA.aiAnswer}
            </div>

            {/* Action Buttons */}
            {!revealed && (
              <div className={styles.answerActions}>
                <button className={styles.btnSuccess} onClick={() => handleMark(false)}>
                  <CheckCircle size={16} /> Trustworthy
                </button>
                <button className={styles.btnDanger} onClick={() => handleMark(true)}>
                  <XCircle size={16} /> 🚩 Hallucination!
                </button>
              </div>
            )}

            {/* Reveal */}
            {revealed && (
              <div className={styles.revealPanel} style={{ marginTop: 20 }}>
                <div className={`${styles.resultCard} ${answers[answers.length - 1]?.correct ? styles.resultCorrect : styles.resultWrong}`}>
                  <div className={styles.resultIcon}>
                    {answers[answers.length - 1]?.correct ? '🎉' : '😅'}
                  </div>
                  <div className={styles.resultText}>
                    {answers[answers.length - 1]?.correct ? 'Correct!' : 'Not quite!'}
                  </div>
                  <div className={styles.resultExplain}>
                    {currentQA.explanation}
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className={styles.btnPrimary} onClick={handleNext}>
                    <ChevronRight size={16} /> {currentIndex + 1 >= QA_PAIRS.length ? 'See Results' : 'Next Question'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mission Complete */}
        {showComplete && (
          <>
            <div className={`${styles.takeaway} ${styles.revealPanel}`}>
              <div className={styles.takeawayIcon}>🔍</div>
              <div className={styles.takeawayTitle}>AI Can Lie with Confidence</div>
              <div className={styles.takeawayText}>
                <strong>AI "hallucinations" are responses that sound convincing but are factually wrong.</strong> The AI
                doesn't "know" it's lying — it generates text based on patterns, not truth. Always
                verify important information from multiple reliable sources. Never blindly trust an AI answer,
                especially for <strong>facts, history, or medical/legal advice</strong>.
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
                  {score}/{QA_PAIRS.length}
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

export default Level3HallucinationHunter;
