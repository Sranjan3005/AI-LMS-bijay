import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, Cpu, Layers, Zap, Scan, Brain, Target, Grid3X3,
  ChevronRight, ChevronLeft, Play, Pause, RotateCcw,
  Sparkles, Camera, Image as ImageIcon, Upload, Eraser,
  TrendingUp, BookOpen, Lightbulb, CheckCircle2, ArrowRight
} from 'lucide-react';
import styles from './CVModule.module.css';
import { useChiti } from '../../components/chiti/ChitiProvider';

const PHASES = [
  { id: 'intro', title: 'What is CV?', icon: Eye, color: '#6366F1' },
  { id: 'pixels', title: 'Pixels to Numbers', icon: Grid3X3, color: '#8B5CF6' },
  { id: 'filters', title: 'Convolution & Filters', icon: Cpu, color: '#A855F7' },
  { id: 'features', title: 'Feature Hierarchies', icon: Layers, color: '#22D3EE' },
  { id: 'models', title: 'Models & Prediction', icon: Brain, color: '#10B981' },
  { id: 'lab', title: 'Interactive Lab', icon: Scan, color: '#F59E0B' },
];

const REAL_WORLD_APPS = [
  { category: 'Healthcare', icon: '🏥', examples: ['X-ray analysis', 'Tumor detection', 'Retinal scans'], impact: 'Early diagnosis saves lives' },
  { category: 'Autonomous Vehicles', icon: '🚗', examples: ['Lane detection', 'Pedestrian tracking', 'Traffic signs'], impact: 'Safer roads for everyone' },
  { category: 'Retail', icon: '🛒', examples: ['Cashier-less checkout', 'Inventory management', 'Quality inspection'], impact: 'Seamless shopping experience' },
  { category: 'Agriculture', icon: '🌾', examples: ['Crop disease detection', 'Yield estimation', 'Weed identification'], impact: 'Feeding the world efficiently' },
  { category: 'Security', icon: '🔒', examples: ['Facial recognition', 'Intrusion detection', 'Crowd analysis'], impact: 'Protecting people and property' },
  { category: 'Entertainment', icon: '🎬', examples: ['AR filters', 'Motion capture', 'Video enhancement'], impact: 'Creating immersive experiences' }
];

function IntroPhase({ onNext }) {
  const chiti = useChiti();

  useEffect(() => {
    chiti.react('greet', { say: "Welcome to Computer Vision! Let's explore how machines learn to see." });
  }, [chiti]);

  return (
    <div className={styles.phaseContainer}>
      <div className={styles.introHero}>
        <motion.div className={styles.heroIcon} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6 }}>
          <Eye size={80} color="#6366F1" />
        </motion.div>

        <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className={styles.heroTitle}>
          How Machines<br /><span className={styles.gradientText}>Learn to See</span>
        </motion.h1>

        <motion.p initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }} className={styles.heroSubtitle}>
          Computer Vision transforms pixels into understanding through layers of learned patterns.
          From identifying objects to reading text, discover the technology powering the visual AI revolution.
        </motion.p>

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }} className={styles.statsRow}>
          <div className={styles.statCard}><div className={styles.statValue}>60K+</div><div className={styles.statLabel}>Images in MNIST</div></div>
          <div className={styles.statCard}><div className={styles.statValue}>80</div><div className={styles.statLabel}>COCO Classes</div></div>
          <div className={styles.statCard}><div className={styles.statValue}>ms</div><div className={styles.statLabel}>Real-time Detection</div></div>
        </motion.div>

        <motion.button initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 0.6 }} className={styles.ctaButton} onClick={onNext}>
          Start Learning <ArrowRight size={20} />
        </motion.button>
      </div>

      <div className={styles.appsPreview}>
        <h3 className={styles.sectionTitle}>Where You'll See This</h3>
        <div className={styles.appGrid}>
          {REAL_WORLD_APPS.slice(0, 3).map((app, i) => (
            <motion.div key={app.category} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 + i * 0.1 }} className={styles.appCardSmall}>
              <span className={styles.appEmoji}>{app.icon}</span>
              <div className={styles.appName}>{app.category}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PixelsPhase({ onNext, onPrev }) {
  const [hoveredPixel, setHoveredPixel] = useState(null);
  const [activeView, setActiveView] = useState('image');
  const chiti = useChiti();

  const pixelGrid = [
    [255, 0, 0, 0, 0, 0, 0, 0], [255, 0, 0, 0, 0, 0, 0, 0], [255, 0, 0, 0, 0, 0, 0, 0],
    [255, 0, 0, 0, 0, 0, 0, 0], [255, 0, 0, 0, 0, 0, 0, 0], [255, 0, 0, 0, 0, 0, 0, 0],
    [255, 0, 0, 0, 0, 0, 0, 0], [255, 255, 255, 255, 255, 255, 255, 0],
  ];

  useEffect(() => {
    chiti.react('point', { say: "Every image is just numbers! Hover over pixels to see their values." });
  }, [chiti]);

  return (
    <div className={styles.phaseContainer}>
      <div className={styles.twoColumn}>
        <div className={styles.leftCol}>
          <div className={styles.eyebrow}>PHASE 1 · FOUNDATION</div>
          <h2 className={styles.phaseTitle}>Pixels are Numbers</h2>
          <p className={styles.narrative}>
            To a computer, an image isn't a picture—it's a grid of numbers. Each number represents
            the brightness of a tiny dot called a <strong>pixel</strong>. Black is 0, white is 255,
            and everything in between is a shade of gray.
          </p>

          <div className={styles.viewToggle}>
            {[{ id: 'image', label: 'Image', icon: ImageIcon }, { id: 'grid', label: 'Grid', icon: Grid3X3 }, { id: 'values', label: 'Values', icon: Target }]
              .map(view => (
                <button key={view.id} className={`${styles.toggleBtn} ${activeView === view.id ? styles.toggleActive : ''}`} onClick={() => setActiveView(view.id)}>
                  <view.icon size={16} /> {view.label}
                </button>
              ))}
          </div>

          <div className={styles.pixelDemo}>
            <div className={styles.pixelGrid}>
              {pixelGrid.map((row, r) => row.map((val, c) => (
                <motion.div key={`${r}-${c}`} className={styles.pixelCell}
                  style={{
                    background: `rgb(${val}, ${val}, ${val})`,
                    border: hoveredPixel?.r === r && hoveredPixel?.c === c ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.1)'
                  }}
                  whileHover={{ scale: 1.15, zIndex: 1 }}
                  onMouseEnter={() => setHoveredPixel({ r, c, val })} onMouseLeave={() => setHoveredPixel(null)} />
              )))}
            </div>
            {activeView === 'values' && (
              <div className={styles.valueOverlay}>
                {pixelGrid.map((row, r) => row.map((val, c) => (
                  <div key={`v-${r}-${c}`} className={styles.valueCell}>{val}</div>
                )))}
              </div>
            )}
          </div>

          <div className={styles.infoBox}>
            <Lightbulb size={20} color="#F59E0B" />
            <div><strong>Pixel [{hoveredPixel?.r}, {hoveredPixel?.c}]</strong>
              <div className={styles.infoDetail}>Value: {hoveredPixel?.val || 0} → {hoveredPixel?.val > 200 ? 'Bright (white)' : hoveredPixel?.val > 50 ? 'Medium (gray)' : 'Dark (black)'}</div>
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.conceptCard}>
            <h3>How Images Are Stored</h3>
            <div className={styles.diagram}>
              <div className={styles.diagramStep}><div className={styles.diagramIcon}>📷</div><div>Capture</div></div>
              <div className={styles.diagramArrow}>→</div>
              <div className={styles.diagramStep}><div className={styles.diagramIcon}>🔢</div><div>Digitize</div></div>
              <div className={styles.diagramArrow}>→</div>
              <div className={styles.diagramStep}><div className={styles.diagramIcon}>📊</div><div>Matrix</div></div>
            </div>
            <p className={styles.diagramDesc}>Your camera sensor converts light into electrical signals, which are then quantized into discrete values (0-255) forming a 2D array.</p>
          </div>

          <div className={styles.formulaCard}>
            <div className={styles.formulaLabel}>Color Images</div>
            <div className={styles.formula}><span className={styles.formulaPart}>Red</span><span className={styles.formulaPlus}>+</span><span className={styles.formulaPart}>Green</span><span className={styles.formulaPlus}>+</span><span className={styles.formulaPart}>Blue</span></div>
            <p className={styles.formulaNote}>Color images have 3 channels (RGB), each a separate 2D grid. Together they form a 3D tensor.</p>
          </div>
        </div>
      </div>

      <div className={styles.navBar}>
        <button className={styles.navBtn} onClick={onPrev}><ChevronLeft size={18} /> Back</button>
        <button className={styles.navBtnPrimary} onClick={onNext}>Next: Convolution <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

function FiltersPhase({ onNext, onPrev }) {
  const [kernelPos, setKernelPos] = useState({ row: 0, col: 0 });
  const [isConvolving, setIsConvolving] = useState(false);
  const [activeFilter, setActiveFilter] = useState('edge');
  const [outputMap, setOutputMap] = useState([]);
  const chiti = useChiti();

  const inputGrid = [
    [0, 0, 0, 0, 0, 0, 0, 0], [0, 255, 0, 0, 0, 0, 0, 0], [0, 255, 0, 0, 0, 0, 0, 0],
    [0, 255, 0, 0, 0, 0, 0, 0], [0, 255, 0, 0, 0, 0, 0, 0], [0, 255, 0, 0, 0, 0, 0, 0],
    [0, 255, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0],
  ];

  const kernels = {
    edge: { name: 'Edge Detection', matrix: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], desc: 'Finds vertical edges by comparing left vs right' },
    sharpen: { name: 'Sharpening', matrix: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], desc: 'Enhances edges and fine details' },
    blur: { name: 'Blur (Average)', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], desc: 'Smooths by averaging neighbors' },
    emboss: { name: 'Emboss', matrix: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]], desc: 'Creates 3D embossed effect' }
  };

  useEffect(() => {
    chiti.react('think', { say: "Watch how the kernel slides across the image, computing new values at each position!" });
  }, [chiti]);

  useEffect(() => {
    const output = [];
    for (let r = 0; r < 6; r++) {
      const row = [];
      for (let c = 0; c < 6; c++) {
        let sum = 0;
        const kernel = kernels[activeFilter].matrix;
        for (let kr = 0; kr < 3; kr++) {
          for (let kc = 0; kc < 3; kc++) {
            sum += inputGrid[r + kr][c + kc] * kernel[kr][kc];
          }
        }
        row.push(Math.max(0, Math.min(255, sum)));
      }
      output.push(row);
    }
    setOutputMap(output);
  }, [activeFilter]);

  const runConvolution = () => {
    setIsConvolving(true);
    let r = 0, c = 0;
    const interval = setInterval(() => {
      c++; if (c > 5) { c = 0; r++; }
      if (r > 5) { clearInterval(interval); setIsConvolving(false); return; }
      setKernelPos({ row: r, col: c });
    }, 150);
  };

  return (
    <div className={styles.phaseContainer}>
      <div className={styles.twoColumn}>
        <div className={styles.leftCol}>
          <div className={styles.eyebrow}>PHASE 2 · CORE MECHANISM</div>
          <h2 className={styles.phaseTitle}>Convolution: The Magic</h2>
          <p className={styles.narrative}>
            A <strong>convolution</strong> slides a small matrix (kernel) across the image,
            computing weighted sums at each position. Different kernels detect different features!
          </p>

          <div className={styles.filterSelector}>
            {Object.entries(kernels).map(([key, kernel]) => (
              <button key={key} className={`${styles.filterBtn} ${activeFilter === key ? styles.filterBtnActive : ''}`} onClick={() => setActiveFilter(key)}>
                <strong>{kernel.name}</strong><span className={styles.filterDesc}>{kernel.desc}</span>
              </button>
            ))}
          </div>

          <div className={styles.kernelDisplay}>
            <div className={styles.kernelLabel}>Active Kernel (3×3)</div>
            <div className={styles.kernelGrid}>
              {kernels[activeFilter].matrix.map((row, r) => row.map((val, c) => (
                <motion.div key={`k-${r}-${c}`} className={styles.kernelCell}
                  style={{
                    background: val > 0 ? `rgba(99, 102, 241, ${Math.abs(val) / 5})` : val < 0 ? `rgba(244, 63, 94, ${Math.abs(val) / 5})` : 'rgba(255,255,255,0.1)'
                  }}
                  initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: c * 0.05 + r * 0.05 }}>{val}</motion.div>
              )))}
            </div>
          </div>

          <button className={styles.playButton} onClick={runConvolution} disabled={isConvolving}>
            {isConvolving ? <Pause size={18} /> : <Play size={18} />}
            {isConvolving ? 'Running...' : 'Run Convolution'}
          </button>
        </div>

        <div className={styles.rightCol}>
          <div className={styles.convolutionViz}>
            <div className={styles.vizRow}>
              <div className={styles.vizPanel}>
                <div className={styles.vizTitle}>Input</div>
                <div className={styles.grid8x8}>
                  {inputGrid.map((row, r) => row.map((val, c) => {
                    const inKernel = r >= kernelPos.row && r < kernelPos.row + 3 && c >= kernelPos.col && c < kernelPos.col + 3;
                    return (
                      <motion.div key={`in-${r}-${c}`} className={styles.inputCell}
                        style={{
                          background: `rgba(255,255,255,${val / 255})`,
                          border: inKernel && isConvolving ? '2px solid #6366F1' : '1px solid rgba(255,255,255,0.1)',
                          boxShadow: inKernel && isConvolving ? '0 0 10px rgba(99,102,241,0.5)' : 'none'
                        }} />
                    );
                  }))}
                </div>
              </div>
              <div className={styles.vizArrow}>→</div>
              <div className={styles.vizPanel}>
                <div className={styles.vizTitle}>Output Feature Map</div>
                <div className={styles.grid6x6}>
                  {outputMap.map((row, r) => row.map((val, c) => {
                    const isActive = r === kernelPos.row && c === kernelPos.col && isConvolving;
                    return (
                      <motion.div key={`out-${r}-${c}`} className={styles.outputCell}
                        style={{
                          background: val > 100 ? `rgba(16, 185, 129, ${val / 255})` : val > 0 ? `rgba(99, 102, 241, ${val / 255})` : 'rgba(255,255,255,0.05)',
                          border: isActive ? '2px solid #10B981' : '1px solid rgba(255,255,255,0.1)',
                          transform: isActive ? 'scale(1.1)' : 'scale(1)'
                        }} />
                    );
                  }))}
                </div>
              </div>
            </div>
            {isConvolving && <div className={styles.convStatus}>Scanning position: [{kernelPos.row}, {kernelPos.col}]</div>}
          </div>

          <div className={styles.insightCard}>
            <Brain size={24} color="#A855F7" />
            <div><strong>Key Insight</strong><p>Each filter produces a <em>feature map</em>—a new representation highlighting specific patterns. Stack multiple filters!</p></div>
          </div>
        </div>
      </div>

      <div className={styles.navBar}>
        <button className={styles.navBtn} onClick={onPrev}><ChevronLeft size={18} /> Back</button>
        <button className={styles.navBtnPrimary} onClick={onNext}>Next: Feature Hierarchies <ChevronRight size={18} /></button>
      </div>
    </div>
  );
}

const CVModule = ({ onBack, onNavigateToLab }) => {
  const [currentPhase, setCurrentPhase] = useState(0);

  const renderPhase = () => {
    switch (currentPhase) {
      case 0: return <IntroPhase onNext={() => setCurrentPhase(1)} />;
      case 1: return <PixelsPhase onNext={() => setCurrentPhase(2)} onPrev={() => setCurrentPhase(0)} />;
      case 2: return <FiltersPhase onNext={() => setCurrentPhase(3)} onPrev={() => setCurrentPhase(1)} />;
      default: return <IntroPhase onNext={() => setCurrentPhase(1)} />;
    }
  };

  return (
    <div className={styles.cvModule}>
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBack}>← Back to Course</button>
        <div className={styles.moduleTitle}><Eye size={20} color="#6366F1" /> Computer Vision Module</div>
        <div className={styles.phaseProgress}>
          {PHASES.map((phase, i) => (
            <button key={phase.id} className={`${styles.phaseDot} ${i === currentPhase ? styles.phaseDotActive : ''} ${i < currentPhase ? styles.phaseDotDone : ''}`} onClick={() => setCurrentPhase(i)} title={phase.title}>
              <phase.icon size={14} />
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div key={currentPhase} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} transition={{ duration: 0.4 }} className={styles.phaseContent}>
          {renderPhase()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CVModule;
