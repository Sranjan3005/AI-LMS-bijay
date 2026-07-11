import React, { useState } from 'react';
import { CheckCircle, X, ChevronDown, ChevronUp, BrainCircuit, Beaker, Target, Lightbulb, Wrench } from 'lucide-react';

const QA_MAP = {
  chefs_choice: { title: "Chef’s Choice: Why this brain?", icon: <BrainCircuit size={20} /> },
  healthy_snacks: { title: "Healthy Snacks: What did we feed it?", icon: <Beaker size={20} /> },
  guessing_game: { title: "The Guessing Game: Genius or confused?", icon: <Target size={20} /> },
  tricky_test: { title: "The Tricky Test: Can you fool it?", icon: <Lightbulb size={20} /> },
  fix_it_mode: { title: "Fix-It Mode: How to make it smarter?", icon: <Wrench size={20} /> },
};

const ResultsOverlay = ({ result, scenario, onClose }) => {
  const [expandedSection, setExpandedSection] = useState('chefs_choice');

  let explanationData = {};
  if (result.explanation) {
    try {
      explanationData = JSON.parse(result.explanation);
    } catch (e) {
      explanationData = { fallback: result.explanation };
    }
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
      padding: '40px'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', maxWidth: '1200px', 
        background: 'rgba(25, 28, 41, 0.95)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh'
      }}>
        
        {/* Header */}
        <div style={{ padding: '25px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {result.success ? (
              <CheckCircle size={32} color="var(--accent-green)" />
            ) : (
              <X size={32} color="var(--accent-red)" />
            )}
            <h2 style={{ fontSize: '1.8rem', margin: 0, color: result.success ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {result.success ? 'Experiment Complete!' : 'The AI Got Confused!'}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={28} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
          
          {!result.success && result.stderr ? (
             <div style={{
              background: 'rgba(255, 51, 102, 0.1)',
              padding: '20px',
              borderRadius: '8px',
              color: 'var(--accent-red)',
              border: '1px solid rgba(255, 51, 102, 0.3)',
              marginBottom: '20px'
            }}>
              <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '10px' }}><Wrench size={20}/> Technical Hiccup</h3>
              <p style={{ margin: 0, lineHeight: '1.6' }}>
                Something went wrong while training the model. The code or data had an issue!
                Check if you fed it the right kind of data.
              </p>
            </div>
          ) : null}

          {/* Side-by-side layout for Image and QA */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
            
            {/* Left Column: Output Graph */}
            <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column' }}>
              {result.success && result.output_image && (
                <div style={{ textAlign: 'center', background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.2)', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <BrainCircuit size={24} /> Model Visualization
                  </h3>
                  <img 
                    src={`data:image/jpeg;base64,${result.output_image}`} 
                    alt="Model Output Plot" 
                    style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--glass-border)', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }}
                  />
                </div>
              )}
            </div>

            {/* Right Column: QA Explanation */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
              {/* Authored outcome guide (seeded) — shown above the personalised LLM analysis */}
              {result.success && scenario?.outcome_guide && (
                <div style={{ background: 'rgba(255,159,10,0.06)', padding: '18px 20px', borderRadius: '8px', border: '1px solid rgba(255,159,10,0.3)', marginBottom: '15px' }}>
                  <h3 style={{ margin: '0 0 8px', color: '#FF9F0A', fontSize: '1.05rem' }}>🔎 What to look for</h3>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem' }}>{scenario.outcome_guide}</p>
                </div>
              )}
              {result.success && explanationData.fallback ? (
                <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
                  {explanationData.fallback}
                </div>
              ) : result.success ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>AI Tutor Analysis</h3>
                  {Object.entries(QA_MAP).map(([key, info]) => {
                    const content = explanationData[key];
                    if (!content) return null;
                    const isExpanded = expandedSection === key;

                    return (
                      <div key={key} style={{
                        background: isExpanded ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isExpanded ? 'rgba(0, 240, 255, 0.3)' : 'var(--glass-border)'}`,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease'
                      }}>
                        <div 
                          onClick={() => setExpandedSection(isExpanded ? null : key)}
                          style={{ 
                            padding: '15px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', 
                            justifyContent: 'space-between', color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-primary)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {info.icon}
                            {info.title}
                          </div>
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                        
                        {isExpanded && (
                          <div style={{ 
                            padding: '0 20px 20px 55px', 
                            fontSize: '1rem', 
                            lineHeight: '1.6', 
                            color: 'var(--text-secondary)' 
                          }}>
                            {content}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '20px 25px', borderTop: '1px solid var(--glass-border)', textAlign: 'right' }}>
          <button className="btn-primary" onClick={onClose}>
            Awesome! Let's Continue
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResultsOverlay;
