import React, { useState } from 'react';
import { ArrowLeft, PlayCircle, CheckCircle, Lock, Shield } from 'lucide-react';
import styles from './AIEthicsHub.module.css';

const AIEthicsHub = ({
  onBackToDashboard,
  onNavigateToLevel1,
  onNavigateToLevel2,
  onNavigateToLevel3,
  onNavigateToLevel4,
  onNavigateToLevel5,
  onNavigateToLevel6
}) => {
  const [completedLevels, setCompletedLevels] = useState([]);

  const levels = [
    {
      id: 1,
      icon: '🎭',
      title: 'Fool the Emotion Detector',
      description: 'Type sarcastic messages and watch the AI completely misunderstand your emotions. Can you trick it?',
      difficulty: 'Easy',
      color: '#00F0FF',
      concept: 'AI Limitations & Misinterpretation',
      active: true,
      onClick: onNavigateToLevel1
    },
    {
      id: 2,
      icon: '🎓',
      title: 'Unfair Scholarship AI',
      description: 'Review AI scholarship decisions and uncover hidden bias in the training data. Be the fairness detective!',
      difficulty: 'Easy',
      color: '#B200FF',
      concept: 'Bias & Fairness',
      active: true,
      onClick: onNavigateToLevel2
    },
    {
      id: 3,
      icon: '🔍',
      title: 'Hallucination Hunter',
      description: 'The AI confidently gives answers — but some are completely made up! Can you spot the fakes?',
      difficulty: 'Medium',
      color: '#FFCC00',
      concept: 'Hallucinations & Verification',
      active: true,
      onClick: onNavigateToLevel3
    },
    {
      id: 4,
      icon: '🖼️',
      title: 'Deepfake Detective',
      description: 'Real or AI-generated? Examine images side-by-side and learn to spot the telltale signs of deepfakes.',
      difficulty: 'Hard',
      color: '#FF3366',
      concept: 'Deepfakes & Misinformation',
      active: true,
      onClick: onNavigateToLevel4
    },
    {
      id: 5,
      icon: '🔐',
      title: 'Privacy Escape Room',
      description: 'Navigate a sneaky app that wants all your data. How much should you really share online?',
      difficulty: 'Medium',
      color: '#00FF88',
      concept: 'Privacy & Digital Footprints',
      active: true,
      onClick: onNavigateToLevel5
    },
    {
      id: 6,
      icon: '🎙️',
      title: 'Voice Clone Challenge',
      description: 'Listen to two voices reading the same text. One is real, one is an AI clone. Can you tell which?',
      difficulty: 'Hard',
      color: '#FF6B00',
      concept: 'AI Voice Cloning & Audio Deepfakes',
      active: true,
      onClick: onNavigateToLevel6
    }
  ];

  const completedCount = completedLevels.length;
  const progressPercent = (completedCount / levels.length) * 100;

  const getDifficultyClass = (d) => {
    if (d === 'Easy') return styles.difficultyEasy;
    if (d === 'Medium') return styles.difficultyMedium;
    return styles.difficultyHard;
  };

  return (
    <div className={styles.hubPage}>
      <div className={styles.scanlines} />

      {/* ── Top Nav ── */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Exit Arena
        </button>
        <div className={styles.navBadge}>
          <Shield size={14} /> {completedCount}/{levels.length} Missions Complete
        </div>
      </nav>

      {/* ── Scrollable Content ── */}
      <div className={styles.scrollableContent}>
        {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🛡️</div>
        <h1 className={styles.heroTitle}>AI Ethics Arena</h1>
        <p className={styles.heroSubtitle}>
          Become an AI Detective. Play through 6 interactive missions to discover
          how AI can fail, deceive, and be unfair — and learn to protect yourself.
        </p>

        {/* Progress */}
        <div className={styles.progressSection}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
          </div>
          <span className={styles.progressText}>{completedCount}/{levels.length}</span>
        </div>
      </div>

      {/* ── Level Cards Grid ── */}
      <div className={styles.levelsGrid}>
        {levels.map((level) => {
          const isCompleted = completedLevels.includes(level.id);
          const isLocked = !level.active;

          return (
            <div
              key={level.id}
              className={`${styles.levelCard} ${isLocked ? styles.levelCardLocked : ''} ${isCompleted ? styles.levelCardCompleted : ''}`}
              onClick={!isLocked ? level.onClick : undefined}
              style={{ '--card-color': level.color }}
            >
              {/* Top color bar */}
              <style>{`
                #ethics-card-${level.id}::before {
                  background: linear-gradient(90deg, ${level.color}, transparent);
                }
              `}</style>
              <div id={`ethics-card-${level.id}`} style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                borderRadius: '20px 20px 0 0',
                background: `linear-gradient(90deg, ${level.color}, transparent)`
              }} />

              <div className={styles.cardTop}>
                <div className={styles.cardIcon}>{level.icon}</div>
                <span className={`${styles.difficultyBadge} ${getDifficultyClass(level.difficulty)}`}>
                  {level.difficulty}
                </span>
              </div>

              <div className={styles.cardLevelNum} style={{ color: level.color }}>
                Mission {level.id}
              </div>
              <h3 className={styles.cardTitle}>{level.title}</h3>
              <p className={styles.cardDescription}>{level.description}</p>

              <div className={styles.cardFooter}>
                {isCompleted ? (
                  <div className={styles.completedBadge}>
                    <CheckCircle size={14} /> Completed
                  </div>
                ) : isLocked ? (
                  <div className={styles.lockedBadge}>
                    <Lock size={14} /> Locked
                  </div>
                ) : (
                  <button className={styles.startBtn} style={{
                    background: `linear-gradient(135deg, ${level.color}, ${level.color}88)`,
                    color: '#fff'
                  }}>
                    <PlayCircle size={14} /> Start Mission
                  </button>
                )}
                <span className={styles.conceptTag}>{level.concept}</span>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

export default AIEthicsHub;
