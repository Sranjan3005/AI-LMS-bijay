import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, ChevronLeft, Eye, Cpu, Layers, Zap, Grid3x3, Scan, Microscope, Sparkles, Play, MonitorSmartphone, Stethoscope, Car, Satellite, Factory, GraduationCap, Leaf } from 'lucide-react';
import styles from './ComputerVisionLesson.module.css';

const ComputerVisionLesson = ({ onBackToSupervised, onNavigateToPredictionEngine }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;

  // ── Step 0: Pixel Grid Interactive ──
  const [highlightedPixel, setHighlightedPixel] = useState(null);
  const pixelGrid = useMemo(() => {
    // 8x8 grid showing a simplified "7" digit
    const grid = Array(8).fill(null).map(() => Array(8).fill(0));
    // Draw a "7" pattern
    [0,1,2,3,4,5,6,7].forEach(x => { grid[0][x] = 200 + Math.floor(Math.random()*55); });
    [1,2,3].forEach(y => { grid[y][6] = 180 + Math.floor(Math.random()*75); });
    grid[4][5] = 220; grid[4][4] = 160;
    grid[5][4] = 200; grid[5][3] = 140;
    grid[6][3] = 220; grid[6][2] = 160;
    grid[7][2] = 240; grid[7][1] = 180;
    return grid;
  }, []);

  // ── Step 1: Convolution Animation ──
  const [kernelPos, setKernelPos] = useState({ row: 0, col: 0 });
  const [isConvolving, setIsConvolving] = useState(false);
  const [activeFilter, setActiveFilter] = useState('edge');

  const kernels = {
    edge: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]],
    sharpen: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]],
    blur: [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  };

  const startConvolution = useCallback(() => {
    setIsConvolving(true);
    setKernelPos({ row: 0, col: 0 });
    let r = 0, c = 0;
    const interval = setInterval(() => {
      c++;
      if (c > 5) { c = 0; r++; }
      if (r > 5) { clearInterval(interval); setIsConvolving(false); return; }
      setKernelPos({ row: r, col: c });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // ── Step 2: Filter Demo ──
  const [activeFilterDemo, setActiveFilterDemo] = useState('original');
  const [filterStrength, setFilterStrength] = useState(70);

  // ── Pipeline data ──
  const pipelineSteps = [
    { num: 1, title: 'Capture', desc: 'Camera converts light into a digital image.', icon: <Eye size={20} /> },
    { num: 2, title: 'Process', desc: 'Filters highlight edges, curves, and texture.', icon: <Cpu size={20} /> },
    { num: 3, title: 'Understand', desc: 'Feature maps combine patterns into objects.', icon: <Layers size={20} /> },
    { num: 4, title: 'Act', desc: 'Classifier/detector produces a decision.', icon: <Zap size={20} /> },
  ];

  const applications = [
    { name: 'Healthcare', desc: 'X-ray / MRI analysis', icon: <Stethoscope size={18} /> },
    { name: 'Autonomous systems', desc: 'Road objects & tracking', icon: <Car size={18} /> },
    { name: 'Satellite imagery', desc: 'Clouds, roads, land cover', icon: <Satellite size={18} /> },
    { name: 'Agriculture', desc: 'Crop disease & quality', icon: <Leaf size={18} /> },
    { name: 'Manufacturing', desc: 'Defect inspection', icon: <Factory size={18} /> },
    { name: 'Education', desc: 'Pixels, filters, CNN demos', icon: <GraduationCap size={18} /> },
  ];

  return (
    <div className={styles.container}>
      {/* Top Nav */}
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToSupervised}>
          <ArrowLeft size={16} /> Back to Models
        </button>
        <span className={styles.pageTitle}>
          <Eye size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          Computer Vision
        </span>
        <div className={styles.stepIndicator}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`${styles.stepDot} ${i === currentStep ? styles.stepDotActive : ''} ${i < currentStep ? styles.stepDotDone : ''}`}
              onClick={() => setCurrentStep(i)}
            />
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 0: What is Computer Vision? */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.lessonGrid}>
            {/* Left Panel */}
            <div className={styles.theoryPanel}>
              <div className={styles.eyebrow}>LESSON 01 · FOUNDATION</div>
              <h1 className={styles.heroTitle}>
                What is<br />Computer Vision?
              </h1>
              <p className={styles.narrative}>
                A machine receives pixel values first; meaning is built layer-by-layer from learned visual patterns.
              </p>

              <div className={styles.formulaBox}>
                <span className={styles.formulaLabel}>Image → numbers → meaning</span>
              </div>

              {/* Interactive Pixel Grid */}
              <div className={styles.pixelGridContainer}>
                <div className={styles.pixelGrid}>
                  {pixelGrid.map((row, r) =>
                    row.map((val, c) => (
                      <div
                        key={`${r}-${c}`}
                        className={styles.pixel}
                        style={{
                          background: `rgb(${val}, ${Math.floor(val * 0.9)}, ${255})`,
                          opacity: val > 0 ? 0.3 + (val / 255) * 0.7 : 0.08,
                          transform: highlightedPixel?.r === r && highlightedPixel?.c === c ? 'scale(1.3)' : 'scale(1)',
                        }}
                        onMouseEnter={() => setHighlightedPixel({ r, c, val })}
                        onMouseLeave={() => setHighlightedPixel(null)}
                      />
                    ))
                  )}
                </div>
                <p className={styles.gridCaption}>
                  {highlightedPixel
                    ? `Pixel [${highlightedPixel.r}, ${highlightedPixel.c}] = ${highlightedPixel.val}`
                    : 'Pixels are numbers. A CV model learns which repeated number patterns form edges, textures, shapes, and objects.'
                  }
                </p>
              </div>
            </div>

            {/* Right Panel */}
            <div className={styles.interactivePanel}>
              <div className={styles.pipelineCard}>
                <h2 className={styles.pipelineTitle}>Machine vision pipeline</h2>
                <p className={styles.pipelineSubtitle}>From raw visual input to useful action.</p>
                <div className={styles.pipelineSteps}>
                  {pipelineSteps.map((step, i) => (
                    <div key={i} className={styles.pipelineStep}>
                      <motion.div
                        className={styles.stepCircle}
                        animate={{ boxShadow: ['0 0 0px #00F0FF', '0 0 15px #00F0FF', '0 0 0px #00F0FF'] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                      >
                        {step.num}
                      </motion.div>
                      <div className={styles.stepTitle}>{step.title}</div>
                      <div className={styles.stepDesc}>{step.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.keyIdeaBox}>
                <span className={styles.keyIdeaLabel}>KEY IDEA</span>
                <p className={styles.keyIdeaText}>
                  Humans see meaning instantly; machines learn numerical representations from examples.
                </p>
              </div>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={() => setCurrentStep(1)}>
                How CNN Layers Work <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 1: How CNN Layers Work */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.lessonGrid}>
            <div className={styles.theoryPanel}>
              <div className={styles.eyebrow}>LESSON 02 · CORE MECHANISM</div>
              <h1 className={styles.heroTitle}>
                How CNN layers work
              </h1>
              <p className={styles.narrative}>
                One image becomes many feature maps because each filter searches for a different pattern.
              </p>

              {/* CNN Pipeline Diagram */}
              <div className={styles.cnnPipeline}>
                <div className={styles.cnnBlock}>
                  <div className={styles.cnnBlockLabel}>Input image</div>
                  <div className={styles.cnnBlockSub}>RGB tensor</div>
                </div>
                <div className={styles.cnnArrow}>→</div>
                <div className={styles.cnnBlock}>
                  <div className={styles.cnnBlockLabel}>12 filters</div>
                  <div className={styles.cnnBlockSub}>learned kernels</div>
                </div>
                <div className={styles.cnnArrow}>→</div>
                <div className={styles.cnnBlock}>
                  <div className={styles.cnnBlockLabel}>12 maps</div>
                  <div className={styles.cnnBlockSub}>edge · feature · shape</div>
                </div>
              </div>

              {/* Kernel Display */}
              <div className={styles.featureMapSection}>
                <h3>Output: feature maps</h3>
                <p className={styles.narrative}>
                  Each convolution filter produces a new map. Edges, curves, textures, and object parts become visible step by step.
                </p>
              </div>

              {/* Interactive Kernel */}
              <div className={styles.kernelDisplay}>
                <div className={styles.kernelGrid}>
                  {kernels[activeFilter].map((row, r) =>
                    row.map((val, c) => (
                      <div key={`k-${r}-${c}`} className={styles.kernelCell}>
                        {val}
                      </div>
                    ))
                  )}
                </div>
                <span className={styles.kernelLabel}>Example {activeFilter} kernel</span>
              </div>
            </div>

            {/* Right: Convolution Animation */}
            <div className={styles.interactivePanel}>
              <div className={styles.convolutionViz}>
                {/* Mini Grid showing kernel sliding */}
                <div className={styles.convGridWrapper}>
                  <div className={styles.convGrid}>
                    {pixelGrid.map((row, r) =>
                      row.map((val, c) => {
                        const isInKernel = r >= kernelPos.row && r < kernelPos.row + 3 && c >= kernelPos.col && c < kernelPos.col + 3;
                        return (
                          <div
                            key={`conv-${r}-${c}`}
                            className={styles.convPixel}
                            style={{
                              background: isInKernel && isConvolving
                                ? '#00F0FF'
                                : val > 0 ? `rgba(0, 240, 255, ${val / 255})` : 'rgba(255,255,255,0.05)',
                              border: isInKernel && isConvolving ? '1px solid #00F0FF' : '1px solid rgba(255,255,255,0.08)',
                              boxShadow: isInKernel && isConvolving ? '0 0 8px rgba(0, 240, 255, 0.5)' : 'none',
                              transition: 'all 0.15s',
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                  {isConvolving && (
                    <div className={styles.convLabel}>
                      Scanning [{kernelPos.row}, {kernelPos.col}]
                    </div>
                  )}
                </div>

                {/* Filter Buttons */}
                <div className={styles.filterBtns}>
                  {['edge', 'sharpen', 'blur'].map(f => (
                    <button
                      key={f}
                      className={`${styles.filterBtn} ${activeFilter === f ? styles.filterBtnActive : ''}`}
                      onClick={() => setActiveFilter(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                <button className={styles.playBtn} onClick={startConvolution} disabled={isConvolving}>
                  <Play size={16} /> {isConvolving ? 'Running...' : 'Run Convolution'}
                </button>
              </div>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={() => setCurrentStep(0)}>
                <ChevronLeft size={18} /> What is CV?
              </button>
              <button className={styles.navButton} onClick={() => setCurrentStep(2)}>
                Applications <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 2: Applications */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.lessonGrid}>
            <div className={styles.theoryPanel}>
              <div className={styles.eyebrow}>LESSON 03 + LAB · REAL-WORLD USE</div>
              <h1 className={styles.heroTitle}>
                Where Computer Vision<br />creates value
              </h1>
              <p className={styles.narrative}>
                Start from the required output: label, location, pixel region, motion path, or restored image.
              </p>

              {/* Applications Grid */}
              <div className={styles.appsGrid}>
                {applications.map((app, i) => (
                  <motion.div
                    key={i}
                    className={styles.appCard}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div className={styles.appIcon}>{app.icon}</div>
                    <div>
                      <div className={styles.appName}>{app.name}</div>
                      <div className={styles.appDesc}>{app.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className={styles.flowBox}>
                <strong>Recommended presentation flow</strong>
                <p>1. Define visual question → 2. Choose data → 3. Train/evaluate responsibly → 4. Use lab for intuition</p>
              </div>
            </div>

            {/* Right: Interactive Visual Lab */}
            <div className={styles.interactivePanel}>
              <div className={styles.visualLabCard}>
                <h2 className={styles.labTitle}>Interactive Visual Lab</h2>
                <p className={styles.labDesc}>
                  Switch between Original, Edges, Texture, and Heat Map to show that filters change the representation, not the source meaning.
                </p>

                <div className={styles.filterToggleGroup}>
                  {['original', 'edges', 'texture', 'heatmap'].forEach(() => {})}
                  {['original', 'edges', 'texture', 'heatmap'].map(f => (
                    <button
                      key={f}
                      className={`${styles.filterToggle} ${activeFilterDemo === f ? styles.filterToggleActive : ''}`}
                      onClick={() => setActiveFilterDemo(f)}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Simulated Filter Preview */}
                <div className={styles.filterPreview}>
                  <div
                    className={styles.filterImage}
                    style={{
                      background: activeFilterDemo === 'original' ? 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)'
                        : activeFilterDemo === 'edges' ? 'linear-gradient(135deg, #000, #111, #000)'
                        : activeFilterDemo === 'texture' ? 'linear-gradient(135deg, #2d1b69, #1a1a2e, #2d1b69)'
                        : 'linear-gradient(135deg, #ff000030, #ffff0030, #00ff0030, #0000ff30)',
                      filter: activeFilterDemo === 'edges' ? 'contrast(2) brightness(0.8)' : 'none',
                    }}
                  >
                    {/* Grid pattern overlay */}
                    <div className={styles.filterOverlay} style={{
                      opacity: activeFilterDemo === 'original' ? 0 : filterStrength / 100,
                    }}>
                      {Array.from({ length: 64 }, (_, i) => (
                        <div key={i} className={styles.filterCell} style={{
                          background: activeFilterDemo === 'edges'
                            ? `rgba(0, 240, 255, ${Math.random() * 0.8})`
                            : activeFilterDemo === 'texture'
                            ? `rgba(178, 0, 255, ${Math.random() * 0.6})`
                            : `hsl(${i * 5}, 80%, ${30 + Math.random() * 40}%)`,
                        }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filter Strength Slider */}
                <div className={styles.strengthSlider}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filterStrength}
                    onChange={(e) => setFilterStrength(Number(e.target.value))}
                    className={styles.rangeInput}
                  />
                  <span className={styles.strengthLabel}>Filter strength {filterStrength}%</span>
                </div>
              </div>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={() => setCurrentStep(1)}>
                <ChevronLeft size={18} /> CNN Layers
              </button>
              <button className={styles.navButton} onClick={() => setCurrentStep(3)}>
                Open Lab <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════ */}
        {/* STEP 3: Open Lab */}
        {/* ═══════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.labStep}>
            <div className={styles.labHero}>
              <motion.div
                className={styles.labIconLarge}
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <Scan size={60} color="#00F0FF" />
              </motion.div>

              <h1 className={styles.heroTitle} style={{ textAlign: 'center' }}>
                Ready to see it in action?
              </h1>
              <p className={styles.narrative} style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 30px' }}>
                Head to the <strong>Prediction Engine</strong> to draw digits, write text, or explore edge detection — and watch the AI process your image through a live 4-stage pipeline!
              </p>

              <div className={styles.scenarioCards}>
                <motion.div className={styles.scenarioCard} whileHover={{ scale: 1.05, y: -5 }}>
                  <span className={styles.scenarioEmoji}>🔢</span>
                  <h3>The Digit Detective</h3>
                  <p>Draw a digit → watch 4-stage pipeline → see prediction confidence</p>
                </motion.div>
                <motion.div className={styles.scenarioCard} whileHover={{ scale: 1.05, y: -5 }}>
                  <span className={styles.scenarioEmoji}>✍️</span>
                  <h3>The Handwriting Decoder</h3>
                  <p>Write text → binarization → segmentation → OCR output</p>
                </motion.div>
                <motion.div className={styles.scenarioCard} whileHover={{ scale: 1.05, y: -5 }}>
                  <span className={styles.scenarioEmoji}>🖼️</span>
                  <h3>The Edge Explorer</h3>
                  <p>Draw shapes → grayscale → edge detection → feature maps</p>
                </motion.div>
              </div>

              <motion.button
                className={styles.ctaButton}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigateToPredictionEngine('COMPUTER_VISION')}
              >
                <Sparkles size={20} /> Open Prediction Engine
              </motion.button>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={() => setCurrentStep(2)}>
                <ChevronLeft size={18} /> Applications
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

export default ComputerVisionLesson;
