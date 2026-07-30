import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserCheck, Camera, ScanFace, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

/**
 * AttendanceExecutionAnimation — the "See it in action" view for the
 * Auto-Attendance scenario.
 *
 * It replays what the student's own pipeline actually produced: the door-camera
 * frame, the register the AI read, the row it matched, and then the register
 * filling in tick by tick. Everything comes from the live node results
 * (`data.__result`) written back by the WebSocket during the run — nothing here
 * is invented.
 */

// The register the scenario ships with. Kept in step with
// Stage1/scripts/generate_attendance_assets.py.
const ROSTER = [
  { roll: 12, name: 'Aarav Sharma', look: 'round glasses, red shirt' },
  { roll: 13, name: 'Diya Patel', look: 'braided hair, blue kurta' },
  { roll: 14, name: 'Kabir Nair', look: 'curly hair, green hoodie' },
  { roll: 15, name: 'Meera Iyer', look: 'bob cut, square glasses, yellow top' },
  { roll: 16, name: 'Rohan Das', look: 'buzz cut, orange t-shirt' },
  { roll: 17, name: 'Ananya Rao', look: 'ponytail, purple sweater' },
];

const STEPS = ['At the door', 'Matching', 'The register'];
const ACCENT = '#30D158';

/** Pull the matched roll number out of whatever the Customizer wrote. */
function parseMatch(text) {
  if (!text) return null;
  if (/unknown\s+visitor/i.test(text)) return { unknown: true };
  const roll = text.match(/roll\s*(?:number\s*)?[:#-]?\s*(\d{1,3})/i);
  if (roll) {
    const value = Number(roll[1]);
    if (ROSTER.some((s) => s.roll === value)) return { roll: value };
  }
  // No roll number in the reply — fall back to finding a roster name in it.
  const named = ROSTER.find((s) => new RegExp(s.name.split(' ')[0], 'i').test(text));
  return named ? { roll: named.roll } : { unknown: true };
}

function Chip({ children, tone = 'idle' }) {
  const c = {
    idle: ['rgba(255,255,255,.05)', 'rgba(255,255,255,.12)', '#9aa0b5'],
    good: ['rgba(48,209,88,.14)', 'rgba(48,209,88,.5)', '#4ade80'],
    warn: ['rgba(255,159,10,.13)', 'rgba(255,159,10,.5)', '#ffcf70'],
  }[tone];
  return (
    <span style={{
      fontSize: '.74rem', padding: '3px 10px', borderRadius: 999,
      background: c[0], border: `1px solid ${c[1]}`, color: c[2], fontWeight: 600,
    }}>{children}</span>
  );
}

export default function AttendanceExecutionAnimation({ onClose, nodes = [] }) {
  const [step, setStep] = useState(0);
  const [marked, setMarked] = useState([]);

  const { registerImg, arrivalImg, registerRead, matchText, escalated } = useMemo(() => {
    const scanners = nodes.filter((n) => n.type === 'visionScanner');
    const register = scanners.find((n) => /register/i.test(n.data?.label || '')) || scanners[0];
    const camera = scanners.find((n) => n !== register) || scanners[1];
    const customizer = nodes.find((n) => n.type === 'customizer');
    const decider = nodes.find((n) => n.type === 'decider');
    return {
      registerImg: register?.data?.fileBase64 || null,
      arrivalImg: camera?.data?.fileBase64 || null,
      registerRead: register?.data?.__result || '',
      matchText: customizer?.data?.__result || '',
      escalated: decider?.data?.__result === 'false',
    };
  }, [nodes]);

  const match = useMemo(() => parseMatch(matchText), [matchText]);
  const matchedRoll = match?.roll ?? null;

  // On the register step, tick the matched student in after a beat so the
  // student sees the register actually being filled in.
  useEffect(() => {
    if (step !== 2 || matchedRoll == null) return;
    const t = setTimeout(() => setMarked([matchedRoll]), 600);
    return () => clearTimeout(t);
  }, [step, matchedRoll]);

  const matchedStudent = ROSTER.find((s) => s.roll === matchedRoll);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,.82)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(940px, 96vw)', maxHeight: '92vh', overflow: 'auto',
          background: 'rgba(14,17,28,.98)', border: `1px solid ${ACCENT}44`,
          borderRadius: 20, padding: 22, color: '#f2f3f8', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCheck size={20} color={ACCENT} /> Automatic Attendance
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: 'none', border: 0, color: '#9aa0b5', cursor: 'pointer' }}><X size={22} /></button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999,
              fontSize: '.82rem', fontWeight: 600,
              background: i === step ? `${ACCENT}22` : 'rgba(255,255,255,.04)',
              border: `1px solid ${i === step ? `${ACCENT}80` : 'rgba(255,255,255,.1)'}`,
              color: i < step ? '#4ade80' : i === step ? '#fff' : '#9aa0b5',
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '.72rem',
                background: i <= step ? ACCENT : 'rgba(255,255,255,.1)', color: i <= step ? '#04140a' : '#fff',
              }}>{i < step ? '✓' : i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── 1. What the two cameras saw ── */}
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ACCENT, fontWeight: 700, marginBottom: 10 }}>
                  <Camera size={17} /> Door camera
                </div>
                {arrivalImg
                  ? <img src={arrivalImg} alt="Student arriving" style={{ width: '100%', maxWidth: 220, borderRadius: 12, display: 'block', margin: '0 auto' }} />
                  : <p style={{ color: '#9aa0b5', fontSize: '.88rem' }}>No camera frame on the node.</p>}
                <p style={{ color: '#9aa0b5', fontSize: '.85rem', lineHeight: 1.6, marginBottom: 0, marginTop: 12 }}>
                  Someone walked in. The camera has no idea who they are — only what they look like.
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64D2FF', fontWeight: 700, marginBottom: 10 }}>
                  <ScanFace size={17} /> Class register
                </div>
                {registerImg
                  ? <img src={registerImg} alt="Class register" style={{ width: '100%', borderRadius: 12, display: 'block' }} />
                  : <p style={{ color: '#9aa0b5', fontSize: '.88rem' }}>No register image on the node.</p>}
                <p style={{ color: '#9aa0b5', fontSize: '.85rem', lineHeight: 1.6, marginBottom: 0, marginTop: 12 }}>
                  Six students, each with a photo. This is the only thing the AI can compare against.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── 2. The comparison the AI actually made ── */}
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, flexWrap: 'wrap', marginBottom: 20 }}>
                {arrivalImg && (
                  <motion.img
                    src={arrivalImg} alt="At the door"
                    animate={{ boxShadow: [`0 0 0 0 ${ACCENT}00`, `0 0 0 8px ${ACCENT}33`, `0 0 0 0 ${ACCENT}00`] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    style={{ width: 150, borderRadius: 14, display: 'block' }}
                  />
                )}
                <motion.div
                  animate={{ x: [0, 10, 0] }} transition={{ duration: 1.4, repeat: Infinity }}
                  style={{ color: ACCENT, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <ScanFace size={30} />
                  <span style={{ fontSize: '.74rem', fontWeight: 700 }}>compare</span>
                </motion.div>
                {matchedStudent ? (
                  <div style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}66`, borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: ACCENT }}>Roll {matchedStudent.roll}</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: 2 }}>{matchedStudent.name}</div>
                    <div style={{ color: '#9aa0b5', fontSize: '.8rem', marginTop: 6 }}>{matchedStudent.look}</div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(255,159,10,.12)', border: '1px solid rgba(255,159,10,.5)', borderRadius: 14, padding: '16px 20px', textAlign: 'center', color: '#ffcf70' }}>
                    <AlertTriangle size={26} />
                    <div style={{ fontWeight: 700, marginTop: 6 }}>No confident match</div>
                  </div>
                )}
              </div>

              <div style={{ background: '#05070f', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, padding: 15 }}>
                <div style={{ fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em', color: '#64748b', fontWeight: 700, marginBottom: 8 }}>
                  What your pipeline actually replied
                </div>
                <p style={{ margin: 0, color: '#d7dbe8', fontSize: '.9rem', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {matchText || 'Run the pipeline first — this is where its answer appears.'}
                </p>
              </div>

              {registerRead && (
                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: 'pointer', color: '#64D2FF', fontSize: '.85rem' }}>
                    See how the AI read the register
                  </summary>
                  <p style={{ margin: '10px 0 0', color: '#9aa0b5', fontSize: '.84rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>
                    {registerRead}
                  </p>
                </details>
              )}
            </motion.div>
          )}

          {/* ── 3. The register filling in ── */}
          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {ROSTER.map((s) => {
                  const isMarked = marked.includes(s.roll);
                  return (
                    <motion.div
                      key={s.roll}
                      animate={isMarked ? { backgroundColor: 'rgba(48,209,88,.12)' } : {}}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                        borderRadius: 11, background: 'rgba(255,255,255,.03)',
                        border: `1px solid ${isMarked ? `${ACCENT}66` : 'rgba(255,255,255,.09)'}`,
                      }}
                    >
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#9aa0b5', width: 28 }}>{s.roll}</span>
                      <span style={{ fontWeight: 600, minWidth: 130 }}>{s.name}</span>
                      <span style={{ color: '#64748b', fontSize: '.8rem', flex: 1 }}>{s.look}</span>
                      {isMarked ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 320 }}>
                          <Chip tone="good"><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> Present</Chip>
                        </motion.span>
                      ) : (
                        <Chip>— not yet</Chip>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <div style={{
                borderRadius: 12, padding: '14px 16px',
                background: escalated ? 'rgba(255,159,10,.09)' : `${ACCENT}12`,
                border: `1px solid ${escalated ? 'rgba(255,159,10,.4)' : `${ACCENT}55`}`,
                color: escalated ? '#ffcf70' : '#c8f5d5', fontSize: '.9rem', lineHeight: 1.6,
              }}>
                {escalated
                  ? 'The Decider took the FALSE branch — nobody on the register matched, so a message went to the school office instead of a tick on the sheet.'
                  : matchedStudent
                    ? `One student walked in, one row ticked — no roll-call needed. The other five stay blank until they arrive at the door themselves.`
                    : 'Run the pipeline to see a row get ticked.'}
              </div>

              <p style={{ color: '#64748b', fontSize: '.84rem', lineHeight: 1.65, marginTop: 14, marginBottom: 0 }}>
                Notice what it matched on: hair, glasses, the colour of a shirt. Swap your jumper and this
                system can miss you entirely — which is why real attendance systems still keep a teacher in the loop.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 11,
              background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)',
              color: '#cbd5e1', cursor: step === 0 ? 'not-allowed' : 'pointer',
              opacity: step === 0 ? 0.4 : 1, fontFamily: 'inherit', fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 11,
                background: `linear-gradient(135deg, ${ACCENT}, #0a9e42)`, border: 0, color: '#04140a',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
              }}
            >
              {STEPS[step + 1]} <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                padding: '10px 22px', borderRadius: 11,
                background: `linear-gradient(135deg, ${ACCENT}, #0a9e42)`, border: 0, color: '#04140a',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800,
              }}
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
