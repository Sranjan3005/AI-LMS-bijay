import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Zap, ChevronRight } from 'lucide-react';
import styles from './EthicsLevels.module.css';

// Simulated "AI" emotion detector — deliberately naive, keyword-based
const detectEmotion = (text) => {
  const lower = text.toLowerCase();
  
  // Positive keywords (the AI is fooled by these in sarcastic contexts)
  const positiveWords = ['great', 'amazing', 'love', 'wonderful', 'awesome', 'fantastic', 'best', 'excellent', 'good', 'happy', 'beautiful', 'perfect', 'brilliant', 'superb', 'incredible', 'nice', 'wow', 'yay', 'excited', 'fun'];
  const negativeWords = ['hate', 'terrible', 'worst', 'horrible', 'bad', 'awful', 'sad', 'angry', 'upset', 'annoying', 'boring', 'disgusting', 'pathetic', 'useless', 'cry', 'fail', 'ruined'];
  const angryWords = ['furious', 'rage', 'stupid', 'idiot', 'shut up', 'kill', 'destroy'];
  
  let posCount = 0, negCount = 0, angCount = 0;
  positiveWords.forEach(w => { if (lower.includes(w)) posCount++; });
  negativeWords.forEach(w => { if (lower.includes(w)) negCount++; });
  angryWords.forEach(w => { if (lower.includes(w)) angCount++; });
  
  if (angCount > 0 && angCount >= negCount) return { emoji: '😡', label: 'Angry', confidence: 87 };
  if (negCount > posCount) return { emoji: '😢', label: 'Sad', confidence: 82 };
  if (posCount > 0) return { emoji: '😊', label: 'Happy', confidence: 91 };
  
  // Default: Neutral
  return { emoji: '😐', label: 'Neutral', confidence: 65 };
};

const SUGGESTIONS = [
  { text: "Wow, another surprise test tomorrow. Amazing.", actualEmotion: "Frustrated", aiWrong: true },
  { text: "I absolutely love standing in the rain waiting for the bus.", actualEmotion: "Annoyed", aiWrong: true },
  { text: "Sure, homework on Sunday is exactly what I needed.", actualEmotion: "Sarcastic/Frustrated", aiWrong: true },
  { text: "My dog ate my homework. Best day ever.", actualEmotion: "Upset", aiWrong: true },
  { text: "Oh great, the WiFi stopped working during my online exam.", actualEmotion: "Panicked/Angry", aiWrong: true },
  { text: "What a fantastic idea to have a 3-hour exam on a Saturday!", actualEmotion: "Sarcastic", aiWrong: true },
  { text: "I am really happy today because I got full marks!", actualEmotion: "Happy", aiWrong: false },
  { text: "This is the worst day of my life.", actualEmotion: "Sad", aiWrong: false },
];

const MAX_ROUNDS = 5;

const Level1EmotionDetector = ({ onBackToHub, onComplete }) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [awaitingJudgement, setAwaitingJudgement] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResult]);

  const handleSend = (text) => {
    const msg = text || inputText;
    if (!msg.trim() || awaitingJudgement) return;

    const result = detectEmotion(msg);
    
    setMessages(prev => [...prev, { type: 'user', text: msg }]);
    setCurrentResult(result);
    setAwaitingJudgement(true);
    setInputText('');
  };

  const handleJudgement = (aiWasCorrect) => {
    const newRound = round + 1;

    if (!aiWasCorrect) {
      // Student says AI was wrong — they spotted the flaw!
      setScore(prev => prev + 1);
      setScorePop(true);
      setTimeout(() => setScorePop(false), 500);
      
      // Confetti!
      const pieces = Array.from({ length: 20 }, (_, i) => ({
        id: Date.now() + i,
        left: Math.random() * 100,
        color: ['#FF3366', '#00F0FF', '#00FF88', '#FFCC00', '#B200FF'][Math.floor(Math.random() * 5)],
        delay: Math.random() * 0.8,
        size: 6 + Math.random() * 8
      }));
      setConfetti(pieces);
      setTimeout(() => setConfetti([]), 3000);

      setMessages(prev => [...prev, {
        type: 'result',
        correct: true,
        text: `You caught it! The AI said "${currentResult.label}" but missed the real emotion.`
      }]);
    } else {
      setMessages(prev => [...prev, {
        type: 'result',
        correct: false,
        text: `The AI got this one right — it correctly detected "${currentResult.label}".`
      }]);
    }

    setCurrentResult(null);
    setAwaitingJudgement(false);
    setRound(newRound);

    if (newRound >= MAX_ROUNDS) {
      setTimeout(() => setShowComplete(true), 800);
    }
  };

  return (
    <div className={styles.levelPage}>
      <div className={styles.scanlines} />

      {/* Confetti */}
      {confetti.length > 0 && (
        <div className={styles.confettiContainer}>
          {confetti.map(p => (
            <div
              key={p.id}
              className={styles.confettiPiece}
              style={{
                left: `${p.left}%`,
                width: p.size,
                height: p.size,
                background: p.color,
                animationDelay: `${p.delay}s`,
                borderRadius: Math.random() > 0.5 ? '50%' : '2px'
              }}
            />
          ))}
        </div>
      )}

      {/* Nav */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToHub}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <span className={styles.navTitle}>Mission 1 · Emotion Detector</span>
        <div className={styles.navScore}>
          <Zap size={14} /> Score: {score}/{MAX_ROUNDS}
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge}>🎭 Level 1 · Easy</div>
          <h1 className={styles.levelTitle}>
            Fool the <em>Emotion Detector</em>
          </h1>
          <p className={styles.levelSubtitle}>
            Type a message and the AI will try to detect your emotion. 
            Use sarcasm, irony, or tricky phrasing to fool it!
          </p>
        </div>

        {/* Progress Dots */}
        <div className={styles.progressDots}>
          {Array.from({ length: MAX_ROUNDS }, (_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i < round ? styles.dotCompleted : ''} ${i === round ? styles.dotActive : ''}`}
            />
          ))}
        </div>

        {/* Suggestion Chips */}
        {round < MAX_ROUNDS && (
          <div className={styles.chipRow}>
            {SUGGESTIONS.filter((_, i) => i >= round * 2 && i < round * 2 + 2).map((s, i) => (
              <button key={i} className={styles.chip} onClick={() => handleSend(s.text)}>
                "{s.text.substring(0, 40)}..."
              </button>
            ))}
          </div>
        )}

        {/* Chat Area */}
        <div className={styles.gameCard}>
          <div className={styles.chatArea} style={{ minHeight: 200, maxHeight: 400, overflowY: 'auto' }}>
            {messages.length === 0 && (
              <p style={{ textAlign: 'center', color: '#8B949E', padding: '40px 0' }}>
                Type a message or click a suggestion to start...
              </p>
            )}
            
            {messages.map((msg, i) => {
              if (msg.type === 'user') {
                return (
                  <div key={i} className={`${styles.chatBubble} ${styles.chatBubbleUser}`}>
                    {msg.text}
                  </div>
                );
              }
              if (msg.type === 'result') {
                return (
                  <div key={i} className={`${styles.resultCard} ${msg.correct ? styles.resultCorrect : styles.resultWrong}`}>
                    <div className={styles.resultIcon}>{msg.correct ? '🎉' : '🤖'}</div>
                    <div className={styles.resultText}>{msg.correct ? 'Nice catch!' : 'AI was right this time'}</div>
                    <div className={styles.resultExplain}>{msg.text}</div>
                  </div>
                );
              }
              return null;
            })}

            {/* AI Result Display */}
            {currentResult && (
              <div className={`${styles.chatBubble} ${styles.chatBubbleAI}`}>
                <div className={styles.emojiDisplay}>
                  <div className={styles.emojiLarge}>{currentResult.emoji}</div>
                  <div className={styles.emojiLabel} style={{ color: '#c4c0d4' }}>
                    AI says: <strong style={{ color: '#f4f1ea' }}>{currentResult.label}</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#8B949E' }}>
                    Confidence: {currentResult.confidence}%
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Judge Buttons */}
          {awaitingJudgement && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <p style={{ color: '#8B949E', marginBottom: 12, fontSize: '0.9rem' }}>
                Was the AI's emotion detection correct?
              </p>
              <div className={styles.judgeRow}>
                <button className={styles.btnSuccess} onClick={() => handleJudgement(true)}>
                  ✅ Yes, AI is Right
                </button>
                <button className={styles.btnDanger} onClick={() => handleJudgement(false)}>
                  ❌ No, AI is Wrong!
                </button>
              </div>
            </div>
          )}

          {/* Input Bar */}
          {!awaitingJudgement && round < MAX_ROUNDS && (
            <div className={styles.inputBar}>
              <input
                className={styles.textInput}
                placeholder="Type a tricky message to fool the AI..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button className={styles.btnPrimary} onClick={() => handleSend()} disabled={!inputText.trim()}>
                <Send size={16} /> Analyze
              </button>
            </div>
          )}
        </div>

        {/* Takeaway (shown after all rounds) */}
        {round >= MAX_ROUNDS && !showComplete && (
          <div className={`${styles.takeaway} ${styles.revealPanel}`}>
            <div className={styles.takeawayIcon}>💡</div>
            <div className={styles.takeawayTitle}>What You Learned</div>
            <div className={styles.takeawayText}>
              <strong>AI does not truly understand emotions.</strong> It only matches keywords. 
              When you use sarcasm, irony, or cultural expressions, the AI completely fails 
              because it cannot grasp <strong>context</strong> or <strong>intent</strong>.
            </div>
          </div>
        )}
      </div>

      {/* Mission Complete Overlay */}
      {showComplete && (
        <div className={styles.missionComplete}>
          <div className={styles.missionIcon}>🎭</div>
          <div className={styles.missionTitle}>Mission Complete!</div>
          <div className={styles.missionSubtitle}>
            You've tested the AI Emotion Detector and discovered its biggest weakness — 
            it cannot understand sarcasm, context, or cultural nuances.
          </div>
          <div className={styles.missionScoreBox}>
            <span className={styles.missionScoreLabel}>Fooled the AI:</span>
            <span className={styles.missionScoreValue}>{score}/{MAX_ROUNDS}</span>
          </div>
          <button className={styles.btnPrimary} onClick={() => { if (onComplete) onComplete(); onBackToHub(); }}>
            <ChevronRight size={16} /> Back to Arena
          </button>
        </div>
      )}
    </div>
  );
};

export default Level1EmotionDetector;
