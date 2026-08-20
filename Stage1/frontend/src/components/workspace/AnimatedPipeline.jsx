import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Grid3X3, BarChart2, ScanLine, ChevronRight } from 'lucide-react';
import { useChiti } from '../chiti/ChitiProvider';

/**
 * AnimatedPipeline — an animated, step-by-step visualisation of how the CV
 * model processes a drawn digit: Capture → Edge Detection → Grid → Decide.
 *
 * Each step auto-advances after ~5s and shows a Chiti-style narration.
 * The student can click any step dot to jump to it.
 */

const STEP_DURATION = 5000; // ms per step

const STEP_META = [
  { icon: ScanLine, label: 'Capture', color: '#00F0FF',
    narration: 'First, I capture your drawing as raw pixels — just a grid of brightness values.' },
  { icon: Eye, label: 'Edges', color: '#B200FF',
    narration: 'Next I run a Sobel edge filter to find the outlines — the strokes that define the shape.' },
  { icon: Grid3X3, label: '28×28 Grid', color: '#FF9933',
    narration: 'I shrink the image to a tiny 28×28 grid of numbers between 0 and 1. This is what the neural network actually reads.' },
  { icon: BarChart2, label: 'Predict', color: '#00FF88',
    narration: 'Finally I score every digit 0–9. The tallest bar is my best guess!' },
];

/** Render the 28×28 grid with animated cell reveal */
function AnimatedGrid({ grid, revealed }) {
  if (!grid) return null;
  const n = 28;
  const cellSize = 7; // px per cell — keeps the grid at ~196px
  return (
    <div style={{
      display: 'inline-grid',
      gridTemplateColumns: `repeat(${n}, ${cellSize}px)`,
      gridTemplateRows: `repeat(${n}, ${cellSize}px)`,
      gap: 0,
      borderRadius: 6,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.15)',
    }}>
      {Array.from({ length: n * n }).map((_, idx) => {
        const v = grid[idx] || 0;
        const show = idx < revealed;
        const bright = Math.round(v * 255);
        return (
          <div
            key={idx}
            style={{
              width: cellSize,
              height: cellSize,
              background: show
                ? `rgb(${bright},${bright},${bright})`
                : 'rgba(0,0,0,0.8)',
              transition: 'background 0.05s ease',
            }}
          />
        );
      })}
    </div>
  );
}

/** Animated confidence bars for digits 0–9 */
function AnimatedBars({ bars, highlight, animate }) {
  if (!bars) return null;
  const maxVal = Math.max(...bars.map(b => b.value), 0.01);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', gap: 4,
      height: '100%', minHeight: 120, maxHeight: 180, padding: '0 4px',
    }}>
      {bars.map((b, i) => {
        const pct = animate ? (b.value / maxVal) * 100 : 0;
        const isWinner = i === highlight;
        return (
          <div key={i} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end',
          }}>
            <span style={{
              fontSize: '0.65rem', color: isWinner ? '#30d158' : 'var(--text-secondary)',
              fontWeight: isWinner ? 700 : 400, fontFamily: 'monospace',
            }}>
              {animate ? `${Math.round(b.value * 100)}%` : ''}
            </span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.05 }}
              style={{
                width: '100%', borderRadius: 3,
                background: isWinner
                  ? 'linear-gradient(180deg, #30d158, #0a84ff)'
                  : 'rgba(255,255,255,0.2)',
                boxShadow: isWinner ? '0 0 12px rgba(48,209,88,0.5)' : 'none',
                minHeight: 2,
              }}
            />
            <span style={{
              fontSize: '0.7rem',
              color: isWinner ? '#30d158' : 'var(--text-secondary)',
              fontWeight: isWinner ? 700 : 400,
            }}>
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function AnimatedPipeline({ cvResult, edgeImage, gridData }) {
  const [activeStep, setActiveStep] = useState(0);
  const [gridRevealed, setGridRevealed] = useState(0);
  const timerRef = useRef(null);
  const gridTimerRef = useRef(null);
  const chiti = useChiti();

  // Narrate current step
  useEffect(() => {
    if (cvResult && activeStep >= 0 && activeStep < STEP_META.length) {
      chiti.react({
        text: STEP_META[activeStep].narration,
        mood: 'happy'
      });
    }
  }, [activeStep, cvResult]);

  // Auto-advance steps
  useEffect(() => {
    if (!cvResult) { setActiveStep(0); return; }
    setActiveStep(0);
    setGridRevealed(0);

    let step = 0;
    timerRef.current = setInterval(() => {
      step += 1;
      if (step >= 4) {
        clearInterval(timerRef.current);
        return;
      }
      setActiveStep(step);
    }, STEP_DURATION);

    return () => clearInterval(timerRef.current);
  }, [cvResult]);

  // Grid cell reveal animation for step 2
  useEffect(() => {
    if (activeStep === 2 && gridData) {
      setGridRevealed(0);
      const total = 28 * 28;
      const batchSize = Math.ceil(total / 30); // reveal in ~30 frames
      let revealed = 0;
      gridTimerRef.current = setInterval(() => {
        revealed += batchSize;
        if (revealed >= total) {
          revealed = total;
          clearInterval(gridTimerRef.current);
        }
        setGridRevealed(revealed);
      }, 50);
      return () => clearInterval(gridTimerRef.current);
    }
  }, [activeStep, gridData]);

  const stages = cvResult?.stages || [];
  const captureImage = stages[0]?.image;
  const processedImage = stages[1]?.image;
  const heatImage = stages[2]?.image;
  const bars = stages[3]?.bars;
  const digit = cvResult?.digit;

  if (!cvResult) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: 'var(--text-secondary)', opacity: 0.5,
      }}>
        <Eye size={40} />
        <p style={{ margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>
          Draw a digit and click Predict<br/>to see how I process it step by step
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', gap: 8,
    }}>
      {/* Step Progress Dots */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}>
        {STEP_META.map((meta, i) => {
          const Icon = meta.icon;
          const isActive = activeStep === i;
          const isDone = activeStep > i;
          return (
            <React.Fragment key={i}>
              <button
                onClick={() => { clearInterval(timerRef.current); setActiveStep(i); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 8,
                  background: isActive ? `${meta.color}20` : isDone ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: isActive ? `1px solid ${meta.color}` : '1px solid transparent',
                  color: isActive ? meta.color : isDone ? '#aaa' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '0.75rem', fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.3s',
                }}
              >
                <Icon size={14} />
                {meta.label}
              </button>
              {i < 3 && <ChevronRight size={12} color="var(--text-secondary)" style={{ opacity: 0.4 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Narration */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 5 }}
          transition={{ duration: 0.25 }}
          style={{
            padding: '6px 12px', borderRadius: 8,
            background: `${STEP_META[activeStep].color}10`,
            border: `1px solid ${STEP_META[activeStep].color}30`,
            color: '#e0e4f0', fontSize: '0.8rem', textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          {STEP_META[activeStep].narration}
        </motion.div>
      </AnimatePresence>

      {/* Stage Content */}
      <div style={{
        flex: 1, minHeight: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
      }}>
        <AnimatePresence mode="wait">
          {activeStep === 0 && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              {captureImage && (
                <img src={captureImage} alt="Captured drawing"
                  style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12, border: '2px solid rgba(0,240,255,0.3)', imageRendering: 'pixelated' }}
                />
              )}
              <span style={{ color: '#00F0FF', fontSize: '0.75rem', fontWeight: 600 }}>Raw pixel capture</span>
            </motion.div>
          )}

          {activeStep === 1 && (
            <motion.div
              key="edges"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{ display: 'flex', gap: 16, alignItems: 'center' }}
            >
              {captureImage && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <img src={captureImage} alt="Original"
                    style={{ width: 120, height: 120, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', imageRendering: 'pixelated' }}
                  />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Original</span>
                </div>
              )}
              <ChevronRight size={20} color="#B200FF" />
              {edgeImage && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                >
                  <img src={edgeImage} alt="Edge detection"
                    style={{ width: 140, height: 140, borderRadius: 10, border: '2px solid rgba(178,0,255,0.5)', imageRendering: 'pixelated',
                      boxShadow: '0 0 20px rgba(178,0,255,0.3)' }}
                  />
                  <span style={{ fontSize: '0.65rem', color: '#B200FF', fontWeight: 600 }}>Sobel edges detected</span>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeStep === 2 && (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <AnimatedGrid grid={gridData} revealed={gridRevealed} />
              <span style={{ fontSize: '0.7rem', color: '#FF9933', fontWeight: 600 }}>
                28×28 = 784 pixel values → neural network input
              </span>
            </motion.div>
          )}

          {activeStep === 3 && (
            <motion.div
              key="predict"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              {cvResult.digit != null && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    textAlign: 'center', padding: '8px 0',
                    fontSize: '1.3rem', fontWeight: 700,
                    color: '#30d158',
                  }}
                >
                  🎯 It's a <span style={{ fontSize: '1.8rem' }}>{cvResult.digit}</span> — {cvResult.confidence}% sure
                </motion.div>
              )}
              <div style={{ flex: 1, minHeight: 0 }}>
                <AnimatedBars bars={bars} highlight={digit} animate={true} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mismatch warning (shown on any step) */}
      {cvResult.mismatch_message && (
        <div style={{
          padding: '6px 10px', borderRadius: 8,
          background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)',
          color: '#fff', fontSize: '0.75rem', lineHeight: 1.4,
        }}>
          <strong style={{ color: '#ff3366' }}>⚠ Distribution Mismatch:</strong> {cvResult.mismatch_message}
        </div>
      )}
    </div>
  );
}
