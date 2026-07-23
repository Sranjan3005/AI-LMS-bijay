import React from 'react';
import { motion } from 'framer-motion';

// ChitiRobot — a growable mascot. Unlike the tiny guide avatar, this one gains
// visible parts as abilities unlock, so progress is something the student can
// SEE on their robot, not just a percentage.
//
// props:
//   abilities  array of unlocked ability ids (from chitiProgress.unlockedAbilities)
//   mood       'idle' | 'point' | 'think' | 'cheer'
//   size       px
export default function ChitiRobot({ abilities = [], mood = 'idle', size = 120 }) {
  const has = (id) => abilities.includes(id);
  const accent = has('eyes') ? '#FF9F0A' : '#64D2FF';

  return (
    <motion.svg
      width={size} height={size} viewBox="0 0 120 130"
      role="img" aria-label="Chiti the robot"
      style={{ filter: 'drop-shadow(0 12px 26px rgba(94,92,230,.45))' }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
    >
      <defs>
        <linearGradient id="chiti-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e2444" /><stop offset="1" stopColor="#12142a" />
        </linearGradient>
        <linearGradient id="chiti-heart" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF6482" /><stop offset="1" stopColor="#FF375F" />
        </linearGradient>
      </defs>

      {/* antenna — blinks once Chiti has a brain */}
      <line x1="60" y1="22" x2="60" y2="10" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="8" r="4" fill={has('brain') ? accent : '#3a3f5c'}>
        {has('brain') && <animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite" />}
      </circle>

      {/* hands / arms — appear with the agentic 'hands' ability */}
      {has('hands') && (
        <>
          <motion.g animate={{ rotate: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '18px 78px' }}>
            <rect x="6" y="74" width="14" height="8" rx="4" fill="#5E5CE6" />
          </motion.g>
          <motion.g animate={{ rotate: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} style={{ transformOrigin: '102px 78px' }}>
            <rect x="100" y="74" width="14" height="8" rx="4" fill="#5E5CE6" />
          </motion.g>
        </>
      )}

      {/* head */}
      <rect x="24" y="22" width="72" height="60" rx="18" fill="url(#chiti-body)" stroke={accent} strokeWidth="2.5" />
      {/* ears / sensors */}
      <rect x="18" y="44" width="6" height="16" rx="3" fill="#5E5CE6" />
      <rect x="96" y="44" width="6" height="16" rx="3" fill="#5E5CE6" />

      {/* eyes — dim until 'brain', bright camera-lenses once 'eyes' unlock */}
      {mood === 'cheer' ? (
        <>
          <path d="M38 48 q6 -8 12 0" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" />
          <path d="M70 48 q6 -8 12 0" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" />
        </>
      ) : has('eyes') ? (
        <>
          <circle cx="44" cy="50" r="8" fill="#0b0e1c" stroke={accent} strokeWidth="2.5" />
          <circle cx="76" cy="50" r="8" fill="#0b0e1c" stroke={accent} strokeWidth="2.5" />
          <circle cx="46" cy="48" r="2.5" fill={accent} />
          <circle cx="78" cy="48" r="2.5" fill={accent} />
        </>
      ) : (
        <>
          <circle cx="44" cy="50" r="6" fill={has('brain') ? accent : '#3a3f5c'}>
            {has('brain') && <animate attributeName="ry" values="6;6;0.7;6" dur="4s" repeatCount="indefinite" />}
          </circle>
          <circle cx="76" cy="50" r="6" fill={has('brain') ? accent : '#3a3f5c'}>
            {has('brain') && <animate attributeName="ry" values="6;6;0.7;6" dur="4s" repeatCount="indefinite" />}
          </circle>
        </>
      )}

      {/* mouth */}
      <path d="M46 66 q14 8 28 0" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />

      {/* chest panel — grows a heart once 'conscience' unlocks */}
      <rect x="40" y="88" width="40" height="30" rx="8" fill="url(#chiti-body)" stroke={accent} strokeWidth="2" opacity=".9" />
      {has('conscience') ? (
        <motion.path
          d="M60 112 l-8 -8 a5 5 0 017-7 l1 1 1 -1 a5 5 0 017 7 z"
          fill="url(#chiti-heart)"
          animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 1.1, repeat: Infinity }}
          style={{ transformOrigin: '60px 103px' }}
        />
      ) : (
        <>
          {/* progress "power cells" light up as core abilities land */}
          {['maths', 'senses', 'predict', 'judge', 'depth'].map((id, i) => (
            <circle key={id} cx={48 + i * 6} cy="103" r="2.4" fill={has(id) ? '#30D158' : '#33395a'} />
          ))}
        </>
      )}
    </motion.svg>
  );
}
