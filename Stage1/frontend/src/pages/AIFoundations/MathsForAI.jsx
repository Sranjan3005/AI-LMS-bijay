import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, ChevronLeft, MapPin, Target } from 'lucide-react';
import styles from './MathsForAI.module.css';

// ── Constants ──
const GRID_SIZE = 5;
const TARGET_POS = { x: 3, y: 4 };
const DEFAULT_SCORES = [20, 45, 45, 80, 90];
const MATCH_LABELS = ['Match 1', 'Match 2', 'Match 3', 'Match 4', 'Match 5'];
const BAR_COLORS = ['#00F0FF', '#B200FF', '#00FF88', '#FF3366', '#ffc832'];

const MathsForAI = ({ onBackToDashboard, initialStep = 0 }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const totalSteps = 6;

  // ─── Intro Sections State ───
  const [introStatsTab, setIntroStatsTab] = useState('mean'); // 'mean' | 'median' | 'mode'

  // ─── Section 1: Coordinates ───
  const [inputX, setInputX] = useState('');
  const [inputY, setInputY] = useState('');
  const [avatarPos, setAvatarPos] = useState(null);
  const [coordResult, setCoordResult] = useState(null); // 'found' | 'miss' | null

  // ─── Section 2: Cricket ───
  const [scores, setScores] = useState([...DEFAULT_SCORES]);

  // ─── Section 3: Magic Line ───
  const [slopeM, setSlopeM] = useState(12);
  const [interceptC, setInterceptC] = useState(25);

  // ── Navigation ──
  const handleNext = () => { if (currentStep < totalSteps - 1) setCurrentStep(p => p + 1); };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

  // ── Section 1 handlers ──
  const handleNavigateGrid = useCallback(() => {
    const x = parseInt(inputX);
    const y = parseInt(inputY);
    if (x >= 1 && x <= 5 && y >= 1 && y <= 5) {
      setAvatarPos({ x, y });
      setCoordResult(x === TARGET_POS.x && y === TARGET_POS.y ? 'found' : 'miss');
    }
  }, [inputX, inputY]);

  const handleResetGrid = useCallback(() => {
    setInputX('');
    setInputY('');
    setAvatarPos(null);
    setCoordResult(null);
  }, []);

  // ── Section 2 calculations ──
  const updateScore = useCallback((idx, val) => {
    setScores(prev => { const n = [...prev]; n[idx] = val; return n; });
  }, []);

  const mean = useMemo(() => scores.reduce((a, b) => a + b, 0) / scores.length, [scores]);
  const median = useMemo(() => {
    const s = [...scores].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }, [scores]);
  const mode = useMemo(() => {
    const freq = {};
    scores.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    const maxF = Math.max(...Object.values(freq));
    if (maxF === 1) return 'None';
    return Object.keys(freq).filter(k => freq[k] === maxF).join(', ');
  }, [scores]);

  // ── Section 3: SVG graph helpers ──
  const SVG = { w: 500, h: 300, pl: 55, pr: 20, pt: 20, pb: 45 };
  const plotW = SVG.w - SVG.pl - SVG.pr;
  const plotH = SVG.h - SVG.pt - SVG.pb;
  const xMax = 10, yMax = 250;
  const toSvgX = (d) => SVG.pl + (d / xMax) * plotW;
  const toSvgY = (d) => SVG.pt + (1 - d / yMax) * plotH;

  const farePoints = useMemo(() =>
    [0, 2, 4, 6, 8, 10].map(d => ({ dist: d, fare: slopeM * d + interceptC })),
    [slopeM, interceptC]
  );

  // ── Render ──
  return (
    <div className={styles.page}>
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Exit Lesson
        </button>
        <span className={styles.pageTitle}>Basic Maths for AI: The Detective’s Toolkit</span>
        <span className={styles.progressText}>Section {currentStep + 1} of {totalSteps}</span>
      </nav>

      <div className={styles.flashcardContainer}>
        <AnimatePresence mode="wait">

          {/* ═══════════════════════════════
              INTRO 1: WHAT IS A POINT?
              ═══════════════════════════════ */}
          {currentStep === 0 && (
            <motion.div key="intro0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#00F0FF' }}>Section 01 · Intro to Coordinates</div>
              <h1 className={styles.sectionTitle}>
                What is a <em style={{ backgroundImage: 'linear-gradient(135deg, #00F0FF, #00FF88)' }}>Point?</em>
              </h1>

              <div className={styles.narrative}>
                <p>Before we navigate the Smart City, we need to understand how to read a map. In mathematics, we use a <strong>Coordinate System</strong>.</p>
                <p>Every location is described by two numbers: an <strong>X-coordinate</strong> (how far left/right) and a <strong>Y-coordinate</strong> (how far up/down).</p>
              </div>

              <div className={styles.introVisualBox}>
                <svg className={styles.introSvg} viewBox="0 0 300 200" style={{ padding: '20px' }}>
                  <defs>
                    <marker id="arrowX" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#00F0FF" />
                    </marker>
                    <marker id="arrowY" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#00FF88" />
                    </marker>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="40" y1="160" x2="280" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="40" y1="100" x2="280" y2="100" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="40" y1="40" x2="280" y2="40" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  
                  <line x1="40" y1="160" x2="40" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <line x1="160" y1="160" x2="160" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4 4" />
                  <line x1="280" y1="160" x2="280" y2="20" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* Axes */}
                  <line x1="40" y1="160" x2="290" y2="160" stroke="#00F0FF" strokeWidth="3" markerEnd="url(#arrowX)" />
                  <line x1="40" y1="160" x2="40" y2="10" stroke="#00FF88" strokeWidth="3" markerEnd="url(#arrowY)" />
                  
                  <text x="295" y="165" fill="#00F0FF" fontSize="14" fontWeight="bold">X</text>
                  <text x="35" y="5" fill="#00FF88" fontSize="14" fontWeight="bold">Y</text>

                  {/* Point */}
                  <circle cx="160" cy="100" r="6" fill="#f4f1ea" />
                  <text x="175" y="95" fill="#f4f1ea" fontSize="16" fontWeight="bold" fontFamily="Outfit">(X, Y)</text>
                  <text x="175" y="115" fill="#8B949E" fontSize="12">An address in space!</text>
                </svg>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════
              SECTION 1: COORDINATES
              ═══════════════════════════════ */}
          {currentStep === 1 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#00F0FF' }}>Section 01 · Coordinates</div>
              <h1 className={styles.sectionTitle}>
                Navigating the Coordinates in <em style={{ backgroundImage: 'linear-gradient(135deg, #00F0FF, #00FF88)' }}>Smart City</em>
              </h1>

              <div className={styles.narrative}>
                <p>Every piece of data needs an <strong>address</strong>. Just like you navigate a grid of streets to find your favorite <span className={styles.highlight} style={{ color: '#00F0FF' }}>Samosa stall</span>, AI finds data on a graph using an <strong>X</strong> (horizontal) and <strong>Y</strong> (vertical) axis.</p>
              </div>

              <div className={styles.interactivePanel}>
                <div className={styles.gridLayout}>
                  {/* Grid */}
                  <div>
                    <div className={styles.gridWrapper}>
                      <div className={styles.yAxis}>
                        {[5, 4, 3, 2, 1].map(y => (
                          <span key={y} className={styles.yAxisLabel}>{y}</span>
                        ))}
                      </div>
                      <div className={styles.gridBoard}>
                        {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, idx) => {
                          const col = idx % GRID_SIZE;
                          const row = Math.floor(idx / GRID_SIZE);
                          const cellX = col + 1;
                          const cellY = GRID_SIZE - row;
                          const isTarget = cellX === TARGET_POS.x && cellY === TARGET_POS.y;
                          const isAvatar = avatarPos && cellX === avatarPos.x && cellY === avatarPos.y;
                          const isFound = isTarget && isAvatar;

                          let cellClass = styles.gridCell;
                          if (isFound) cellClass += ` ${styles.gridCellFound}`;
                          else if (isTarget) cellClass += ` ${styles.gridCellTarget}`;
                          else if (isAvatar) cellClass += ` ${styles.gridCellAvatar}`;

                          return (
                            <div key={idx} className={cellClass}>
                              {isFound && '🎉'}
                              {isTarget && !isAvatar && '🏪'}
                              {isAvatar && !isTarget && '📍'}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.xAxis}>
                      {[1, 2, 3, 4, 5].map(x => (
                        <span key={x} className={styles.xAxisLabel}>{x}</span>
                      ))}
                    </div>
                  </div>

                  {/* Input Panel */}
                  <div className={styles.inputPanel}>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>X Coordinate (1–5)</label>
                      <input
                        type="number" min="1" max="5"
                        className={styles.coordInput}
                        value={inputX}
                        onChange={e => { setInputX(e.target.value); setCoordResult(null); }}
                        placeholder="?"
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Y Coordinate (1–5)</label>
                      <input
                        type="number" min="1" max="5"
                        className={styles.coordInput}
                        value={inputY}
                        onChange={e => { setInputY(e.target.value); setCoordResult(null); }}
                        placeholder="?"
                      />
                    </div>
                    <button
                      className={styles.goBtn}
                      onClick={handleNavigateGrid}
                      disabled={!inputX || !inputY}
                    >
                      <MapPin size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
                      Navigate!
                    </button>

                    {coordResult === 'found' && (
                      <div className={`${styles.resultMsg} ${styles.resultSuccess}`}>
                        🎉 Found It! The Samosa stall is here!
                      </div>
                    )}
                    {coordResult === 'miss' && (
                      <div className={`${styles.resultMsg} ${styles.resultMiss}`}>
                        ❌ Not here! Try again — the stall is hiding at ({TARGET_POS.x}, {TARGET_POS.y})
                      </div>
                    )}

                    {coordResult && (
                      <button className={styles.resetBtn} onClick={handleResetGrid}>↻ Reset</button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════
              INTRO 2: MEAN, MEDIAN, MODE
              ═══════════════════════════════ */}
          {currentStep === 2 && (
            <motion.div key="intro1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#00FF88' }}>Section 02 · Intro to Averages</div>
              <h1 className={styles.sectionTitle}>
                What is <em style={{ backgroundImage: 'linear-gradient(135deg, #00FF88, #00F0FF)' }}>Normal?</em>
              </h1>

              <div className={styles.narrative}>
                <p>When an AI looks at data, it often needs to find the "typical" or "normal" value. We have three main ways to do this: <strong>Mean</strong>, <strong>Median</strong>, and <strong>Mode</strong>.</p>
              </div>

              <div className={styles.introVisualBox}>
                
                {/* SVG Graph for Stats */}
                <svg className={styles.introSvg} viewBox="0 0 300 150" style={{ padding: '10px' }}>
                  {/* Base Line */}
                  <line x1="20" y1="120" x2="280" y2="120" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  
                  {/* Bars */}
                  <rect x="40" y="80" width="20" height="40" fill={introStatsTab === 'mode' ? 'rgba(255,255,255,0.1)' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 0.3 : 0.8} rx="4" />
                  <rect x="70" y="80" width="20" height="40" fill={introStatsTab === 'mode' ? 'rgba(255,255,255,0.1)' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 0.3 : 0.8} rx="4" />
                  <rect x="100" y="60" width="20" height="60" fill={introStatsTab === 'mode' ? 'rgba(255,255,255,0.1)' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 0.3 : 0.8} rx="4" />
                  
                  {/* The Mode Bars */}
                  <rect x="130" y="20" width="20" height="100" fill={introStatsTab === 'mode' ? '#00FF88' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 1 : 0.8} rx="4" />
                  <rect x="160" y="20" width="20" height="100" fill={introStatsTab === 'mode' ? '#00FF88' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 1 : 0.8} rx="4" />
                  <rect x="190" y="20" width="20" height="100" fill={introStatsTab === 'mode' ? '#00FF88' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 1 : 0.8} rx="4" />
                  
                  <rect x="220" y="40" width="20" height="80" fill={introStatsTab === 'mode' ? 'rgba(255,255,255,0.1)' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 0.3 : 0.8} rx="4" />
                  <rect x="250" y="80" width="20" height="40" fill={introStatsTab === 'mode' ? 'rgba(255,255,255,0.1)' : '#00F0FF'} opacity={introStatsTab === 'mode' ? 0.3 : 0.8} rx="4" />

                  {/* Median Line */}
                  {introStatsTab === 'median' && (
                    <g>
                      <line x1="155" y1="10" x2="155" y2="135" stroke="#B200FF" strokeWidth="3" strokeDasharray="4 4" />
                      <text x="155" y="5" fill="#B200FF" fontSize="12" fontWeight="bold" textAnchor="middle">Middle Value</text>
                    </g>
                  )}

                  {/* Mean Line (Balance Point) */}
                  {introStatsTab === 'mean' && (
                    <g>
                      <polygon points="145,120 155,120 150,110" fill="#ffc832" />
                      <line x1="150" y1="120" x2="150" y2="135" stroke="#ffc832" strokeWidth="2" />
                      <text x="150" y="145" fill="#ffc832" fontSize="12" fontWeight="bold" textAnchor="middle">Balance Point</text>
                    </g>
                  )}
                </svg>

                {/* Toggles */}
                <div className={styles.statsToggleGroup}>
                  <button className={`${styles.statsToggleBtn} ${introStatsTab === 'mean' ? styles.statsToggleBtnActive : ''}`} onClick={() => setIntroStatsTab('mean')}>Mean</button>
                  <button className={`${styles.statsToggleBtn} ${introStatsTab === 'median' ? styles.statsToggleBtnActive : ''}`} onClick={() => setIntroStatsTab('median')}>Median</button>
                  <button className={`${styles.statsToggleBtn} ${introStatsTab === 'mode' ? styles.statsToggleBtnActive : ''}`} onClick={() => setIntroStatsTab('mode')}>Mode</button>
                </div>

                <div className={styles.statsDefinition}>
                  {introStatsTab === 'mean' && "The Mean is the average. Imagine finding the exact point where all the blocks perfectly balance."}
                  {introStatsTab === 'median' && "The Median is the exact middle. If you line up all blocks by size, it's the one right in the center."}
                  {introStatsTab === 'mode' && "The Mode is the most popular value. It's the highest peak because it happens the most often!"}
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════
              SECTION 2: CRICKET ANALYST
              ═══════════════════════════════ */}
          {currentStep === 3 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#00FF88' }}>Section 02 · Mean, Median & Mode</div>
              <h1 className={styles.sectionTitle}>
                The <em style={{ backgroundImage: 'linear-gradient(135deg, #00FF88, #00F0FF)' }}>Cricket Analyst</em>
              </h1>

              <div className={styles.narrative}>
                <p>To teach an AI what <strong>"normal"</strong> is, we look at averages. Let's analyze a cricketer's <span className={styles.highlight} style={{ color: '#00FF88' }}>runs over 5 matches</span> to find the "normal." Drag the bars up or down!</p>
              </div>

              <div className={styles.interactivePanel}>
                <div className={styles.chartArea}>
                  <div className={styles.barChart}>
                    {/* Mean line */}
                    <div
                      className={styles.meanLineWrapper}
                      style={{ bottom: `${(mean / 100) * 180}px` }}
                    >
                      <div className={styles.meanLine}>
                        <span className={styles.meanLabel}>Average (Mean): {mean.toFixed(1)}</span>
                      </div>
                    </div>

                    {scores.map((score, i) => (
                      <div key={i} className={styles.barCol}>
                        <span className={styles.barValue}>{score}</span>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              height: `${(score / 100) * 100}%`,
                              background: `linear-gradient(to top, ${BAR_COLORS[i]}44, ${BAR_COLORS[i]})`,
                              boxShadow: `0 0 12px ${BAR_COLORS[i]}33`
                            }}
                          />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={score}
                            className={styles.barSlider}
                            onChange={e => updateScore(i, parseInt(e.target.value))}
                            title={`${MATCH_LABELS[i]}: ${score} runs`}
                          />
                        </div>
                        <span className={styles.barLabel}>{MATCH_LABELS[i]}</span>
                      </div>
                    ))}
                  </div>

                  <p className={styles.dragHint}>↕ Drag the bars up or down to change scores</p>

                  <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel} style={{ color: '#ffc832' }}>Mean</div>
                      <div className={styles.statValue}>{mean.toFixed(1)}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel} style={{ color: '#00F0FF' }}>Median</div>
                      <div className={styles.statValue}>{median}</div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel} style={{ color: '#B200FF' }}>Mode</div>
                      <div className={styles.statValue}>{mode}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════
              INTRO 3: WHAT IS A LINE?
              ═══════════════════════════════ */}
          {currentStep === 4 && (
            <motion.div key="intro2" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#B200FF' }}>Section 03 · Intro to Lines</div>
              <h1 className={styles.sectionTitle}>
                What is a <em style={{ backgroundImage: 'linear-gradient(135deg, #B200FF, #FF3366)' }}>Line?</em>
              </h1>

              <div className={styles.narrative}>
                <p>A straight line is the simplest way an AI can make a prediction. It’s defined by a famous mathematical equation: <strong>y = mx + c</strong>.</p>
              </div>

              <div className={styles.introVisualBox}>
                <svg className={styles.introSvg} viewBox="0 0 350 220" style={{ padding: '20px' }}>
                  {/* Grid / Axes */}
                  <line x1="30" y1="180" x2="320" y2="180" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  <line x1="30" y1="180" x2="30" y2="20" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />

                  {/* The Line */}
                  <line x1="30" y1="130" x2="280" y2="30" stroke="#00F0FF" strokeWidth="4" />

                  {/* Intercept (c) */}
                  <circle cx="30" cy="130" r="6" fill="#B200FF" />
                  <line x1="10" y1="130" x2="25" y2="130" stroke="#B200FF" strokeWidth="2" strokeDasharray="2 2" />
                  <text x="10" y="145" fill="#B200FF" fontSize="14" fontWeight="bold">c (Intercept)</text>
                  <text x="10" y="160" fill="#8B949E" fontSize="11">Where it starts on Y-axis</text>

                  {/* Slope (m) */}
                  <path d="M 130 90 L 180 90 L 180 70" fill="none" stroke="#FF3366" strokeWidth="2" strokeDasharray="4 4" />
                  <text x="188" y="85" fill="#FF3366" fontSize="14" fontWeight="bold">m (Slope)</text>
                  <text x="188" y="100" fill="#8B949E" fontSize="11">How steep it is</text>

                  {/* Equation */}
                  <rect x="80" y="10" width="180" height="35" rx="8" fill="rgba(0,0,0,0.5)" stroke="rgba(255,255,255,0.1)" />
                  <text x="170" y="33" fill="#f4f1ea" fontSize="18" fontWeight="bold" fontFamily="Outfit" textAnchor="middle">
                    y = <tspan fill="#FF3366">m</tspan>x + <tspan fill="#B200FF">c</tspan>
                  </text>
                </svg>

                <div className={styles.statsDefinition} style={{ maxWidth: '600px' }}>
                  By changing the slope (m) and intercept (c), an AI can move this line around until it perfectly slices through the data!
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════
              SECTION 3: MAGIC LINE y=mx+c
              ═══════════════════════════════ */}
          {currentStep === 5 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
              <div className={styles.sectionEyebrow} style={{ color: '#B200FF' }}>Section 03 · The Magic Line</div>
              <h1 className={styles.sectionTitle}>
                The <em style={{ backgroundImage: 'linear-gradient(135deg, #B200FF, #FF3366)' }}>Auto-Rickshaw</em> Meter
              </h1>

              <div className={styles.narrative}>
                <p>AI makes predictions by drawing lines. Think of an <strong>auto-rickshaw fare</strong>. You pay a <span className={styles.highlight} style={{ color: '#B200FF' }}>base meter charge</span> just to sit inside <strong>(Intercept)</strong>, plus a <span className={styles.highlight} style={{ color: '#FF3366' }}>rate for every kilometer</span> you travel <strong>(Slope)</strong>. Together, they draw a prediction line!</p>
              </div>

              <div className={styles.interactivePanel}>
                <div className={styles.graphLayout}>
                  {/* SVG Graph */}
                  <div className={styles.graphSvgWrapper}>
                    <svg className={styles.graphSvg} viewBox={`0 0 ${SVG.w} ${SVG.h}`} preserveAspectRatio="xMidYMid meet">
                      {/* Grid lines */}
                      {[0, 50, 100, 150, 200, 250].map(v => (
                        <line key={`gy${v}`} className={styles.gridLine} x1={SVG.pl} y1={toSvgY(v)} x2={SVG.w - SVG.pr} y2={toSvgY(v)} />
                      ))}
                      {[0, 2, 4, 6, 8, 10].map(v => (
                        <line key={`gx${v}`} className={styles.gridLine} x1={toSvgX(v)} y1={SVG.pt} x2={toSvgX(v)} y2={SVG.h - SVG.pb} />
                      ))}

                      {/* Axes */}
                      <line className={styles.axisLine} x1={SVG.pl} y1={SVG.pt} x2={SVG.pl} y2={SVG.h - SVG.pb} />
                      <line className={styles.axisLine} x1={SVG.pl} y1={SVG.h - SVG.pb} x2={SVG.w - SVG.pr} y2={SVG.h - SVG.pb} />

                      {/* Y-axis ticks */}
                      {[0, 50, 100, 150, 200, 250].map(v => (
                        <text key={`yt${v}`} className={styles.tickText} x={SVG.pl - 8} y={toSvgY(v) + 4} textAnchor="end">₹{v}</text>
                      ))}

                      {/* X-axis ticks */}
                      {[0, 2, 4, 6, 8, 10].map(v => (
                        <text key={`xt${v}`} className={styles.tickText} x={toSvgX(v)} y={SVG.h - SVG.pb + 18} textAnchor="middle">{v} km</text>
                      ))}

                      {/* Axis titles */}
                      <text className={styles.axisTitle} x={SVG.w / 2} y={SVG.h - 4} textAnchor="middle">Distance (km)</text>
                      <text className={styles.axisTitle} x={14} y={SVG.h / 2} textAnchor="middle" transform={`rotate(-90, 14, ${SVG.h / 2})`}>Total Fare (₹)</text>

                      {/* Prediction Line */}
                      <line
                        className={styles.predictionLine}
                        x1={toSvgX(0)}
                        y1={toSvgY(interceptC)}
                        x2={toSvgX(xMax)}
                        y2={toSvgY(Math.min(slopeM * xMax + interceptC, yMax))}
                      />

                      {/* Data points on the line */}
                      {farePoints.map((p, i) => (
                        p.fare <= yMax && (
                          <g key={i}>
                            <circle
                              className={styles.dataPoint}
                              cx={toSvgX(p.dist)}
                              cy={toSvgY(p.fare)}
                              r={4}
                              fill="#00F0FF"
                              opacity={0.9}
                            />
                            {/* Fare label on key points */}
                            {(p.dist === 0 || p.dist === 4 || p.dist === 8) && (
                              <text
                                x={toSvgX(p.dist) + 8}
                                y={toSvgY(p.fare) - 8}
                                fill="#c4c0d4"
                                fontSize="10"
                                fontFamily="Inter"
                              >
                                ₹{Math.round(p.fare)}
                              </text>
                            )}
                          </g>
                        )
                      ))}
                    </svg>
                  </div>

                  {/* Sliders */}
                  <div className={styles.slidersRow}>
                    <div className={styles.sliderGroup}>
                      <div className={styles.sliderHeader}>
                        <span className={styles.sliderName}>Base Fare (Intercept 'c')</span>
                        <span className={styles.sliderVal} style={{ color: '#B200FF' }}>₹{interceptC}</span>
                      </div>
                      <input
                        type="range" min="10" max="50"
                        value={interceptC}
                        onChange={e => setInterceptC(parseInt(e.target.value))}
                        className={styles.slider}
                        style={{ accentColor: '#B200FF' }}
                      />
                    </div>
                    <div className={styles.sliderGroup}>
                      <div className={styles.sliderHeader}>
                        <span className={styles.sliderName}>Rate per km (Slope 'm')</span>
                        <span className={styles.sliderVal} style={{ color: '#FF3366' }}>₹{slopeM}/km</span>
                      </div>
                      <input
                        type="range" min="5" max="20"
                        value={slopeM}
                        onChange={e => setSlopeM(parseInt(e.target.value))}
                        className={styles.slider}
                        style={{ accentColor: '#FF3366' }}
                      />
                    </div>
                  </div>

                  {/* Formula */}
                  <div className={styles.formulaBanner}>
                    Total Fare =
                    <span className={styles.formulaVar} style={{ background: 'rgba(255,51,102,0.15)', color: '#FF3366' }}>{slopeM}</span>
                    × Distance +
                    <span className={styles.formulaVar} style={{ background: 'rgba(178,0,255,0.15)', color: '#B200FF' }}>{interceptC}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Navigation Controls ── */}
        <div className={styles.navControls}>
          <button
            className={styles.navButton}
            onClick={handlePrev}
            disabled={currentStep === 0}
          >
            <ChevronLeft size={18} /> Previous
          </button>

          <div className={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`}
                onClick={() => setCurrentStep(i)}
              />
            ))}
          </div>

          <button
            className={`${styles.navButton} ${styles.navButtonPrimary}`}
            onClick={currentStep === totalSteps - 1 ? onBackToDashboard : handleNext}
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next Section'} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathsForAI;
