import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Eye, Cpu, Layers, Zap, ChevronRight, Sparkles } from 'lucide-react';

const STAGE_ICONS = [
  <Eye size={24} />,
  <Cpu size={24} />,
  <Layers size={24} />,
  <Zap size={24} />,
];

const STAGE_COLORS = ['#00F0FF', '#FF9933', '#B200FF', '#00FF88'];

const CVPipelineOverlay = ({ result, scenario, onClose }) => {
  const [activeStage, setActiveStage] = useState(-1);
  const [autoPlaying, setAutoPlaying] = useState(true);
  const [showFinal, setShowFinal] = useState(false);

  const stageImages = result?.stage_images || [];
  const stageMetadata = result?.stage_metadata || [
    { title: 'Capture', description: 'Raw input image captured.' },
    { title: 'Process', description: 'Image preprocessed and cleaned.' },
    { title: 'Understand', description: 'Features extracted and analyzed.' },
    { title: 'Decide', description: 'Final prediction made.' },
  ];

  // Auto-advance through stages
  useEffect(() => {
    if (!autoPlaying) return;

    const timer = setTimeout(() => {
      if (activeStage < stageImages.length - 1) {
        setActiveStage(prev => prev + 1);
      } else {
        setAutoPlaying(false);
        setShowFinal(true);
      }
    }, activeStage === -1 ? 500 : 1800);

    return () => clearTimeout(timer);
  }, [activeStage, autoPlaying, stageImages.length]);

  // Parse explanation
  let explanationData = {};
  if (result?.explanation) {
    try {
      explanationData = JSON.parse(result.explanation);
    } catch {
      explanationData = { fallback: result.explanation };
    }
  }

  const prediction = result?.prediction || 'Processing complete';

  return (
    <div style={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100,
      padding: '30px',
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-panel"
        style={{
          width: '100%', maxWidth: '1100px',
          background: 'rgba(15, 20, 35, 0.97)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 240, 255, 0.1)',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh',
          borderRadius: '20px',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #00F0FF, #00FF88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Sparkles size={20} color="#000" />
            </motion.div>
            <h2 style={{
              fontSize: '1.5rem', margin: 0,
              background: 'linear-gradient(90deg, #00F0FF, #00FF88)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              fontFamily: 'Outfit, sans-serif',
            }}>
              Vision Pipeline
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              color: '#c4c0d4', cursor: 'pointer',
              padding: '8px',
              display: 'flex', alignItems: 'center',
              transition: 'all 0.2s',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Pipeline Progress Bar */}
        <div style={{
          padding: '20px 30px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0',
        }}>
          {stageMetadata.map((stage, i) => (
            <React.Fragment key={i}>
              {/* Stage Node */}
              <motion.div
                onClick={() => { setAutoPlaying(false); setActiveStage(i); }}
                animate={{
                  scale: activeStage === i ? 1.15 : 1,
                  borderColor: i <= activeStage ? STAGE_COLORS[i] : 'rgba(255,255,255,0.15)',
                }}
                style={{
                  width: '52px', height: '52px', borderRadius: '50%',
                  border: '2px solid',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: i <= activeStage
                    ? `${STAGE_COLORS[i]}15`
                    : 'rgba(255, 255, 255, 0.03)',
                  color: i <= activeStage ? STAGE_COLORS[i] : 'rgba(255,255,255,0.3)',
                  boxShadow: i <= activeStage ? `0 0 15px ${STAGE_COLORS[i]}30` : 'none',
                  transition: 'all 0.4s ease',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {i <= activeStage ? (
                  i < activeStage ? <CheckCircle size={22} /> : STAGE_ICONS[i]
                ) : (
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{i + 1}</span>
                )}
              </motion.div>

              {/* Connecting Line */}
              {i < stageMetadata.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', maxWidth: '120px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    animate={{ width: i < activeStage ? '100%' : '0%' }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: `linear-gradient(90deg, ${STAGE_COLORS[i]}, ${STAGE_COLORS[i + 1]})`,
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Stage Labels */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0', padding: '0 30px 10px',
        }}>
          {stageMetadata.map((stage, i) => (
            <div key={`label-${i}`} style={{
              flex: 1, maxWidth: '180px', textAlign: 'center',
            }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: i <= activeStage ? STAGE_COLORS[i] : 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                fontFamily: 'Outfit, sans-serif',
                transition: 'color 0.4s',
              }}>
                {stage.title}
              </span>
            </div>
          ))}
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1, padding: '15px 30px 20px', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>
          <AnimatePresence mode="wait">
            {activeStage >= 0 && activeStage < stageImages.length && (
              <motion.div
                key={`stage-${activeStage}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                style={{
                  display: 'flex', gap: '25px', alignItems: 'flex-start',
                }}
              >
                {/* Stage Image */}
                <div style={{
                  flex: '1.3',
                  background: 'rgba(0, 0, 0, 0.5)',
                  borderRadius: '16px',
                  border: `1px solid ${STAGE_COLORS[activeStage]}30`,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {/* Stage Badge */}
                  <div style={{
                    position: 'absolute', top: '12px', left: '12px',
                    background: STAGE_COLORS[activeStage],
                    color: '#000',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    fontFamily: 'Outfit, sans-serif',
                    zIndex: 2,
                  }}>
                    STAGE {activeStage + 1}
                  </div>

                  <img
                    src={`data:image/jpeg;base64,${stageImages[activeStage]}`}
                    alt={`Stage ${activeStage + 1}`}
                    style={{
                      width: '100%',
                      maxHeight: '350px',
                      objectFit: 'contain',
                      display: 'block',
                      padding: '15px',
                    }}
                  />

                  {/* Scanning overlay animation */}
                  <motion.div
                    initial={{ top: 0, opacity: 0.6 }}
                    animate={{ top: '100%', opacity: 0 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      left: 0, right: 0, height: '3px',
                      background: `linear-gradient(90deg, transparent, ${STAGE_COLORS[activeStage]}, transparent)`,
                      boxShadow: `0 0 15px ${STAGE_COLORS[activeStage]}`,
                      pointerEvents: 'none',
                    }}
                  />
                </div>

                {/* Stage Description */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{
                    fontSize: '1.4rem', margin: 0,
                    color: STAGE_COLORS[activeStage],
                    fontFamily: 'Outfit, sans-serif',
                    display: 'flex', alignItems: 'center', gap: '10px',
                  }}>
                    {STAGE_ICONS[activeStage]}
                    {stageMetadata[activeStage]?.title || `Stage ${activeStage + 1}`}
                  </h3>
                  <p style={{
                    color: '#c4c0d4',
                    lineHeight: '1.7',
                    fontSize: '1.05rem',
                    margin: 0,
                  }}>
                    {stageMetadata[activeStage]?.description || ''}
                  </p>

                  {/* Navigation */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                    {activeStage > 0 && (
                      <button
                        onClick={() => { setAutoPlaying(false); setActiveStage(prev => prev - 1); }}
                        style={{
                          padding: '8px 20px', borderRadius: '10px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: '#c4c0d4', cursor: 'pointer',
                          fontSize: '0.9rem',
                        }}
                      >
                        ← Previous
                      </button>
                    )}
                    {activeStage < stageImages.length - 1 && (
                      <button
                        onClick={() => { setAutoPlaying(false); setActiveStage(prev => prev + 1); }}
                        style={{
                          padding: '8px 20px', borderRadius: '10px',
                          border: `1px solid ${STAGE_COLORS[activeStage + 1]}40`,
                          background: `${STAGE_COLORS[activeStage + 1]}15`,
                          color: STAGE_COLORS[activeStage + 1],
                          cursor: 'pointer',
                          fontSize: '0.9rem', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '6px',
                        }}
                      >
                        Next Stage <ChevronRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Waiting state */}
            {activeStage === -1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: '60px 0', gap: '15px',
                }}
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    border: '3px solid #00F0FF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Eye size={28} color="#00F0FF" />
                </motion.div>
                <p style={{ color: '#c4c0d4', fontSize: '1.1rem' }}>
                  Initializing vision pipeline...
                </p>
              </motion.div>
            )}

            {/* No stage images fallback */}
            {activeStage >= stageImages.length && stageImages.length > 0 && showFinal && (
              <motion.div
                key="final"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: '20px', padding: '20px 0',
                }}
              >
                {result?.output_image && (
                  <img
                    src={`data:image/jpeg;base64,${result.output_image}`}
                    alt="Final Output"
                    style={{
                      maxWidth: '100%', maxHeight: '300px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                    }}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prediction Result (shown after all stages) */}
          {showFinal && prediction && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.08), rgba(0, 240, 255, 0.08))',
                border: '1px solid rgba(0, 255, 136, 0.25)',
                borderRadius: '16px',
                padding: '20px 25px',
                display: 'flex', alignItems: 'center', gap: '15px',
              }}
            >
              <div style={{
                width: '50px', height: '50px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #00FF88, #00F0FF)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CheckCircle size={26} color="#000" />
              </div>
              <div>
                <div style={{
                  fontSize: '0.8rem', color: '#00FF88',
                  textTransform: 'uppercase', letterSpacing: '1.5px',
                  fontWeight: 700, fontFamily: 'Outfit, sans-serif',
                  marginBottom: '4px',
                }}>
                  Prediction Result
                </div>
                <div style={{
                  fontSize: '1.3rem', fontWeight: 700, color: '#fff',
                }}>
                  {prediction}
                </div>
              </div>
            </motion.div>
          )}

          {/* Authored outcome guide (seeded) — what to look for in this result */}
          {showFinal && scenario?.outcome_guide && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              style={{
                background: 'rgba(255,159,10,0.06)',
                border: '1px solid rgba(255,159,10,0.3)',
                borderRadius: '16px',
                padding: '18px 22px',
                marginTop: '15px',
              }}
            >
              <div style={{ fontSize: '0.8rem', color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 700, marginBottom: '6px' }}>
                🔎 What to look for
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.98rem' }}>{scenario.outcome_guide}</p>
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '15px 25px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
        }}>
          <button
            className="btn-primary"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(0, 255, 136, 0.2))',
              border: '1px solid rgba(0, 240, 255, 0.3)',
            }}
          >
            <Sparkles size={18} /> Awesome! Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default CVPipelineOverlay;
