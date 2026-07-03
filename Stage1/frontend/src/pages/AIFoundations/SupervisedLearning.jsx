import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronRight, TrendingUp, GitBranch, Network, Eye, Layers } from 'lucide-react';
import styles from './SupervisedLearning.module.css';

const SupervisedLearning = ({ onBackToDashboard, onNavigateToLinearRegression, onNavigateToComputerVision }) => {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div className={styles.container}>
      <nav className={styles.topNav}>
        <button className={styles.backBtn} onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Exit Lesson
        </button>
        <span className={styles.pageTitle}>Supervised Learning</span>
        <span className={styles.progressText}>
          {currentStep === 0 ? 'Concept Intro' : 'Model Selection'}
        </span>
      </nav>

      <AnimatePresence mode="wait">
        
        {/* STEP 0: INTRO */}
        {currentStep === 0 && (
          <motion.div key="s0" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#00F0FF' }}>The Core Concept</div>
            <h1 className={styles.sectionTitle}>
              Learning from <em>Labels</em>
            </h1>

            <div className={styles.narrative}>
              <p>In <strong>Supervised Learning</strong>, we act like a teacher pointing out flashcards to a student.</p>
              <p>We give the AI many examples where we already know the answer. We show it a picture and say, <em>"This is an Apple"</em>. We show it another and say, <em>"This is an Orange"</em>.</p>
              <p>Eventually, it learns the pattern. When we show it a new fruit, it can confidently predict the label on its own!</p>
            </div>

            <div className={styles.introVisualBox}>
              <div className={styles.visualItem}>
                <div className={styles.visualIcon} style={{ borderColor: '#FF3366', color: '#FF3366' }}>🍎</div>
                <div className={styles.visualLabel}>Label: "Apple"</div>
              </div>
              <div className={styles.visualItem}>
                <div className={styles.visualIcon} style={{ borderColor: '#FF9933', color: '#FF9933' }}>🍊</div>
                <div className={styles.visualLabel}>Label: "Orange"</div>
              </div>
              <div className={styles.visualItem}>
                <div className={styles.visualIcon} style={{ borderColor: '#c4c0d4', color: '#c4c0d4' }}>❓</div>
                <div className={styles.visualLabel}>New Data</div>
              </div>
            </div>

            <div className={styles.navControls}>
              <button className={styles.navButton} onClick={() => setCurrentStep(1)}>
                Continue to Models <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 1: MODELS GRID */}
        {currentStep === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.35 }} className={styles.flashcard}>
            <div className={styles.sectionEyebrow} style={{ color: '#00FF88' }}>The Toolkit</div>
            <h1 className={styles.sectionTitle}>
              Select a <em>Model</em>
            </h1>

            <div className={styles.narrative}>
              <p>Different types of problems require different types of math. Choose a model to dive into how it learns.</p>
            </div>

            <div className={styles.modelsGrid}>
              
              {/* Linear Regression - ACTIVE */}
              <div className={styles.modelCard} onClick={onNavigateToLinearRegression} style={{ borderColor: 'rgba(0, 240, 255, 0.4)', background: 'rgba(0, 240, 255, 0.05)' }}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 240, 255, 0.15)' }}>
                    <TrendingUp color="#00F0FF" />
                  </div>
                  Linear Regression
                </div>
                <div className={styles.cardBody}>
                  Predict a continuous number (e.g., Price, Temperature, Score) by drawing the perfect line through data points.
                </div>
              </div>

              {/* Clustering - INACTIVE */}
              <div className={`${styles.modelCard} ${styles.modelCardDisabled}`}>
                <div className={styles.comingSoonBadge}>Coming Soon</div>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(255, 51, 102, 0.1)' }}>
                    <Layers color="#FF3366" />
                  </div>
                  Clustering
                </div>
                <div className={styles.cardBody}>
                  Group unlabeled data into distinct clusters or categories based on underlying patterns.
                </div>
              </div>

              {/* Decision Tree - INACTIVE */}
              <div className={`${styles.modelCard} ${styles.modelCardDisabled}`}>
                <div className={styles.comingSoonBadge}>Coming Soon</div>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(0, 255, 136, 0.1)' }}>
                    <GitBranch color="#00FF88" />
                  </div>
                  Decision Tree
                </div>
                <div className={styles.cardBody}>
                  Make decisions by splitting data across a series of True/False questions like a flowchart.
                </div>
              </div>

              {/* Neural Network - INACTIVE */}
              <div className={`${styles.modelCard} ${styles.modelCardDisabled}`}>
                <div className={styles.comingSoonBadge}>Coming Soon</div>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(178, 0, 255, 0.1)' }}>
                    <Network color="#B200FF" />
                  </div>
                  Neural Network
                </div>
                <div className={styles.cardBody}>
                  Mimic the human brain with layers of interconnected nodes to solve highly complex, non-linear problems.
                </div>
              </div>

              {/* Computer Vision - ACTIVE */}
              <div className={styles.modelCard} onClick={onNavigateToComputerVision} style={{ borderColor: 'rgba(255, 153, 51, 0.4)', background: 'rgba(255, 153, 51, 0.05)' }}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconWrapper} style={{ background: 'rgba(255, 153, 51, 0.15)' }}>
                    <Eye color="#FF9933" />
                  </div>
                  Computer Vision
                </div>
                <div className={styles.cardBody}>
                  Teach AI to see, interpret, and classify visual information from the world using Convolutional Neural Networks (CNNs).
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupervisedLearning;
