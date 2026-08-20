import React, { useState, useMemo } from 'react';
import { ArrowLeft, ChevronRight, Shield, AlertTriangle, Lock } from 'lucide-react';
import styles from './EthicsLevels.module.css';

const FIELDS = [
  { id: 'name', label: '👤 Full Name', placeholder: 'Enter your name', risk: 5, riskCategory: 'low', hackerUse: 'Can be used for social engineering and personalized phishing attacks.' },
  { id: 'age', label: '🎂 Age', placeholder: 'Enter your age', risk: 8, riskCategory: 'low', hackerUse: 'Combined with other info, helps build a complete identity profile.' },
  { id: 'city', label: '🏙️ City', placeholder: 'Enter your city', risk: 6, riskCategory: 'low', hackerUse: 'Narrows down location for targeted scams.' },
  { id: 'school', label: '🏫 School Name', placeholder: 'Enter your school', risk: 15, riskCategory: 'medium', hackerUse: 'Can be used to impersonate school staff or send fake school notices.' },
  { id: 'phone', label: '📱 Phone Number', placeholder: 'Enter phone number', risk: 25, riskCategory: 'high', hackerUse: 'Used for spam calls, OTP fraud, SIM swapping attacks, and phone-based scams.' },
  { id: 'email', label: '📧 Email Address', placeholder: 'Enter your email', risk: 18, riskCategory: 'medium', hackerUse: 'Target for phishing emails, password reset attacks, and spam.' },
  { id: 'address', label: '🏠 Home Address', placeholder: 'Enter full address', risk: 28, riskCategory: 'high', hackerUse: 'Physical security risk — stalking, robbery, or identity theft.' },
  { id: 'aadhaar', label: '🆔 Aadhaar Number', placeholder: 'Enter Aadhaar', risk: 35, riskCategory: 'critical', hackerUse: 'Can be used to open bank accounts, take loans, or commit identity fraud in your name.' },
  { id: 'income', label: '💰 Parent\'s Monthly Income', placeholder: 'Enter income', risk: 20, riskCategory: 'high', hackerUse: 'Used for targeted financial scams and fake loan offers.' },
  { id: 'password', label: '🔑 Favourite Password', placeholder: 'Enter password', risk: 30, riskCategory: 'critical', hackerUse: 'Direct access to your accounts if you reuse passwords across sites.' },
];

const Level5PrivacyEscapeRoom = ({ onBackToHub, onComplete }) => {
  const [formValues, setFormValues] = useState({});
  const [phase, setPhase] = useState('form'); // form | report
  const [revealedFields, setRevealedFields] = useState([]);

  const filledFields = FIELDS.filter(f => formValues[f.id]?.trim());
  
  const riskScore = useMemo(() => {
    let total = 0;
    filledFields.forEach(f => { total += f.risk; });
    return Math.min(total, 100);
  }, [filledFields]);

  const getMeterColor = () => {
    if (riskScore < 25) return '#00FF88';
    if (riskScore < 50) return '#FFCC00';
    if (riskScore < 75) return '#FF6B00';
    return '#FF3366';
  };

  const getMeterLabel = () => {
    if (riskScore < 25) return 'Low Risk';
    if (riskScore < 50) return 'Moderate Risk';
    if (riskScore < 75) return 'High Risk!';
    return '🚨 CRITICAL DANGER!';
  };

  const handleChange = (fieldId, value) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleShowReport = () => {
    setPhase('report');
    // Progressively reveal fields
    filledFields.forEach((_, i) => {
      setTimeout(() => {
        setRevealedFields(prev => [...prev, i]);
      }, i * 400);
    });
  };

  return (
    <div className={styles.levelPage}>
      <div className={styles.scanlines} />

      {/* Nav */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToHub}>
          <ArrowLeft size={16} /> Back to Arena
        </button>
        <span className={styles.navTitle}>Mission 5 · Privacy Escape Room</span>
        <div className={styles.navScore} style={{
          color: getMeterColor(),
          background: `${getMeterColor()}12`,
          borderColor: `${getMeterColor()}30`
        }}>
          <Shield size={14} /> Risk: {riskScore}%
        </div>
      </nav>

      <div className={styles.content}>
        {/* Header */}
        <div className={styles.levelHeader}>
          <div className={styles.levelBadge} style={{ background: 'rgba(0, 255, 136, 0.1)', color: '#00FF88', borderColor: 'rgba(0, 255, 136, 0.25)' }}>
            🔐 Level 5 · Medium
          </div>
          <h1 className={styles.levelTitle}>
            Privacy <em>Escape Room</em>
          </h1>
          <p className={styles.levelSubtitle}>
            {phase === 'form'
              ? 'This friendly app wants to know about you! Fill in what you\'re comfortable sharing. Watch the privacy risk meter change...'
              : 'Here\'s what could happen with the data you shared.'
            }
          </p>
        </div>

        {/* Privacy Risk Meter */}
        <div className={styles.meterContainer}>
          <div className={styles.meterLabel}>
            <span style={{ color: getMeterColor() }}>
              <Shield size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {getMeterLabel()}
            </span>
            <span style={{ color: getMeterColor(), fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
              {riskScore}%
            </span>
          </div>
          <div className={styles.meterTrack}>
            <div className={styles.meterFill} style={{
              width: `${riskScore}%`,
              background: `linear-gradient(90deg, #00FF88, ${getMeterColor()})`
            }} />
          </div>
        </div>

        {/* FORM PHASE */}
        {phase === 'form' && (
          <>
            {/* Fake App Header */}
            <div className={styles.gameCard} style={{
              textAlign: 'center', marginBottom: 24, padding: '24px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.06), rgba(178, 0, 255, 0.04))',
              borderColor: 'rgba(0, 240, 255, 0.15)'
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎮</div>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.3rem', fontWeight: 600, marginBottom: 6 }}>
                SuperFun Quiz App
              </h3>
              <p style={{ color: '#8B949E', fontSize: '0.88rem' }}>
                "Sign up now to unlock amazing quizzes and win exciting prizes! 🎁"
              </p>
            </div>

            {/* Form Fields */}
            <div className={styles.gameCard}>
              {FIELDS.map(field => (
                <div key={field.id} className={styles.formField}>
                  <label className={styles.formLabel}>
                    {field.label}
                    {field.riskCategory === 'critical' && (
                      <span style={{ color: '#FF3366', fontSize: '0.72rem', fontWeight: 700 }}>⚠️ SENSITIVE</span>
                    )}
                    {field.riskCategory === 'high' && (
                      <span style={{ color: '#FF6B00', fontSize: '0.72rem', fontWeight: 700 }}>⚠️ RISKY</span>
                    )}
                  </label>
                  <input
                    className={styles.formInput}
                    placeholder={field.placeholder}
                    value={formValues[field.id] || ''}
                    onChange={e => handleChange(field.id, e.target.value)}
                    type={field.id === 'password' ? 'text' : 'text'}
                  />
                </div>
              ))}

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button className={styles.btnDanger} onClick={handleShowReport}>
                  <AlertTriangle size={16} /> See What Happens With Your Data
                </button>
              </div>
            </div>
          </>
        )}

        {/* REPORT PHASE */}
        {phase === 'report' && (
          <div className={styles.revealPanel}>
            <div className={styles.gameCard} style={{ marginBottom: 24 }}>
              <h3 style={{
                fontFamily: 'Outfit, sans-serif', fontSize: '1.4rem', fontWeight: 700,
                textAlign: 'center', marginBottom: 20, color: '#FF3366'
              }}>
                🚨 Data Exposure Report
              </h3>
              <p style={{ textAlign: 'center', color: '#8B949E', marginBottom: 24, fontSize: '0.9rem' }}>
                You shared {filledFields.length} piece{filledFields.length !== 1 ? 's' : ''} of personal information. 
                Here's what a hacker could do with each:
              </p>

              {filledFields.map((field, i) => (
                <div
                  key={field.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 12,
                    marginBottom: 12,
                    background: field.riskCategory === 'critical' ? 'rgba(255, 51, 102, 0.08)' :
                                field.riskCategory === 'high' ? 'rgba(255, 107, 0, 0.06)' :
                                field.riskCategory === 'medium' ? 'rgba(255, 204, 0, 0.05)' :
                                'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${
                      field.riskCategory === 'critical' ? 'rgba(255, 51, 102, 0.2)' :
                      field.riskCategory === 'high' ? 'rgba(255, 107, 0, 0.15)' :
                      field.riskCategory === 'medium' ? 'rgba(255, 204, 0, 0.12)' :
                      'rgba(255, 255, 255, 0.06)'
                    }`,
                    opacity: revealedFields.includes(i) ? 1 : 0.2,
                    transform: revealedFields.includes(i) ? 'translateX(0)' : 'translateX(20px)',
                    transition: 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '0.92rem' }}>
                      {field.label}
                    </span>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                      textTransform: 'uppercase', fontFamily: 'Outfit, sans-serif',
                      background: field.riskCategory === 'critical' ? 'rgba(255, 51, 102, 0.15)' :
                                  field.riskCategory === 'high' ? 'rgba(255, 107, 0, 0.12)' :
                                  'rgba(255, 204, 0, 0.1)',
                      color: field.riskCategory === 'critical' ? '#FF3366' :
                             field.riskCategory === 'high' ? '#FF6B00' :
                             field.riskCategory === 'medium' ? '#FFCC00' : '#8B949E'
                    }}>
                      {field.riskCategory}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#8B949E', lineHeight: 1.5 }}>
                    You shared: <strong style={{ color: '#f4f1ea' }}>"{formValues[field.id]}"</strong>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#c4c0d4', marginTop: 6, lineHeight: 1.5 }}>
                    <Lock size={12} style={{ verticalAlign: 'middle', marginRight: 4, color: '#FF3366' }} />
                    {field.hackerUse}
                  </div>
                </div>
              ))}

              {filledFields.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛡️</div>
                  <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 600, color: '#00FF88' }}>
                    You didn't share anything!
                  </div>
                  <p style={{ color: '#8B949E', marginTop: 8 }}>
                    That's actually the safest choice. Smart move!
                  </p>
                </div>
              )}
            </div>

            <div className={`${styles.takeaway}`}>
              <div className={styles.takeawayIcon}>🔐</div>
              <div className={styles.takeawayTitle}>Guard Your Digital Footprint</div>
              <div className={styles.takeawayText}>
                <strong>Every piece of data you share online leaves a permanent trace.</strong> Apps often ask for 
                much more information than they actually need. Before filling any form, ask yourself: 
                "Does this app <strong>really</strong> need my Aadhaar number / phone / address to work?" 
                If the answer is no — don't share it!
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className={styles.btnPrimary} onClick={() => { if (onComplete) onComplete(); onBackToHub(); }}>
                <ChevronRight size={16} /> Back to Arena
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Level5PrivacyEscapeRoom;
