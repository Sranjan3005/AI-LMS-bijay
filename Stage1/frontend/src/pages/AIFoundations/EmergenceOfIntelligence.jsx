import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ChevronRight, ChevronLeft,
  Calculator, Ruler, TrendingUp, Network, BrainCircuit,
  Brain, Sparkles, Lightbulb, MessageSquare
} from 'lucide-react';
import styles from './EmergenceOfIntelligence.module.css';

import chapter1Video from '../../assets/videos/chapter1.mp4';
import chapter2Video from '../../assets/videos/chapter2.mp4';
import chapter3Video from '../../assets/videos/chapter3.mp4';
import chapter4Video from '../../assets/videos/chapter4.mp4';

const EmergenceOfIntelligence = ({ onBackToDashboard }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const totalSteps = 5; // 0 to 4

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  // Background elements
  const stars = Array.from({ length: 60 }).map((_, i) => ({
    left: Math.random() * 100 + '%',
    top: Math.random() * 60 + '%',
    animationDuration: 2 + Math.random() * 4 + 's',
    animationDelay: Math.random() * 4 + 's',
    isSmall: Math.random() > 0.8
  }));

  const petals = Array.from({ length: 18 }).map((_, i) => {
    const dur = 9 + Math.random() * 10;
    return {
      left: Math.random() * 100 + '%',
      animationDuration: dur + 's',
      animationDelay: -Math.random() * dur + 's',
      transform: `scale(${0.7 + Math.random() * 0.8})`
    };
  });

  // Slide animation variants
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className={styles.bodyWrapper}>
      {/* Top Navigation */}
      <div className={styles.topNav}>
        <div className={styles.backButton} onClick={onBackToDashboard}>
          <ArrowLeft size={18} /> Exit Lesson
        </div>
        <div className={styles.progressText}>
          Chapter {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {/* Background Elements */}
      <div className={styles.backdrop}></div>
      <div className={styles.starsContainer}>
        {stars.map((s, i) => (
          <div key={i} className={`${styles.star} ${s.isSmall ? styles.starSmall : ''}`} style={s}></div>
        ))}
      </div>
      <div className={styles.moon}></div>
      <div className={styles.water}></div>
      <div className={styles.petalsContainer}>
        {petals.map((p, i) => (
          <div key={i} className={styles.petal} style={p}></div>
        ))}
      </div>

      {/* Flashcard Content */}
      <div className={styles.flashcardContainer}>
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={styles.flashcard}>
              <div className={styles.heroEyebrow}>Introduction &middot; Class 6 — 8</div>
              <h1 className={styles.heroTitle}>The Chain Reaction<br />of <em>Mathematics.</em></h1>
              <p className={styles.heroSubtitle}>From counting stones to the emergence of artificial intelligence.</p>
              <div className={styles.heroRule}></div>
              <p className={styles.prose}>
                Mathematics was not invented all at once. It grew as a chain reaction. For thousands of years, whenever humanity faced a problem it could not solve, it invented a new form of mathematics. Each new branch unlocked new abilities, which eventually led to new problems — requiring yet another branch to be born.
              </p>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className={styles.flashcard}>
              <div className={styles.chapterTag}>Chapter 01 &middot; The First Chain</div>
              <h2 className={styles.chapterTitle}>From the earth<br />to <em>the abstract.</em></h2>
              <p className={styles.lede}>In the beginning, counting was physical. It was tied to the objects in front of us.</p>
              
              <div className={styles.videoPlaceholder} style={{ background: 'transparent', border: 'none', height: 'auto', marginBottom: '30px' }}>
                <video src={chapter1Video} autoPlay loop playsInline style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
              </div>

              <div className={styles.branch}>
                <div className={styles.branchHead}>
                  <div className={styles.branchIcon}><Calculator size={20}/></div>
                  <div className={styles.branchName}>Arithmetic &amp; Algebra</div>
                  <div className={styles.branchEra}>~2000 BCE</div>
                </div>
                <p className={styles.branchBody}>As civilizations grew, they needed to track trade, taxes, and resources. Basic counting evolved into arithmetic. When people needed to solve problems where some numbers were unknown, they developed algebra.</p>
                <p className={styles.branchEssence}>This was the first leap: from physical objects to abstract symbols.</p>
              </div>

              <div className={styles.branch}>
                <div className={styles.branchHead}>
                  <div className={styles.branchIcon}><Ruler size={20}/></div>
                  <div className={styles.branchName}>Geometry</div>
                  <div className={styles.branchEra}>~300 BCE</div>
                </div>
                <p className={styles.branchBody}>To build temples, divide land, and measure fields, humanity needed to understand space, shapes, and distances. This led to geometry — the mathematics of the physical world.</p>
              </div>
              
              <div className={styles.branch}>
                <div className={styles.branchHead}>
                  <div className={styles.branchIcon}><TrendingUp size={20}/></div>
                  <div className={styles.branchName}>Calculus</div>
                  <div className={styles.branchEra}>1666 — 1675</div>
                </div>
                <p className={styles.branchBody}>Yet algebra and geometry were mainly suited to fixed situations. They could not fully describe things that changed continuously. Calculus provided a new language for continuous change.</p>
                <p className={styles.branchEssence}>Even calculus, though, could not learn from examples.</p>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className={styles.flashcard}>
              <div className={styles.chapterTag}>Chapter 02 &middot; A New Kind of Tool</div>
              <h2 className={styles.chapterTitle}>Even calculus could not<br />solve <em>every problem.</em></h2>
              <p className={styles.lede}>It could describe how a known system changed — but it could not easily discover the hidden and highly complex behaviour found in human language, images, and decisions.</p>

              <div className={styles.videoPlaceholder} style={{ background: 'transparent', border: 'none', height: 'auto', marginBottom: '30px' }}>
                <video src={chapter2Video} autoPlay loop playsInline style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
              </div>

              <div className={styles.compare}>
                <div className={styles.compareCard}>
                  <div className={styles.compareStep}>Step 01</div>
                  <div className={styles.compareName}><Network size={20} className={styles.iconAccent} /> Machine Learning</div>
                  <p className={styles.compareBody}>By combining ideas from mathematics, statistics, and computer science, researchers built systems that could <strong>learn patterns from examples</strong> instead of being told every rule.</p>
                </div>

                <div className={styles.compareCard}>
                  <div className={styles.compareStep}>Step 02</div>
                  <div className={styles.compareName}><BrainCircuit size={20} className={styles.iconAccent} /> Deep Learning</div>
                  <p className={styles.compareBody}>Machine learning later advanced into deep learning. Through deep learning, researchers became able to model <strong>increasingly complex patterns in language, images, speech,</strong> and many other forms of information.</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className={styles.flashcard}>
              <div className={styles.chapterTag}>Chapter 03 &middot; The Surprise</div>
              <h2 className={styles.chapterTitle}>Behaviours that<br /><em>appeared</em> intelligent.</h2>

              <div className={styles.videoPlaceholder} style={{ background: 'transparent', border: 'none', height: 'auto', marginBottom: '30px' }}>
                <video src={chapter3Video} autoPlay loop playsInline style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
              </div>

              <div className={styles.bento}>
                <div className={styles.bentoCell}>
                  <div className={styles.bentoNum}>01</div>
                  <div className={styles.bentoName}><Brain size={18} className={styles.iconAccent}/> Reasoning</div>
                  <p className={styles.bentoLine}>Working through multi-step problems it had never seen before.</p>
                </div>
                <div className={styles.bentoCell}>
                  <div className={styles.bentoNum}>02</div>
                  <div className={styles.bentoName}><Sparkles size={18} className={styles.iconAccent}/> Generating Ideas</div>
                  <p className={styles.bentoLine}>Producing text, images, and code that did not previously exist.</p>
                </div>
                <div className={styles.bentoCell}>
                  <div className={styles.bentoNum}>03</div>
                  <div className={styles.bentoName}><Lightbulb size={18} className={styles.iconAccent}/> Solving Problems</div>
                  <p className={styles.bentoLine}>Combining concepts across domains to reach an answer.</p>
                </div>
                <div className={styles.bentoCell}>
                  <div className={styles.bentoNum}>04</div>
                  <div className={styles.bentoName}><MessageSquare size={18} className={styles.iconAccent}/> Communicating</div>
                  <p className={styles.bentoLine}>Holding natural conversations with humans in everyday language.</p>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className={styles.flashcard} style={{ textAlign: 'center' }}>
              <div className={styles.closingEyebrow}>Mathematics has given us a new form of understanding</div>
              <p className={styles.closingQuote}>
                Yet through deep learning, humanity may now possess a new tool for studying intelligence — <span style={{ color: 'var(--accent)' }}>not only by observing it, but also by attempting to reconstruct parts of it in machines.</span>
              </p>

              <div className={styles.videoPlaceholder} style={{ background: 'transparent', border: 'none', height: 'auto', margin: '40px auto' }}>
                <video src={chapter4Video} autoPlay loop playsInline style={{ width: '100%', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
              </div>

              <div className={styles.closingRule}></div>
              <p className={styles.closingFinal}>We call this<br /><em>artificial intelligence.</em></p>
              <div className={styles.closingRule} style={{ marginTop: '80px' }}></div>
              
              <div className={styles.closingCredit}>End of Lesson 01 &middot; AI Foundations</div>
              
              <button className={styles.finishButton} onClick={onBackToDashboard}>
                Return to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Controls */}
        <div className={styles.navControls}>
          <button 
            className={styles.navButton} 
            onClick={handlePrev} 
            disabled={currentStep === 0}
            style={{ opacity: currentStep === 0 ? 0.3 : 1, cursor: currentStep === 0 ? 'default' : 'pointer' }}
          >
            <ChevronLeft size={20} /> Previous
          </button>
          
          <div className={styles.dots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div 
                key={i} 
                className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`}
                onClick={() => setCurrentStep(i)}
              ></div>
            ))}
          </div>

          <button 
            className={`${styles.navButton} ${styles.navButtonPrimary}`} 
            onClick={currentStep === totalSteps - 1 ? onBackToDashboard : handleNext} 
          >
            {currentStep === totalSteps - 1 ? 'Finish' : 'Next Chapter'} <ChevronRight size={20} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default EmergenceOfIntelligence;
