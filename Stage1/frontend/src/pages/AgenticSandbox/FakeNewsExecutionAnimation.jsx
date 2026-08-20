import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Globe, Scale, ArrowRight, ArrowLeft, Search, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * FakeNewsExecutionAnimation — the "end product" of the Fake News Detective
 * flow, replayed as a 3-card story using the REAL outputs of the run the
 * student just executed (article → web evidence → verdict). Nothing is faked:
 * every panel shows what that node actually produced.
 */

const STEPS = ['The article', 'Fact check', 'The verdict'];

// Read the verdict text and decide how to colour it.
function readVerdict(text) {
  const t = (text || '').toLowerCase();
  const fake = /\b(fake|false|misleading|hoax|fabricat|not true|untrue|debunk)/.test(t);
  const real = /\b(real|true|accurate|legitimate|credible|verified|genuine)/.test(t);
  if (fake && !real) return { kind: 'fake', label: 'Likely FAKE', color: '#FF453A', Icon: ShieldAlert };
  if (real && !fake) return { kind: 'real', label: 'Looks REAL', color: '#30D158', Icon: ShieldCheck };
  return { kind: 'unclear', label: 'Verdict', color: '#FF9F0A', Icon: Scale };
}

export default function FakeNewsExecutionAnimation({ onClose, nodes = [] }) {
  const [step, setStep] = useState(0);

  const { article, evidence, verdict } = useMemo(() => {
    const byType = (t) => nodes.filter((n) => n.type === t);
    const input = byType('textInput')[0];
    const search = byType('webSearch')[0];
    // The verdict is the last customizer's result, else the display's output.
    const customizers = byType('customizer');
    const display = byType('display')[0];
    const verdictText =
      customizers.map((c) => c.data?.__result).filter(Boolean).pop() ||
      display?.data?.output || display?.data?.__result || '';
    return {
      article: input?.data?.text || '',
      evidence: search?.data?.__result || '',
      verdict: verdictText,
    };
  }, [nodes]);

  const v = readVerdict(verdict);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(820px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'rgba(14,17,28,.98)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 20, padding: 22, color: '#f2f3f8', fontFamily: 'inherit' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={20} color="#ef4444" /> Fake News Detective — your run, step by step
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 0, color: '#9aa0b5', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        {/* step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontSize: '.82rem', fontWeight: 600,
              background: i === step ? 'rgba(239,68,68,.16)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${i === step ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}`,
              color: i < step ? '#4ade80' : i === step ? '#fff' : '#9aa0b5',
            }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', background: i <= step ? '#ef4444' : 'rgba(255,255,255,.1)', color: '#fff' }}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0 — the article that went in */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FileText size={17} color="#64D2FF" /> 1 · The article you fed in
              </h3>
              <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                This is the raw text the pipeline had to judge — no evidence yet, just claims.
              </p>
              <div style={panel('#64D2FF')}>
                {article ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{article}</span>
                  : <span style={muted}>No article text found — type one into the Text Input node and run the pipeline again.</span>}
              </div>
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setStep(1)} style={primary}>See what the fact-checker found <ArrowRight size={16} /></button>
              </div>
            </motion.div>
          )}

          {/* STEP 1 — the web evidence */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Globe size={17} color="#BF5AF2" /> 2 · What the Fact-Check node found
              </h3>
              <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                The pipeline went looking for outside evidence about those claims. This is the real result from your run:
              </p>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={panel('#BF5AF2')}>
                {evidence ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{evidence}</span>
                  : <span style={muted}><Search size={13} /> No fact-check output captured — run the pipeline (with a Web Search node) and try again.</span>}
              </motion.div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={() => setStep(0)} style={ghost}><ArrowLeft size={15} /> Back</button>
                <button onClick={() => setStep(2)} style={{ ...primary, flex: 1 }}>Now the verdict <ArrowRight size={16} /></button>
              </div>
            </motion.div>
          )}

          {/* STEP 2 — the verdict */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={17} color="#FF9F0A" /> 3 · The verdict
              </h3>
              <motion.div
                initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 12, background: `${v.color}18`, border: `1px solid ${v.color}66`, color: v.color, fontWeight: 800, fontSize: '1.05rem' }}
              >
                <v.Icon size={20} /> {v.label}
              </motion.div>
              <div style={panel(v.color)}>
                {verdict ? <span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{verdict}</span>
                  : <span style={muted}>No verdict captured — run the pipeline and try again.</span>}
              </div>
              <p style={{ color: '#9aa0b5', fontSize: '.86rem', lineHeight: 1.6, marginTop: 14 }}>
                💡 Notice the pipeline didn&apos;t &ldquo;know&rdquo; the answer — it <b style={{ color: '#fff' }}>gathered evidence first</b>, then judged.
                That&apos;s the difference between guessing and fact-checking.
              </p>
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
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
const primary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#ef4444,#bf5af2)', border: 0, color: '#fff', padding: '11px 22px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.98rem', cursor: 'pointer' };
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#cdd1e0', padding: '11px 18px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer' };
const muted = { color: '#9aa0b5', fontSize: '.88rem' };
