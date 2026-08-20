import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChiti } from './ChitiProvider';
import ChitiCharacter from './ChitiCharacter';
import './chiti.css';

/**
 * ChitiStage — renders the character wherever the director says he should be:
 *
 *   mode 'stage'      full screen, big, speaking a story beat
 *   mode 'companion'  small, bottom-right, still alive and reactive
 *   mode 'hidden'     nothing
 *
 * Mounted once at the app root, so Chiti persists across page changes instead
 * of being re-created (and re-loading the model) on every view.
 */
export default function ChitiStage({ onStageDone }) {
  const { mode, action, mood, speaking, intensity, caption, renderer, muted, setMuted, dismiss, toCompanion } = useChiti();

  // Esc skips a full-screen beat — never trap a student in a cutscene.
  useEffect(() => {
    if (mode !== 'stage') return;
    const onKey = (e) => { if (e.key === 'Escape') { toCompanion(); onStageDone?.(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, toCompanion, onStageDone]);

  if (mode === 'hidden') return null;

  const character = (
    <ChitiCharacter renderer={renderer} action={action} mood={mood}
                    speaking={speaking} intensity={intensity} big={mode === 'stage'} />
  );

  return (
    <AnimatePresence mode="wait">
      {mode === 'stage' ? (
        <motion.div key="stage" className="ch-stage"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.32 }}>

          <div className="ch-tools">
            <button className="ch-tool" title={muted ? 'Unmute Chiti' : 'Mute Chiti'}
                    aria-label={muted ? 'Unmute Chiti' : 'Mute Chiti'}
                    onClick={() => setMuted(!muted)}>{muted ? '🔇' : '🔊'}</button>
            <button className="ch-tool" title="Skip" aria-label="Skip"
                    onClick={() => { toCompanion(); onStageDone?.(); }}>✕</button>
          </div>

          <div className="ch-stage-inner">
            <motion.div className="ch-stage-figure"
              initial={{ scale: 0.6, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 180, damping: 22 }}>
              {character}
            </motion.div>

            <motion.div className="ch-bubble"
              initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22 }}>
              <div className="ch-name">Chiti</div>
              <p className="ch-line">{caption}</p>
              <div className="ch-actions">
                <button className="ch-btn" onClick={() => { toCompanion(); onStageDone?.(); }}>
                  Let's go →
                </button>
                <button className="ch-btn ghost" onClick={dismiss}>Not now</button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="companion" className="ch-companion"
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 30 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
          <AnimatePresence>
            {caption && (
              <motion.div className="ch-mini-bubble"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                {caption}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="ch-companion-figure" onClick={() => setMuted(!muted)}
               title={muted ? 'Chiti is muted — click to unmute' : 'Click to mute Chiti'}>
            {character}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
