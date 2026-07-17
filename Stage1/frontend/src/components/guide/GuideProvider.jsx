import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ChitiGuide — a character-led, step-by-step walkthrough (Clash-of-Clans style).
 *
 * Chiti walks up to whatever section is highlighted, says what to do, and — for
 * "waitFor" steps — waits until the student actually does it before moving on.
 *
 * A step config drives everything:
 *   { target: '[data-guide="pick-chart"]',  // CSS selector to spotlight (null = float, no hole)
 *     say:    'Now pick a chart! 👉',        // what Chiti says
 *     mood:   'point',                       // 'idle' | 'point' | 'think' | 'cheer'
 *     waitFor:'chart:bar',                   // advance only when signal() fires (optional)
 *     cta:    'Got it' }                      // Next-button label (ignored if waitFor set)
 *
 * Usage:
 *   <GuideProvider steps={STEPS} autoStartKey="chartPicker"> … </GuideProvider>
 *   const { start, signal } = useGuide();
 *   signal('chart:bar')   // report a real action; auto-advances a matching waitFor step
 *
 * Mark targets anywhere with  data-guide="pick-chart"  — no coupling to this file.
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const GuideContext = createContext(null);
export const useGuide = () => useContext(GuideContext) || { start: () => {}, stop: () => {}, next: () => {}, signal: () => {}, active: false };

export function GuideProvider({ children, steps, autoStartKey, launcherStyle }) {
  const [run, setRun] = useState(null); // { steps, i } | null

  const start = useCallback((s) => { const st = s || steps; if (st?.length) setRun({ steps: st, i: 0 }); }, [steps]);
  const stop = useCallback(() => setRun(null), []);
  const next = useCallback(() => setRun(r => (r && r.i + 1 < r.steps.length ? { ...r, i: r.i + 1 } : null)), []);

  // A component reports that something happened; if the current step waits for
  // exactly this, we advance. This is the "teach by doing" mechanic.
  const signal = useCallback((name) => setRun(r => {
    if (!r) return r;
    if (r.steps[r.i]?.waitFor !== name) return r;
    return r.i + 1 < r.steps.length ? { ...r, i: r.i + 1 } : null;
  }), []);

  // Auto-onboard first-time visitors once; the launcher lets anyone replay.
  useEffect(() => {
    if (!autoStartKey || !steps?.length) return;
    const k = 'chitiGuide.' + autoStartKey;
    if (localStorage.getItem(k)) return;
    const t = setTimeout(() => { localStorage.setItem(k, '1'); setRun({ steps, i: 0 }); }, 700);
    return () => clearTimeout(t);
  }, [autoStartKey, steps]);

  return (
    <GuideContext.Provider value={{ start, stop, next, signal, active: !!run }}>
      {children}
      <AnimatePresence>{run && <GuideLayer run={run} onNext={next} onStop={stop} />}</AnimatePresence>
      <AnimatePresence>{!run && steps?.length ? <GuideLauncher key="launch" onClick={() => start()} style={launcherStyle} /> : null}</AnimatePresence>
    </GuideContext.Provider>
  );
}

/* ---------- the overlay: spotlight + character that walks to each section ---------- */

const sameRect = (a, b) => a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;

function GuideLayer({ run, onNext, onStop }) {
  const step = run.steps[run.i];
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState(null);     // { top, left, animate } for the Chiti cluster
  const clusterRef = useRef(null);
  const posRef = useRef(null);
  const seenStep = useRef(-1);

  // Track the target's position every frame — cheaply handles appearance,
  // scroll, resize and layout shifts without wiring observers per target.
  useEffect(() => {
    let raf;
    const tick = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        const box = { top: r.top, left: r.left, width: r.width, height: r.height };
        setRect(prev => (sameRect(prev, box) ? prev : box));
      } else {
        setRect(prev => (prev === null ? prev : null));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step.target]);

  // Scroll the target into view once when the step changes.
  useEffect(() => {
    if (seenStep.current === run.i) return;
    seenStep.current = run.i;
    if (!step.target) return;
    document.querySelector(step.target)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [run.i, step.target]);

  // Place Chiti next to the highlighted section (below it, or above if no room);
  // for target-less steps he tucks into the corner. Runs every render so it
  // re-measures as the bubble text (and the target's rect) change; the equality
  // guard below stops after it settles, so there's no update loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const el = clusterRef.current;
    if (!el) return;
    const { width: cw, height: ch } = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    const GAP = 16, PAD = 12;
    let top, left;
    if (!rect) {
      left = vw - cw - PAD - 6;
      top = vh - ch - PAD - 6;
    } else {
      const below = vh - (rect.top + rect.height);
      if (below >= ch + GAP) top = rect.top + rect.height + GAP;
      else if (rect.top >= ch + GAP) top = rect.top - ch - GAP;
      else top = clamp(rect.top + rect.height / 2 - ch / 2, PAD, vh - ch - PAD);
      left = clamp(rect.left + rect.width / 2 - cw / 2, PAD, vw - cw - PAD);
    }
    const prev = posRef.current;
    if (prev && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.left - left) < 0.5) return;
    const isFirst = prev === null;
    posRef.current = { top, left };
    setPos({ top, left, animate: !isFirst });
  });

  const pad = 8;
  const isLast = run.i === run.steps.length - 1;

  return (
    <>
      {/* Dim everything except a hole around the target (classic box-shadow spotlight).
          pointer-events:none so the highlighted control stays clickable — vital for waitFor. */}
      {rect ? (
        <motion.div
          key="spot"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', zIndex: 9998, pointerEvents: 'none', borderRadius: 14,
            top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(5,6,15,.74)', outline: '2px solid #64D2FF', outlineOffset: 2,
            transition: 'top .35s cubic-bezier(.22,1,.36,1), left .35s cubic-bezier(.22,1,.36,1), width .35s, height .35s',
          }}
        >
          <motion.div
            style={{ position: 'absolute', inset: -2, borderRadius: 14, border: '2px solid #64D2FF' }}
            animate={{ opacity: [0.9, 0.25, 0.9], scale: [1, 1.015, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      ) : (
        <motion.div key="dim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(5,6,15,.74)', pointerEvents: 'none' }} />
      )}

      {/* Chiti + speech bubble — positioned next to the section, glides between steps. */}
      <div
        ref={clusterRef}
        style={{
          position: 'fixed', zIndex: 10000, display: 'flex', alignItems: 'flex-end', gap: 12, pointerEvents: 'none',
          top: pos ? pos.top : -9999, left: pos ? pos.left : -9999,
          transition: pos?.animate ? 'top .5s cubic-bezier(.22,1,.36,1), left .5s cubic-bezier(.22,1,.36,1)' : 'none',
        }}
      >
        <motion.div style={{ pointerEvents: 'auto', flexShrink: 0 }}
          animate={{ y: [0, -7, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}>
          <ChitiAvatar mood={step.mood} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={run.i}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            style={{
              pointerEvents: 'auto', width: 280, maxWidth: '72vw', background: 'rgba(16,18,32,.97)',
              border: '1px solid rgba(100,210,255,.35)', borderRadius: 16, padding: '16px 18px',
              boxShadow: '0 18px 50px rgba(0,0,0,.5)', color: '#f2f3f8', position: 'relative', backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#64D2FF' }}>
                Chiti · {run.i + 1}/{run.steps.length}
              </span>
              <button onClick={onStop} aria-label="Skip guide"
                style={{ background: 'none', border: 0, color: '#9aa0b5', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: 2 }}>✕</button>
            </div>

            <p style={{ margin: 0, lineHeight: 1.55, fontSize: '1rem' }}>{step.say}</p>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
              {step.waitFor ? (
                <motion.span animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.3, repeat: Infinity }}
                  style={{ fontSize: '.85rem', color: '#9aa0b5' }}>
                  👆 try it — I'll wait
                </motion.span>
              ) : (
                <button onClick={isLast ? onStop : onNext}
                  style={{ background: 'linear-gradient(120deg,#5e5ce6,#bf5af2)', border: 0, color: '#fff', padding: '9px 18px', borderRadius: 10, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer', fontSize: '.9rem' }}>
                  {step.cta || (isLast ? 'Explore on my own 🚀' : 'Next →')}
                </button>
              )}
            </div>

            {/* tail pointing left, back toward Chiti */}
            <div style={{ position: 'absolute', left: -7, bottom: 22, width: 14, height: 14, background: 'rgba(16,18,32,.97)', borderLeft: '1px solid rgba(100,210,255,.35)', borderBottom: '1px solid rgba(100,210,255,.35)', transform: 'rotate(45deg)' }} />
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

/* ---------- the summon button, shown whenever the guide is idle ---------- */

function GuideLauncher({ onClick, style }) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8, y: 10 }}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
      style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 9990, display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(16,18,32,.95)', border: '1px solid rgba(100,210,255,.4)', borderRadius: 999,
        padding: '7px 16px 7px 7px', cursor: 'pointer', color: '#f2f3f8', fontFamily: 'inherit', fontWeight: 600,
        fontSize: '.9rem', boxShadow: '0 10px 30px rgba(0,0,0,.4)', backdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      <ChitiAvatar mood="idle" size={38} />
      Ask Chiti ✨
    </motion.button>
  );
}

/* ---------- Chiti: a placeholder robot mascot (swap for real art later) ---------- */

function ChitiAvatar({ mood = 'idle', size = 84 }) {
  const eyeShift = mood === 'point' ? 3 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" aria-label="Chiti the robot" role="img" style={{ filter: 'drop-shadow(0 8px 18px rgba(94,92,230,.5))' }}>
      <defs>
        <linearGradient id="chiti-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2140" /><stop offset="1" stopColor="#12142a" />
        </linearGradient>
      </defs>
      {/* antenna */}
      <line x1="36" y1="12" x2="36" y2="5" stroke="#64D2FF" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="36" cy="4" r="3.2" fill="#64D2FF">
        <animate attributeName="opacity" values="1;.35;1" dur="1.4s" repeatCount="indefinite" />
      </circle>
      {/* head */}
      <rect x="8" y="12" width="56" height="48" rx="15" fill="url(#chiti-head)" stroke="#64D2FF" strokeWidth="2" />
      {/* ears */}
      <rect x="3" y="30" width="5" height="14" rx="2.5" fill="#5E5CE6" />
      <rect x="64" y="30" width="5" height="14" rx="2.5" fill="#5E5CE6" />

      {mood === 'cheer' ? (
        <>
          <path d="M22 34 q4 -6 8 0" fill="none" stroke="#30D158" strokeWidth="3" strokeLinecap="round" />
          <path d="M42 34 q4 -6 8 0" fill="none" stroke="#30D158" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 44 q8 8 16 0" fill="none" stroke="#30D158" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="44" r="3" fill="#FF9FB2" opacity=".8" />
          <circle cx="52" cy="44" r="3" fill="#FF9FB2" opacity=".8" />
        </>
      ) : mood === 'think' ? (
        <>
          <circle cx={26 + eyeShift} cy="33" r="4.5" fill="#64D2FF" />
          <path d="M42 33 h8" stroke="#64D2FF" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 47 h16" fill="none" stroke="#8b90a8" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx={26 + eyeShift} cy="33" r="5" fill="#64D2FF">
            <animate attributeName="ry" values="5;5;0.6;5" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx={46 + eyeShift} cy="33" r="5" fill="#64D2FF">
            <animate attributeName="ry" values="5;5;0.6;5" dur="4s" repeatCount="indefinite" />
          </circle>
          <path d="M28 45 q8 6 16 0" fill="none" stroke="#64D2FF" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
