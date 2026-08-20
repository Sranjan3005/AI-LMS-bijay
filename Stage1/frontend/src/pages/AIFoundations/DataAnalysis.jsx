import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, ChevronLeft, BarChart2, LineChart, PieChart, ScatterChart } from 'lucide-react';
import styles from './DataAnalysis.module.css';

const DataAnalysis = ({ onBackToDashboard, initialStep = 0 }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const totalSteps = 5;

  // State for Outlier Smasher
  const [outlierSmashed, setOutlierSmashed] = useState(false);

  // Section 3: data collection quiz
  const [collectPick, setCollectPick] = useState(null);
  // Section 4: bias detective
  const [biasPick, setBiasPick] = useState(null);
  // Section 5: cleaning fixes — rowId -> true when fixed correctly
  const [cleanFixes, setCleanFixes] = useState({});
  const [cleanMiss, setCleanMiss] = useState(null);

  // Navigation handlers
  const handleNext = () => { if (currentStep < totalSteps - 1) setCurrentStep(p => p + 1); };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

  // Data for the scatter plot
  const normalPoints = [
    { x: 5, y: 80 }, { x: 12, y: 150 }, { x: 18, y: 200 },
    { x: 22, y: 230 }, { x: 28, y: 270 }, { x: 30, y: 300 },
    { x: 35, y: 340 }, { x: 38, y: 360 }, { x: 42, y: 390 },
    { x: 45, y: 410 }, { x: 48, y: 440 }, { x: 50, y: 450 }
  ];

  const outlierPoint = { x: 10, y: 480 };

  // SVG coordinate mapping
  // SVG ViewBox: 0 0 600 400
  // X (Temp 0-50): mapped from 50 to 550
  // Y (Sales 0-500): mapped from 350 to 50
  const mapX = (val) => 50 + (val / 50) * 500;
  const mapY = (val) => 350 - (val / 500) * 300;

  return (
    <div className={styles.flashcardContainer}>
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Exit Lesson
        </button>
        <span className={styles.pageTitle}>Data Analysis: Reading the Clues</span>
        <span className={styles.progressText}>Section {currentStep + 1} of {totalSteps}</span>
      </nav>

      <AnimatePresence mode="wait">
        
        {/* ═══════════════════════════════
            STEP 0: THEORY - GRAPHS
            ═══════════════════════════════ */}
        {currentStep === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#00F0FF' }}>Section 01 · Theory</div>
            <h1 className={styles.sectionTitle}>
              The Language of <em style={{ backgroundImage: 'linear-gradient(135deg, #00F0FF, #00FF88)' }}>Data</em>
            </h1>

            <div className={styles.narrative}>
              <p>Before an AI can read data, we need to know how to organize it. Think of a <strong>Dataset</strong> as a giant spreadsheet, and <strong>Variables</strong> as the specific columns we care about.</p>
              <p>We use different graphs to speak this language:</p>
            </div>

            <div className={styles.cardsGrid}>
              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 240, 255, 0.1)' }}>
                    <BarChart2 color="#00F0FF" />
                  </div>
                  Bar Chart
                </div>
                <div className={styles.cardDemo}>
                  <svg viewBox="0 0 100 60" style={{ width: '100%', height: '60px' }}>
                    <rect x="15" y="20" width="15" height="40" fill="#00F0FF" opacity="0.8" rx="2" />
                    <rect x="42.5" y="10" width="15" height="50" fill="#00F0FF" opacity="0.8" rx="2" />
                    <rect x="70" y="30" width="15" height="30" fill="#00F0FF" opacity="0.8" rx="2" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  Best for comparing different categories (e.g., Favorite sports in class).
                </div>
              </div>
              
              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(178, 0, 255, 0.1)' }}>
                    <LineChart color="#B200FF" />
                  </div>
                  Line Chart
                </div>
                <div className={styles.cardDemo}>
                  <svg viewBox="0 0 100 60" style={{ width: '100%', height: '60px' }}>
                    <path d="M10,50 L35,20 L60,35 L90,10" fill="none" stroke="#B200FF" strokeWidth="3" />
                    <circle cx="10" cy="50" r="4" fill="#B200FF" />
                    <circle cx="35" cy="20" r="4" fill="#B200FF" />
                    <circle cx="60" cy="35" r="4" fill="#B200FF" />
                    <circle cx="90" cy="10" r="4" fill="#B200FF" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  Best for showing trends over time (e.g., Temperature over a week).
                </div>
              </div>

              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
                    <PieChart color="#00FF88" />
                  </div>
                  Pie Chart
                </div>
                <div className={styles.cardDemo}>
                  <svg viewBox="0 0 100 60" style={{ width: '100%', height: '60px' }}>
                    <circle cx="50" cy="30" r="25" fill="#00FF88" opacity="0.3" />
                    <path d="M50,30 L50,5 A25,25 0 0,1 75,30 Z" fill="#00FF88" opacity="1" />
                    <path d="M50,30 L75,30 A25,25 0 0,1 32,47 Z" fill="#00FF88" opacity="0.6" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  Best for showing parts of a whole (e.g., Percentage of time spent sleeping).
                </div>
              </div>

              <div className={styles.graphCard} style={{ borderColor: 'rgba(255, 51, 102, 0.3)', background: 'rgba(255, 51, 102, 0.05)' }}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(255, 51, 102, 0.2)' }}>
                    <ScatterChart color="#FF3366" />
                  </div>
                  Scatter Plot
                </div>
                <div className={styles.cardDemo}>
                  <svg viewBox="0 0 100 60" style={{ width: '100%', height: '60px' }}>
                    <circle cx="15" cy="50" r="3" fill="#FF3366" opacity="0.9" />
                    <circle cx="25" cy="45" r="3" fill="#FF3366" opacity="0.9" />
                    <circle cx="45" cy="35" r="3" fill="#FF3366" opacity="0.9" />
                    <circle cx="60" cy="25" r="3" fill="#FF3366" opacity="0.9" />
                    <circle cx="70" cy="30" r="3" fill="#FF3366" opacity="0.9" />
                    <circle cx="85" cy="10" r="3" fill="#FF3366" opacity="0.9" />
                    <line x1="0" y1="60" x2="100" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                    <line x1="0" y1="60" x2="0" y2="0" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                  </svg>
                </div>
                <div className={styles.cardBody}>
                  Best for finding relationships between two variables. <strong style={{color: '#FF3366'}}>This is the AI's favorite!</strong>
                </div>
              </div>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={handlePrev} disabled={currentStep === 0}>
                <ChevronLeft size={18} /> Previous
              </button>
              <button className={styles.navButton} onClick={handleNext} disabled={currentStep === totalSteps - 1} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                Next Section <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════
            STEP 1: OUTLIER SMASHER
            ═══════════════════════════════ */}
        {currentStep === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#FF3366' }}>Section 02 · Demonstration</div>
            <h1 className={styles.sectionTitle}>
              The <em style={{ backgroundImage: 'linear-gradient(135deg, #FF3366, #FF9933)' }}>Outlier Smasher</em>
            </h1>

            <div className={styles.narrative}>
              <p>Let's look at a scatter plot of <strong>Kulfi Sales vs. Temperature</strong>. Generally, as it gets hotter, sales go up. But look at that weird dot! High sales on a freezing 10°C day? That's an <strong>OUTLIER</strong>.</p>
              <p>It confuses the AI's prediction line. <strong style={{ color: '#FF3366'}}>Smash it to fix the AI!</strong></p>
            </div>

            <div className={styles.svgContainer}>
              <svg className={styles.scatterSvg} viewBox="0 0 600 400">
                {/* Axes */}
                <line x1="50" y1="350" x2="570" y2="350" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <line x1="50" y1="350" x2="50" y2="30" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                
                {/* Labels */}
                <text x="310" y="390" fill="#c4c0d4" fontSize="14" textAnchor="middle">Temperature (°C)</text>
                <text x="20" y="190" fill="#c4c0d4" fontSize="14" textAnchor="middle" transform="rotate(-90, 20, 190)">Kulfi Sales</text>

                {/* Normal Points */}
                {normalPoints.map((p, i) => (
                  <circle key={i} cx={mapX(p.x)} cy={mapY(p.y)} r="5" fill="#00F0FF" opacity="0.8" />
                ))}

                {/* Prediction Line Animation via motion.line */}
                {/* 
                  Bad line: heavily influenced by the outlier (y = 5x + 150 roughly)
                  Good line: fits normal points perfectly (y = 8x + 50 roughly)
                */}
                <motion.line
                  x1={mapX(0)}
                  y1={outlierSmashed ? mapY(50) : mapY(150)}
                  x2={mapX(50)}
                  y2={outlierSmashed ? mapY(450) : mapY(400)}
                  stroke="#00FF88"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                  initial={false}
                  animate={{
                    y1: outlierSmashed ? mapY(50) : mapY(150),
                    y2: outlierSmashed ? mapY(450) : mapY(400)
                  }}
                  transition={{ type: 'spring', stiffness: 60, damping: 10 }}
                />

                {/* The Outlier */}
                <AnimatePresence>
                  {!outlierSmashed && (
                    <motion.circle
                      cx={mapX(outlierPoint.x)}
                      cy={mapY(outlierPoint.y)}
                      r="8"
                      fill="#FF3366"
                      className={`${styles.outlierPoint} ${styles.pulsating}`}
                      onClick={() => setOutlierSmashed(true)}
                      exit={{ scale: 3, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </AnimatePresence>
                
                {/* Outlier Label */}
                <AnimatePresence>
                  {!outlierSmashed && (
                    <motion.text
                      x={mapX(outlierPoint.x) + 15}
                      y={mapY(outlierPoint.y) + 5}
                      fill="#FF3366"
                      fontSize="12"
                      fontWeight="bold"
                      exit={{ opacity: 0 }}
                    >
                      OUTLIER
                    </motion.text>
                  )}
                </AnimatePresence>
              </svg>
            </div>

            <AnimatePresence>
              {outlierSmashed && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className={styles.successBanner}
                >
                  🎉 Great job! The AI's prediction line is now accurate!
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={handlePrev} disabled={currentStep === 0}>
                <ChevronLeft size={18} /> Previous
              </button>
              <button className={styles.navButton} onClick={handleNext} disabled={currentStep === totalSteps - 1} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                Next Section <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════
            STEP 2: COLLECTING DATA
            ═══════════════════════════════ */}
        {currentStep === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#00FF88' }}>Section 03 · Collecting Data</div>
            <h1 className={styles.sectionTitle}>
              Where does data <em style={{ backgroundImage: 'linear-gradient(135deg, #00FF88, #00F0FF)' }}>come from?</em>
            </h1>

            <div className={styles.narrative}>
              <p>Data doesn't appear by magic — someone <strong>collects</strong> it. The three big ways:</p>
            </div>

            <div className={styles.cardsGrid}>
              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 240, 255, 0.1)', fontSize: '1.2rem' }}>📋</div>
                  Surveys
                </div>
                <div className={styles.cardBody}>Ask people questions — favourite snack, sports played, hours of sleep. Cheap and fast, but people can be picked unfairly.</div>
              </div>
              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(178, 0, 255, 0.1)', fontSize: '1.2rem' }}>🌡️</div>
                  Sensors
                </div>
                <div className={styles.cardBody}>Machines that measure — thermometers, step counters, rain gauges. Very accurate, but only measure what they're pointed at.</div>
              </div>
              <div className={styles.graphCard}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 255, 136, 0.1)', fontSize: '1.2rem' }}>💻</div>
                  Logs
                </div>
                <div className={styles.cardBody}>Records apps keep automatically — videos watched, games played, buses tracked. Huge amounts, collected silently.</div>
              </div>
            </div>

            <div className={styles.narrative} style={{ marginTop: 18 }}>
              <p><strong>Your turn:</strong> you want the favourite snack of the <em>whole school</em>. Which collection plan is best?</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640, margin: '0 auto' }}>
              {[
                { t: 'Ask only your best friends — easy and quick!', ok: false, why: 'Your friends probably like what you like. That sample tells you about your group, not the school.' },
                { t: 'Randomly pick 5 students from every class and ask them.', ok: true, why: 'Random + every class = every kind of student gets a voice. Small but FAIR samples beat big unfair ones.' },
                { t: 'Ask the 60 students at cricket practice — that’s a lot of people!', ok: false, why: 'Sixty people, but all one type — sporty students who stay after school. Big can still be biased.' },
              ].map((o, i) => (
                <button key={i} onClick={() => setCollectPick(i)} disabled={collectPick !== null}
                  style={{
                    textAlign: 'left', padding: '12px 16px', borderRadius: 12, cursor: collectPick === null ? 'pointer' : 'default',
                    background: collectPick !== null && o.ok ? 'rgba(0,255,136,.12)' : collectPick === i ? 'rgba(255,51,102,.12)' : 'rgba(255,255,255,.05)',
                    border: `1px solid ${collectPick !== null && o.ok ? '#00FF88' : collectPick === i ? '#FF3366' : 'rgba(255,255,255,.12)'}`,
                    color: '#eee', fontFamily: 'inherit', fontSize: '.95rem',
                  }}>
                  {o.t}
                  {collectPick !== null && (collectPick === i || o.ok) && (
                    <div style={{ marginTop: 6, fontSize: '.85rem', color: '#c4c0d4' }}>{o.ok ? '✅ ' : '❌ '}{o.why}</div>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={handlePrev}><ChevronLeft size={18} /> Previous</button>
              <button className={styles.navButton} onClick={handleNext} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                Next Section <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════
            STEP 3: BIAS DETECTIVE
            ═══════════════════════════════ */}
        {currentStep === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#FF9933' }}>Section 04 · Bias Detective</div>
            <h1 className={styles.sectionTitle}>
              One of these datasets is <em style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #FF3366)' }}>lying.</em>
            </h1>

            <div className={styles.narrative}>
              <p>An AI trained on unfair data becomes an unfair AI. Three datasets landed on your desk — <strong>click the one you wouldn't trust.</strong></p>
            </div>

            <div className={styles.cardsGrid}>
              {[
                { h: '📏 Class heights', b: 'The heights of all 40 students of Class 7B, each measured once with the same scale.', biased: false, why: 'Everyone measured, same tool — complete and fair.' },
                { h: '🏸 Favourite sport', b: '“Favourite sport of Class 7B” — but the survey was only given to the boys.', biased: true, why: 'Half the class never got asked! Any AI trained on this would think girls’ preferences don’t exist. This is exactly how real-world AI bias happens.' },
                { h: '🌧️ Rainfall log', b: 'Daily rainfall for 30 days, recorded automatically by the weather station sensor.', biased: false, why: 'A sensor recording every single day — no one left out.' },
              ].map((c, i) => (
                <div key={i} onClick={() => biasPick === null && setBiasPick(i)}
                  className={styles.graphCard}
                  style={{
                    cursor: biasPick === null ? 'pointer' : 'default',
                    borderColor: biasPick !== null && c.biased ? '#FF3366' : biasPick === i ? 'rgba(255,255,255,.4)' : undefined,
                    background: biasPick !== null && c.biased ? 'rgba(255,51,102,.08)' : undefined,
                  }}>
                  <div className={styles.cardHeader}>{c.h}</div>
                  <div className={styles.cardBody}>
                    {c.b}
                    {biasPick !== null && (biasPick === i || c.biased) && (
                      <div style={{ marginTop: 8, color: c.biased ? '#FF9933' : '#00FF88', fontSize: '.85rem' }}>
                        {c.biased ? '🕵️ BIASED — ' : '✅ Fair — '}{c.why}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {biasPick !== null && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.successBanner}
                style={biasPick === 1 ? {} : { background: 'rgba(255,153,51,.1)', borderColor: 'rgba(255,153,51,.4)', color: '#ffe9c7' }}>
                {biasPick === 1
                  ? '🎉 Detective-grade instincts! Always ask: who is MISSING from this data?'
                  : '🔍 Not quite — the sport survey is the trap: it silently skipped all the girls. Who is MISSING from the data matters more than how much data there is.'}
              </motion.div>
            )}

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={handlePrev}><ChevronLeft size={18} /> Previous</button>
              <button className={styles.navButton} onClick={handleNext} style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                Next Section <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════
            STEP 4: CLEANING DATA
            ═══════════════════════════════ */}
        {currentStep === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#00F0FF' }}>Section 05 · Cleaning Data</div>
            <h1 className={styles.sectionTitle}>
              Fix the <em style={{ backgroundImage: 'linear-gradient(135deg, #00F0FF, #B200FF)' }}>messy table.</em>
            </h1>

            <div className={styles.narrative}>
              <p>Real data arrives dirty. Data scientists spend <strong>most of their time cleaning it</strong> — because a model fed garbage learns garbage. Three rows below have problems. Pick the right fix for each.</p>
            </div>

            <div style={{ overflowX: 'auto', maxWidth: 720, margin: '0 auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem', color: '#eee' }}>
                <thead>
                  <tr style={{ color: '#00F0FF', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>Name</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>Age</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>Marks</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.15)' }}>Problem &amp; fix</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'ok1', cells: ['Aisha', '12', '78'], clean: true },
                    { id: 'missing', cells: ['Rohan', '—', '84'], fixes: ['Delete Rohan forever', 'Fill with the class-average age', 'Change marks to 0'], right: 1, lesson: 'Missing values get filled with a sensible guess (like the average) — we don’t throw a student away over one blank.' },
                    { id: 'impossible', cells: ['Meera', '250', '91'], fixes: ['Keep it — data is data', 'It’s a typo: make it 25? No — check the source, it’s 12', 'Delete the whole column'], right: 1, lesson: 'A 250-year-old student is IMPOSSIBLE data — a typo. The fix is to check the source and correct it, not to trust or delete blindly.' },
                    { id: 'ok2', cells: ['Kabir', '13', '69'], clean: true },
                    { id: 'dup', cells: ['Kabir', '13', '69'], fixes: ['Keep both — more data is better!', 'Delete the duplicate row', 'Average the two Kabirs'], right: 1, lesson: 'The same row twice makes the model think Kabir-type students are twice as common. Duplicates get deleted.' },
                  ].map((row) => (
                    <tr key={row.id} style={{
                      background: row.clean ? 'transparent' : cleanFixes[row.id] ? 'rgba(0,255,136,.08)' : 'rgba(255,51,102,.07)',
                    }}>
                      {row.cells.map((c, j) => (
                        <td key={j} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>{c}</td>
                      ))}
                      <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                        {row.clean ? <span style={{ color: '#00FF88' }}>✓ clean</span>
                          : cleanFixes[row.id] ? <span style={{ color: '#00FF88' }}>✓ {row.lesson}</span>
                          : (
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {row.fixes.map((f, k) => (
                                <button key={k}
                                  onClick={() => {
                                    if (k === row.right) { setCleanFixes(p => ({ ...p, [row.id]: true })); setCleanMiss(null); }
                                    else setCleanMiss(`${row.id}-${k}`);
                                  }}
                                  style={{
                                    padding: '5px 10px', borderRadius: 8, fontSize: '.78rem', cursor: 'pointer', fontFamily: 'inherit',
                                    background: cleanMiss === `${row.id}-${k}` ? 'rgba(255,51,102,.25)' : 'rgba(255,255,255,.07)',
                                    border: '1px solid rgba(255,255,255,.15)', color: '#eee',
                                  }}>
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {Object.keys(cleanFixes).length === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={styles.successBanner}>
                🧼 Spotless! Fill the gaps, fix the impossible, delete the doubles — your data is now model-ready. Try it for real in “Which chart fits your data?” and the Data Lab.
              </motion.div>
            )}

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={handlePrev}><ChevronLeft size={18} /> Previous</button>
              <button className={styles.navButton} onClick={onBackToDashboard} style={{ background: 'rgba(0, 240, 255, 0.15)' }}>
                Finish Lesson <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataAnalysis;
