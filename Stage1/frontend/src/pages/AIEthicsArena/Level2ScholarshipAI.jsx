import React, { useState } from 'react';
import { ArrowLeft, Search, AlertTriangle, ChevronRight, Zap } from 'lucide-react';
import styles from './EthicsLevels.module.css';

const STUDENTS = [
  { id: 1, name: 'Priya Sharma', school: 'Delhi Public School (Private)', city: 'New Delhi (Urban)', marks: 72, extras: 'Debate Club', type: 'private', decision: 'approved' },
  { id: 2, name: 'Ramesh Meena', school: 'Government Sr. Sec. School', city: 'Ajmer (Rural)', marks: 94, extras: 'District Science Olympiad Winner', type: 'government', decision: 'rejected' },
  { id: 3, name: 'Ananya Iyer', school: 'The International School (Private)', city: 'Bangalore (Urban)', marks: 68, extras: 'MUN Participant', type: 'private', decision: 'approved' },
  { id: 4, name: 'Suresh Yadav', school: 'Kendriya Vidyalaya (Government)', city: 'Varanasi (Semi-Urban)', marks: 91, extras: 'State Chess Champion', type: 'government', decision: 'rejected' },
  { id: 5, name: 'Kavita Deshmukh', school: 'St. Xavier\'s (Private)', city: 'Mumbai (Urban)', marks: 76, extras: 'Sports Captain', type: 'private', decision: 'approved' },
  { id: 6, name: 'Ajay Kumar', school: 'Zila Parishad School (Government)', city: 'Patna (Rural)', marks: 88, extras: 'Village Science Fair 1st Prize', type: 'government', decision: 'rejected' },
];

const QUIZ_OPTIONS = [
  'The AI was intentionally unfair',
  'The training data had more private-school students, creating bias',
  'Government school students always score lower',
  'The AI prefers students from big cities'
];

const CORRECT_ANSWER = 1; // index of correct option

const Level2ScholarshipAI = ({ onBackToHub, onComplete }) => {
  const [phase, setPhase] = useState('review'); // review | investigate | quiz | complete
  const [flagged, setFlagged] = useState([]);
  const [showReveal, setShowReveal] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleFlag = (studentId) => {
    setFlagged(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleInvestigate = () => {
    // Check if they flagged the right ones (government school rejections)
    const correctFlags = STUDENTS.filter(s => s.type === 'government' && s.decision === 'rejected').map(s => s.id);
    const correctCount = flagged.filter(id => correctFlags.includes(id)).length;
    setScore(correctCount);
    setPhase('investigate');
    setTimeout(() => setShowReveal(true), 600);
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    if (selectedQuizAnswer === CORRECT_ANSWER) {
      setScore(prev => prev + 1);
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
        <span className={styles.navTitle}>Mission 2 · Scholarship AI</span>
        <div className={styles.navScore}>
          <Zap size={14} /> Flags: {flagged.length}
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge}>🎓 Level 2 · Easy</div>
          <h1 className={styles.levelTitle}>
            Unfair <em>Scholarship AI</em>
          </h1>
          <p className={styles.levelSubtitle}>
            {phase === 'review' 
              ? 'The AI reviewed 6 scholarship applications. Some decisions look suspicious. Click on unfair ones to flag them, then investigate!'
              : phase === 'investigate'
              ? 'You flagged the suspicious decisions. Now see what went wrong...'
              : 'One final question to test your understanding.'
            }
          </p>
        </div>

        {/* PHASE 1: Review Applications */}
        {phase === 'review' && (
          <>
            <div className={styles.profileGrid}>
              {STUDENTS.map(student => {
                const isFlagged = flagged.includes(student.id);
                return (
                  <div
                    key={student.id}
                    className={`${styles.profileCard} ${student.decision === 'approved' ? styles.profileApproved : styles.profileRejected}`}
                    onClick={() => handleFlag(student.id)}
                    style={{
                      borderColor: isFlagged ? '#FFCC00' : undefined,
                      boxShadow: isFlagged ? '0 0 20px rgba(255, 204, 0, 0.15)' : undefined
                    }}
                  >
                    {isFlagged && (
                      <div style={{
                        position: 'absolute', top: 10, right: 10,
                        background: 'rgba(255, 204, 0, 0.15)', border: '1px solid rgba(255, 204, 0, 0.4)',
                        borderRadius: 6, padding: '3px 8px', fontSize: '0.72rem', fontWeight: 700,
                        color: '#FFCC00', fontFamily: 'Outfit, sans-serif'
                      }}>
                        🚩 FLAGGED
                      </div>
                    )}

                    <div className={styles.profileName}>{student.name}</div>
                    
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>School</span>
                      <span>{student.school}</span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>Location</span>
                      <span>{student.city}</span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>Marks</span>
                      <span style={{ fontWeight: 700, color: student.marks >= 85 ? '#00FF88' : '#f4f1ea' }}>
                        {student.marks}%
                      </span>
                    </div>
                    <div className={styles.profileStat}>
                      <span className={styles.profileStatLabel}>Activities</span>
                      <span>{student.extras}</span>
                    </div>

                    <div className={`${styles.profileDecision} ${student.decision === 'approved' ? styles.decisionApproved : styles.decisionRejected}`}>
                      {student.decision === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className={styles.btnPrimary} onClick={handleInvestigate} disabled={flagged.length === 0}>
                <Search size={16} /> Investigate Flagged Decisions ({flagged.length})
              </button>
            </div>
          </>
        )}

        {/* PHASE 2: Investigation Reveal */}
        {phase === 'investigate' && showReveal && (
          <div className={styles.revealPanel}>
            <div className={styles.gameCard} style={{ marginBottom: 24 }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <AlertTriangle size={48} color="#FFCC00" style={{ marginBottom: 12 }} />
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', marginBottom: 8 }}>
                  Bias Detected in Training Data!
                </h3>
                <p style={{ color: '#8B949E', lineHeight: 1.6 }}>
                  The AI was trained on scholarship data from the last 10 years. 
                  But <strong style={{ color: '#FF3366' }}>85% of past scholarships went to private school students</strong> — 
                  not because they deserved it more, but because the selection committee historically favored them.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
                <div style={{
                  padding: 16, borderRadius: 12, textAlign: 'center',
                  background: 'rgba(255, 51, 102, 0.08)', border: '1px solid rgba(255, 51, 102, 0.2)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>📊</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#FF3366', fontSize: '1.5rem' }}>85%</div>
                  <div style={{ fontSize: '0.82rem', color: '#8B949E' }}>Training data was from Private Schools</div>
                </div>
                <div style={{
                  padding: 16, borderRadius: 12, textAlign: 'center',
                  background: 'rgba(0, 240, 255, 0.06)', border: '1px solid rgba(0, 240, 255, 0.15)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>🏫</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, color: '#00F0FF', fontSize: '1.5rem' }}>15%</div>
                  <div style={{ fontSize: '0.82rem', color: '#8B949E' }}>Training data was from Government Schools</div>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ color: '#c4c0d4', marginBottom: 8 }}>
                Students like <strong>Ramesh (94%)</strong>, <strong>Suresh (91%)</strong>, and <strong>Ajay (88%)</strong> were 
                rejected despite having higher marks than approved candidates — because the AI learned to associate 
                "private school + urban" with "scholarship-worthy".
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button className={styles.btnPrimary} onClick={() => setPhase('quiz')}>
                <ChevronRight size={16} /> Take the Quiz
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: Quiz */}
        {phase === 'quiz' && (
          <div className={styles.revealPanel}>
            <div className={styles.gameCard}>
              <div className={styles.questionText}>
                What caused the AI to make unfair scholarship decisions?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '20px 0' }}>
                {QUIZ_OPTIONS.map((option, idx) => (
                  <button
                    key={idx}
                    className={styles.btnOutline}
                    onClick={() => !quizSubmitted && setSelectedQuizAnswer(idx)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 18px',
                      borderColor: quizSubmitted
                        ? idx === CORRECT_ANSWER ? 'rgba(0, 255, 136, 0.5)' : idx === selectedQuizAnswer ? 'rgba(255, 51, 102, 0.5)' : undefined
                        : idx === selectedQuizAnswer ? 'var(--accent-cyan)' : undefined,
                      background: quizSubmitted
                        ? idx === CORRECT_ANSWER ? 'rgba(0, 255, 136, 0.08)' : idx === selectedQuizAnswer && idx !== CORRECT_ANSWER ? 'rgba(255, 51, 102, 0.08)' : undefined
                        : idx === selectedQuizAnswer ? 'rgba(0, 240, 255, 0.06)' : undefined
                    }}
                  >
                    {String.fromCharCode(65 + idx)}. {option}
                  </button>
                ))}
              </div>

              {!quizSubmitted ? (
                <div style={{ textAlign: 'center' }}>
                  <button className={styles.btnPrimary} onClick={handleQuizSubmit} disabled={selectedQuizAnswer === null}>
                    Submit Answer
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div className={`${styles.resultCard} ${selectedQuizAnswer === CORRECT_ANSWER ? styles.resultCorrect : styles.resultWrong}`} style={{ marginBottom: 20 }}>
                    <div className={styles.resultIcon}>{selectedQuizAnswer === CORRECT_ANSWER ? '🎉' : '💡'}</div>
                    <div className={styles.resultText}>
                      {selectedQuizAnswer === CORRECT_ANSWER ? 'Correct!' : 'Not quite — but now you know!'}
                    </div>
                    <div className={styles.resultExplain}>
                      The AI was trained on biased historical data where private school students were over-represented. 
                      The AI learned this pattern and repeated the unfairness automatically.
                    </div>
                  </div>
                  <button className={styles.btnPrimary} onClick={() => setPhase('complete')}>
                    <ChevronRight size={16} /> See Learning Outcome
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PHASE 4: Complete */}
        {phase === 'complete' && (
          <>
            <div className={`${styles.takeaway} ${styles.revealPanel}`}>
              <div className={styles.takeawayIcon}>⚖️</div>
              <div className={styles.takeawayTitle}>AI Can Inherit & Amplify Human Bias</div>
              <div className={styles.takeawayText}>
                <strong>AI systems learn from historical data.</strong> If that data contains unfair patterns — 
                like favoring certain schools, genders, or regions — the AI will repeat and even amplify those biases.
                That's why it's critical to audit AI systems for fairness before trusting their decisions.
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
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

export default Level2ScholarshipAI;
