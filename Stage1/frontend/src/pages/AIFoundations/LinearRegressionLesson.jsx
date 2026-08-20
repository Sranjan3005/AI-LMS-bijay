import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bus, Clock, CheckCircle, ChevronRight, ChevronLeft, PlayCircle } from 'lucide-react';
import styles from './LinearRegressionLesson.module.css';

const LinearRegressionLesson = ({ onBackToSupervised, onNavigateToPredictionEngine }) => {
  // Slider states
  // c: Base Marks (Y-intercept)
  const [c, setC] = useState(0); 
  // m: Marks per Hour (Slope)
  const [m, setM] = useState(0);

  const [currentStep, setCurrentStep] = useState(0);
  const [trainingEpoch, setTrainingEpoch] = useState(0);
  
  const [includeOutlier, setIncludeOutlier] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  
  // Fixed Data Points: [Hours Studied (x), Exam Marks (y)]
  const dataPoints = useMemo(() => {
    const pts = [
      { x: 1, y: 20 },
      { x: 2, y: 35 },
      { x: 3, y: 30 },
      { x: 4, y: 55 },
      { x: 5, y: 50 },
      { x: 7, y: 75 },
      { x: 8, y: 80 },
      { x: 9, y: 95 }
    ];
    if (includeOutlier) {
      pts.push({ x: 2, y: 90, isOutlier: true });
    }
    return pts;
  }, [includeOutlier]);

  useEffect(() => {
    if (currentStep === 1) {
      // Start training simulation from a flat line at the bottom
      let currentM = 0;
      let currentC = 0;
      setM(currentM);
      setC(currentC);
      setTrainingEpoch(0);
      setShowPopup(false);
      
      let epoch = 0;
      
      // We will use actual Gradient Descent!
      // Learning rates tuned for a slow, smooth visual animation
      const alphaM = 0.0015;
      const alphaC = 0.02;
      
      const interval = setInterval(() => {
        epoch += 1;
        setTrainingEpoch(epoch);
        
        // Calculate gradients (Mean Squared Error derivative)
        let gradM = 0;
        let gradC = 0;
        const N = dataPoints.length;
        
        for (let i = 0; i < N; i++) {
          const x = dataPoints[i].x;
          const y = dataPoints[i].y;
          const prediction = (currentM * x) + currentC;
          const error = prediction - y; // (mx + c - y)
          
          gradM += error * x;
          gradC += error;
        }
        
        gradM = (gradM * 2) / N;
        gradC = (gradC * 2) / N;
        
        // Apply gradients
        currentM -= alphaM * gradM;
        currentC -= alphaC * gradC;
        
        setM(Number(currentM.toFixed(2)));
        setC(Number(currentC.toFixed(2)));
        
        // Stop condition: gradients are very small or max epochs reached
        if (epoch > 150 || (Math.abs(gradM) < 0.5 && Math.abs(gradC) < 0.5)) {
          clearInterval(interval);
          if (includeOutlier) {
            setShowPopup(true);
          }
        }
      }, 50); // Fast simulation
      
      return () => clearInterval(interval);
    } else {
      // Reset when going back to manual
      setM(0);
      setC(0);
      setShowPopup(false);
    }
  }, [currentStep, includeOutlier, dataPoints]);

  // SVG Mapping Functions
  // ViewBox: 0 0 800 500
  // X (Hours 0-10): map to 50 - 750 (width 700) -> 70px per unit
  // Y (Marks 0-100): map to 450 - 50 (height 400) -> 4px per unit
  const mapX = (val) => 50 + val * 70;
  const mapY = (val) => 450 - val * 4;

  // Prediction line function: y = mx + c
  const predictY = (xVal) => (m * xVal) + c;

  // Calculate Total Error & Accuracy
  const { totalError, accuracy, colorState, message } = useMemo(() => {
    let errorSum = 0;
    dataPoints.forEach(p => {
      const pred = predictY(p.x);
      errorSum += Math.abs(p.y - pred);
    });

    // Tuning accuracy: 
    // Optimal error is around 35-40.
    // Formula: 100 - (errorSum * 0.35)
    let score = Math.round(100 - (errorSum * 0.35));
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    let cState = '#FF3366'; // Red
    let msg = 'Keep trying!';
    
    if (score >= 85) {
      cState = '#00FF88'; // Green
      msg = 'Perfect Fit!';
    } else if (score >= 50) {
      cState = '#FFCC00'; // Yellow
      msg = 'Getting closer!';
    }

    return { totalError: errorSum, accuracy: score, colorState: cState, message: msg };
  }, [m, c]);

  return (
    <div className={styles.container}>
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToSupervised}>
          <ArrowLeft size={16} /> Back to Models
        </button>
        <span className={styles.pageTitle}>Model: Linear Regression</span>
      </nav>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={styles.flashcard}>
        
        {/* LEFT COLUMN: THEORY */}
        <div className={styles.theorySection}>
          <div>
            <div className={styles.sectionEyebrow}>Superpower 1</div>
            <h1 className={styles.sectionTitle}>
              Regression<br/>
              <em>(The Magic Line)</em>
            </h1>
          </div>

          <div className={styles.narrative}>
            <p><strong>Predicting the future using numbers.</strong></p>
            <p>Regression is an AI technique used to predict a specific continuous number. If you want to know <em>"How much?"</em> or <em>"How many?"</em>, you use Regression.</p>
          </div>

          <div className={styles.analogyBox}>
            <div className={styles.analogyHeader}>
              <div className={styles.analogyIcon}><Bus size={20} /></div>
              The CBSE School Bus
            </div>
            <div className={styles.narrative} style={{ fontSize: '0.95rem' }}>
              <p>Imagine waiting for your school bus.</p>
              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                <li>2 km away = takes 10 minutes.</li>
                <li>4 km away = takes 20 minutes.</li>
              </ul>
              <p>Your brain automatically draws a "mental line" to predict that if the bus is 6 km away, it will take 30 minutes!</p>
              <p>AI does exactly the same thing, but it uses math to draw the most perfect prediction line possible.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE GAME */}
        <div className={styles.interactiveSection}>
          <div className={styles.svgContainer}>
            
            <AnimatePresence>
              {accuracy >= 85 && (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  className={styles.celebrationBadge}
                >
                  <CheckCircle size={20} /> Model Trained!
                </motion.div>
              )}
            </AnimatePresence>

            <svg className={styles.graphSvg} viewBox="0 0 800 500">
              {/* Grid Lines */}
              {[0, 20, 40, 60, 80, 100].map(val => (
                <line key={`gy-${val}`} x1="50" y1={mapY(val)} x2="750" y2={mapY(val)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}
              {[0, 2, 4, 6, 8, 10].map(val => (
                <line key={`gx-${val}`} x1={mapX(val)} y1="50" x2={mapX(val)} y2="450" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              ))}

              {/* Axes */}
              <line x1="50" y1="450" x2="750" y2="450" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <line x1="50" y1="450" x2="50" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              
              {/* Labels */}
              <text x="400" y="490" fill="#c4c0d4" fontSize="14" textAnchor="middle">Hours Studied (0 - 10)</text>
              <text x="20" y="250" fill="#c4c0d4" fontSize="14" textAnchor="middle" transform="rotate(-90, 20, 250)">Exam Marks (0 - 100)</text>

              {/* Dashed Error Lines */}
              {dataPoints.map((p, i) => (
                <line 
                  key={`err-${i}`}
                  x1={mapX(p.x)} 
                  y1={mapY(p.y)} 
                  x2={mapX(p.x)} 
                  y2={mapY(predictY(p.x))}
                  stroke="#FF3366"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className={styles.errorLine}
                  opacity="0.6"
                />
              ))}

              {/* Data Points */}
              {dataPoints.map((p, i) => (
                <circle 
                  key={`pt-${i}`}
                  cx={mapX(p.x)} 
                  cy={mapY(p.y)} 
                  r={p.isOutlier ? "8" : "6"} 
                  fill={p.isOutlier ? "#FF3366" : "#00F0FF"} 
                  className={styles.dataPoint}
                  style={p.isOutlier ? { filter: 'drop-shadow(0 0 12px #FF3366)' } : {}}
                />
              ))}

              {/* Prediction Line */}
              <line
                x1={mapX(0)}
                y1={mapY(predictY(0))}
                x2={mapX(10)}
                y2={mapY(predictY(10))}
                stroke="#FF3366"
                strokeWidth="4"
                className={styles.errorLine} // Reusing transition
              />
            </svg>
          </div>

          {currentStep === 0 && (
            <>
              <div className={styles.controlPanel}>
                <div className={styles.sliders}>
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                      Base Marks (Shift/Intercept) <span>{c} marks</span>
                    </div>
                    <input 
                      type="range" 
                      min="-20" 
                      max="50" 
                      value={c} 
                      onChange={(e) => setC(Number(e.target.value))}
                      className={styles.rangeInput}
                    />
                  </div>
                  <div className={styles.sliderGroup}>
                    <div className={styles.sliderHeader}>
                      Marks per Hour (Tilt/Slope) <span>+{m} marks/hr</span>
                    </div>
                    <input 
                      type="range" 
                      min="-5" 
                      max="20" 
                      value={m} 
                      onChange={(e) => setM(Number(e.target.value))}
                      className={styles.rangeInput}
                    />
                  </div>
                </div>

                <div className={styles.meterContainer}>
                  <div className={styles.meterLabel}>Accuracy</div>
                  <div className={styles.meterScore} style={{ color: colorState }}>
                    {accuracy}%
                  </div>
                  <div className={styles.meterMessage} style={{ color: colorState }}>
                    {message}
                  </div>
                  
                  <label className={styles.outlierToggle}>
                    <input 
                      type="checkbox" 
                      checked={includeOutlier} 
                      onChange={(e) => setIncludeOutlier(e.target.checked)} 
                    />
                    Add Outlier
                  </label>
                </div>
              </div>

              <div className={styles.navControls}>
                <button className={styles.navButton} onClick={() => setCurrentStep(1)}>
                  Visualize AI Training <PlayCircle size={18} />
                </button>
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div className={styles.trainingPanel}>
                <div className={styles.trainingHeader}>
                  <h3 style={{ color: '#00FF88', margin: 0, fontFamily: 'Outfit' }}>Live Gradient Descent</h3>
                  <div className={styles.epochBadge}>Epoch: {trainingEpoch}</div>
                </div>
                <div className={styles.trainingStats}>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Total Error</span>
                    <span className={styles.statValue} style={{ color: colorState }}>{totalError.toFixed(1)}</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Slope (m)</span>
                    <span className={styles.statValue}>{m.toFixed(2)}</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statLabel}>Intercept (c)</span>
                    <span className={styles.statValue}>{c.toFixed(2)}</span>
                  </div>
                </div>
                <div className={styles.narrative} style={{ fontSize: '0.95rem', marginTop: '10px' }}>
                  <p>Watch as the AI automatically calculates the error and adjusts the line step-by-step to find the optimal fit. This process of sliding down the error curve is called <strong>Gradient Descent</strong>.</p>
                </div>
              </div>
              <div className={styles.navControls}>
                <button className={styles.navButton} onClick={() => setCurrentStep(0)}>
                  <ChevronLeft size={18} /> Back to Manual Mode
                </button>
                <button 
                  className={styles.navButton} 
                  style={{ background: 'rgba(0, 240, 255, 0.15)', borderColor: 'rgba(0, 240, 255, 0.4)' }}
                  onClick={() => onNavigateToPredictionEngine('REGRESSION')}
                >
                  Try more in Prediction Engine <ChevronRight size={18} />
                </button>
              </div>
            </>
          )}

        </div>
      </motion.div>

      {/* Outlier Popup Modal */}
      <AnimatePresence>
        {showPopup && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className={styles.popupOverlay}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.8, y: 20 }}
              className={styles.popupModal}
            >
              <h3>The Outlier Effect</h3>
              <p>Notice how the error rate is much higher? The single rogue outlier confused the AI and skewed the prediction line upwards.</p>
              <p>This is why cleaning your data before training is so important!</p>
              <button className={styles.navButton} onClick={() => setShowPopup(false)} style={{ margin: '16px auto 0' }}>
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LinearRegressionLesson;
