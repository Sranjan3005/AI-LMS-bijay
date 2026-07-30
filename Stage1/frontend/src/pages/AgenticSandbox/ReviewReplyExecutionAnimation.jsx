import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, FileText, ArrowRight, ArrowLeft, ShieldAlert, CheckCircle, Database } from 'lucide-react';

const STEPS = ['The Review', 'Analysis & Draft', 'Reviews Board'];

export default function ReviewReplyExecutionAnimation({ onClose, nodes = [] }) {
  const [step, setStep] = useState(0);

  const { review, sentiment, factCheck, draft, isEscalated } = useMemo(() => {
    const byType = (t) => nodes.filter((n) => n.type === t);
    const input = byType('textInput')[0];
    const radar = byType('sentimentRadar')[0];
    const customizers = byType('customizer'); // node_3=factcheck, node_5=draft
    const decider = byType('decider')[0];
    
    const factCheckResult = customizers.find(c => c.id === 'node_3')?.data?.__result || '';
    const draftResult = customizers.find(c => c.id === 'node_5')?.data?.__result || '';
    
    // The decider returns "true" or "false" string based on condition
    const deciderRes = decider?.data?.__result === 'true';

    return {
      review: input?.data?.text || '',
      sentiment: radar?.data?.__result || null,
      factCheck: factCheckResult,
      draft: draftResult,
      isEscalated: deciderRes
    };
  }, [nodes]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(900px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'rgba(14,17,28,.98)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 20, padding: 22, color: '#f2f3f8', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star size={20} color="#f59e0b" /> Auto Review Responder
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 0, color: '#9aa0b5', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {/* step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontSize: '.82rem', fontWeight: 600,
              background: i === step ? 'rgba(245,158,11,.16)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${i === step ? 'rgba(245,158,11,.5)' : 'rgba(255,255,255,.1)'}`,
              color: i < step ? '#4ade80' : i === step ? '#fff' : '#9aa0b5',
            }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', background: i <= step ? '#f59e0b' : 'rgba(255,255,255,.1)', color: i <= step ? '#000' : '#fff' }}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0 — The Review & Mood */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                1 · Intake & Sentiment Analysis
              </h3>
              <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                The pipeline received a customer review and analyzed its mood before taking action.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ flex: 2, minWidth: '300px', ...panel('#f59e0b') }}>
                  <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Incoming Review</div>
                  {review ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1rem' }}>"{review}"</span>
                    : <span style={muted}>No review text found. Try running the pipeline again.</span>}
                </div>

                <div style={{ flex: 1, minWidth: '200px', ...panel('#BF5AF2') }}>
                  <div style={{ color: '#BF5AF2', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>Detected Mood</div>
                  {sentiment ? (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '10px' }}>
                        {sentiment.emoji || (sentiment.score > 0 ? '🙂' : sentiment.score < 0 ? '😠' : '😐')}
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, textTransform: 'capitalize' }}>{sentiment.label}</div>
                      <div style={{ color: '#9aa0b5', fontSize: '0.85rem', marginTop: '4px' }}>Score: {sentiment.score}</div>
                    </div>
                  ) : <span style={muted}>No sentiment data captured.</span>}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <button onClick={() => setStep(1)} style={primary}>See Fact-Check & Draft <ArrowRight size={16} /></button>
              </div>
            </motion.div>
          )}

          {/* STEP 1 — Fact Check & Draft */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                2 · Cross-referencing Internal Data
              </h3>
              <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                Before replying, the AI checked the claims against internal records (menu prices, policies) to craft a truthful response.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={panel('#30D158')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#30D158', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                    <Database size={14} /> Fact Check Results
                  </div>
                  {factCheck ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9rem' }}>{factCheck}</span>
                    : <span style={muted}>No fact-check output captured.</span>}
                </div>

                <div style={panel('#64D2FF')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64D2FF', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                    <FileText size={14} /> Drafted Reply
                  </div>
                  {draft ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.9rem' }}>{draft}</span>
                    : <span style={muted}>No drafted reply captured.</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setStep(0)} style={ghost}><ArrowLeft size={15} /> Back</button>
                <button onClick={() => setStep(2)} style={{ ...primary, flex: 1 }}>Go to Reviews Board <ArrowRight size={16} /></button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — Reviews Board */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                3 · Action Taken: Reviews Board
              </h3>
              <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                The Decider node routed the review based on whether it needs a manager's attention.
              </p>
              
              <div style={{ display: 'flex', gap: '16px', background: '#0a0b10', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                {/* Auto-Replied Column */}
                <div style={{ flex: 1, background: '#111827', borderRadius: '12px', padding: '12px', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}><CheckCircle size={16} color="#30D158" /> Auto-Replied</div>
                    <div style={{ background: '#374151', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{!isEscalated ? '1' : '0'}</div>
                  </div>
                  
                  {!isEscalated && (
                    <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #30D158' }}>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>Incoming Review:</div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '10px', fontStyle: 'italic' }}>"{review.substring(0, 60)}..."</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>AI Reply:</div>
                      <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{draft.substring(0, 100)}...</div>
                    </div>
                  )}
                </div>

                {/* Escalated Column */}
                <div style={{ flex: 1, background: '#111827', borderRadius: '12px', padding: '12px', border: '1px solid #1f2937' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={16} color="#ef4444" /> Needs Management</div>
                    <div style={{ background: '#374151', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{isEscalated ? '1' : '0'}</div>
                  </div>
                  
                  {isEscalated && (
                    <div style={{ background: '#1f2937', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                      <div style={{ display: 'inline-block', background: 'rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', marginBottom: '8px', fontWeight: 600 }}>ESCALATED</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '6px' }}>Incoming Review:</div>
                      <div style={{ fontSize: '0.9rem', marginBottom: '10px', fontStyle: 'italic' }}>"{review.substring(0, 100)}..."</div>
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '4px' }}>Suggested Draft:</div>
                      <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{draft.substring(0, 80)}...</div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={ghost}><ArrowLeft size={15} /> Back</button>
                <button onClick={onClose} style={{ ...primary, flex: 1 }}>Done 🎉</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

const panel = (c) => ({
  background: 'rgba(255,255,255,.03)', border: `1px solid ${c}44`, borderRadius: 12, padding: 14,
  fontSize: '.92rem', color: '#e2e8f0', maxHeight: 260, overflowY: 'auto',
  wordBreak: 'break-word', overflowWrap: 'anywhere',
});
const primary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 0, color: '#fff', padding: '11px 22px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.98rem', cursor: 'pointer' };
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#cdd1e0', padding: '11px 18px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer' };
const muted = { color: '#9aa0b5', fontSize: '.88rem' };
