import React from 'react';
import { motion } from 'framer-motion';

// ChitiSVG — the 2D fallback character for low-end devices, small screens and
// "reduce motion" users. Unlike the old static badge this one is RIGGED: head,
// arms, legs, eyes and mouth are separate parts, so he can walk, wave, jump,
// nod, shake his head and talk.
//
// Same semantic action vocabulary as the 3D renderer, so the director doesn't
// care which one is on screen.

const SPRING = { type: 'spring', stiffness: 260, damping: 18 };

// Per-action motion for each rigged part.
const rig = (action) => {
  switch (action) {
    case 'walking':
      return {
        body:  { y: [0, -3, 0], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        armL:  { rotate: [22, -22, 22], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        armR:  { rotate: [-22, 22, -22], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        legL:  { rotate: [-20, 20, -20], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        legR:  { rotate: [20, -20, 20], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
        head:  { rotate: [-2, 2, -2], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
      };
    case 'wave':
    case 'point':
      return {
        armR: { rotate: [-10, -125, -100, -125, -100], transition: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } },
        head: { rotate: [0, -5, 0], transition: { duration: 1.3, repeat: Infinity } },
        body: { y: 0 }, armL: { rotate: 8 }, legL: { rotate: 0 }, legR: { rotate: 0 },
      };
    case 'thumbsup':
      return {
        armR: { rotate: -60, transition: SPRING },
        body: { y: [0, -6, 0], transition: { duration: 0.5, repeat: 2 } },
        armL: { rotate: 8 }, head: { rotate: 0 }, legL: { rotate: 0 }, legR: { rotate: 0 },
      };
    case 'jump':
      return {
        body: { y: [0, -34, 0, -12, 0], transition: { duration: 1.0, ease: 'easeOut' } },
        armL: { rotate: [8, -150, 8], transition: { duration: 1.0 } },
        armR: { rotate: [-8, 150, -8], transition: { duration: 1.0 } },
        legL: { rotate: [0, -18, 0], transition: { duration: 1.0 } },
        legR: { rotate: [0, 18, 0], transition: { duration: 1.0 } },
        head: { rotate: 0 },
      };
    case 'dance':
      return {
        body: { y: [0, -10, 0], rotate: [-6, 6, -6], transition: { duration: 0.62, repeat: Infinity, ease: 'easeInOut' } },
        armL: { rotate: [-120, 20, -120], transition: { duration: 0.62, repeat: Infinity, ease: 'easeInOut' } },
        armR: { rotate: [20, -120, 20], transition: { duration: 0.62, repeat: Infinity, ease: 'easeInOut' } },
        legL: { rotate: [-14, 14, -14], transition: { duration: 0.62, repeat: Infinity } },
        legR: { rotate: [14, -14, 14], transition: { duration: 0.62, repeat: Infinity } },
        head: { rotate: [8, -8, 8], transition: { duration: 0.62, repeat: Infinity } },
      };
    case 'yes':
      return {
        head: { rotate: [0, 14, 0, 14, 0], transition: { duration: 1.1 } },
        body: { y: 0 }, armL: { rotate: 8 }, armR: { rotate: -8 }, legL: { rotate: 0 }, legR: { rotate: 0 },
      };
    case 'no':
      return {
        head: { rotate: [0, -13, 13, -13, 0], transition: { duration: 1.1 } },
        body: { y: 0 }, armL: { rotate: 8 }, armR: { rotate: -8 }, legL: { rotate: 0 }, legR: { rotate: 0 },
      };
    case 'think':
      return {
        armR: { rotate: -95, transition: SPRING },
        head: { rotate: [0, 7, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
        body: { y: 0 }, armL: { rotate: 8 }, legL: { rotate: 0 }, legR: { rotate: 0 },
      };
    default: // idle — breathing, never perfectly still
      return {
        body: { y: [0, -4, 0], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
        armL: { rotate: [8, 12, 8], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
        armR: { rotate: [-8, -12, -8], transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
        legL: { rotate: 0 }, legR: { rotate: 0 },
        head: { rotate: [0, 2, 0, -2, 0], transition: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' } },
      };
  }
};

const EYE = {
  neutral:   { ry: 6, path: 'M46 66 q14 8 28 0' },
  happy:     { ry: 6, path: 'M44 64 q16 12 32 0' },
  sad:       { ry: 5, path: 'M46 72 q14 -8 28 0' },
  surprised: { ry: 8, path: 'M52 68 q8 8 16 0' },
  angry:     { ry: 4, path: 'M46 72 q14 -6 28 0' },
};

export default function ChitiSVG({ action = 'idle', mood = 'neutral', speaking = false, intensity = 0, big = false }) {
  const a = rig(action);
  const face = EYE[mood] || EYE.neutral;
  const accent = mood === 'sad' ? '#7C8AA8' : mood === 'angry' ? '#FF6B5A' : '#64D2FF';
  // Mouth opens on each spoken word.
  const mouthOpen = speaking ? 3 + intensity * 9 : 0;

  return (
    <svg viewBox="0 0 120 190" width="100%" height="100%"
         role="img" aria-label="Chiti the robot"
         style={{ overflow: 'visible', filter: 'drop-shadow(0 14px 28px rgba(94,92,230,.45))' }}>
      <defs>
        <linearGradient id="cs-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#242b52" /><stop offset="1" stopColor="#141833" />
        </linearGradient>
      </defs>

      <motion.g animate={a.body} initial={false}>
        {/* ── legs ── */}
        <motion.g animate={a.legL} initial={false} style={{ originX: '46px', originY: '132px' }}>
          <rect x="41" y="132" width="12" height="34" rx="6" fill="#4a5180" />
          <rect x="38" y="162" width="18" height="9" rx="4.5" fill="#5E5CE6" />
        </motion.g>
        <motion.g animate={a.legR} initial={false} style={{ originX: '74px', originY: '132px' }}>
          <rect x="67" y="132" width="12" height="34" rx="6" fill="#4a5180" />
          <rect x="64" y="162" width="18" height="9" rx="4.5" fill="#5E5CE6" />
        </motion.g>

        {/* ── arms ── */}
        <motion.g animate={a.armL} initial={false} style={{ originX: '34px', originY: '96px' }}>
          <rect x="28" y="94" width="11" height="34" rx="5.5" fill="#4a5180" />
          <circle cx="33.5" cy="130" r="7" fill="#5E5CE6" />
        </motion.g>
        <motion.g animate={a.armR} initial={false} style={{ originX: '86px', originY: '96px' }}>
          <rect x="81" y="94" width="11" height="34" rx="5.5" fill="#4a5180" />
          <circle cx="86.5" cy="130" r="7" fill="#5E5CE6" />
        </motion.g>

        {/* ── torso ── */}
        <rect x="36" y="88" width="48" height="48" rx="14" fill="url(#cs-body)" stroke={accent} strokeWidth="2.5" />
        <circle cx="60" cy="112" r="7" fill="none" stroke={accent} strokeWidth="2" opacity=".65" />
        <motion.circle cx="60" cy="112" r="3" fill={accent}
          animate={{ opacity: [1, .35, 1] }} transition={{ duration: 1.8, repeat: Infinity }} />

        {/* ── head ── */}
        <motion.g animate={a.head} initial={false} style={{ originX: '60px', originY: '86px' }}>
          <line x1="60" y1="30" x2="60" y2="18" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <motion.circle cx="60" cy="15" r="4.5" fill={accent}
            animate={{ opacity: [1, .3, 1], scale: [1, 1.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />

          <rect x="26" y="30" width="68" height="56" rx="17" fill="url(#cs-body)" stroke={accent} strokeWidth="2.5" />
          <rect x="20" y="50" width="6" height="16" rx="3" fill="#5E5CE6" />
          <rect x="94" y="50" width="6" height="16" rx="3" fill="#5E5CE6" />

          {/* eyes — blink on a loop */}
          <motion.ellipse cx="46" cy="54" rx="6.5" ry={face.ry} fill={accent}
            initial={{ ry: face.ry }}
            animate={{ ry: [face.ry, face.ry, 0.6, face.ry] }}
            transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.92, 0.96, 1] }} />
          <motion.ellipse cx="74" cy="54" rx="6.5" ry={face.ry} fill={accent}
            initial={{ ry: face.ry }}
            animate={{ ry: [face.ry, face.ry, 0.6, face.ry] }}
            transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.92, 0.96, 1] }} />

          {/* mouth — a curve at rest, an opening oval while talking */}
          {speaking ? (
            <motion.ellipse cx="60" cy="70" rx="9" ry={mouthOpen || 1} fill="#0b0e1c" stroke={accent} strokeWidth="2"
              initial={{ ry: 1 }} animate={{ ry: mouthOpen || 1 }} transition={{ duration: 0.09 }} />
          ) : (
            <path d={face.path} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          )}
        </motion.g>
      </motion.g>
    </svg>
  );
}
