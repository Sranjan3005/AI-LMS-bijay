import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, Zap, AlertTriangle, Package, Bot, ArrowRight, ArrowLeft, BarChart2, Hash, Maximize2, Minimize2, Activity, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import api from '../../api';
import trainingVideo from '../../assets/training_video.mp4';
import DrawingCanvas from './DrawingCanvas';
import ScenarioImageShowcase, { hasImageShowcase } from './ScenarioImageShowcase';
import CVDatasetPreview from './CVDatasetPreview';
import TrainingReport from './TrainingReport';
import PhotoPredictPanel from './PhotoPredictPanel';
import { hasPhotoTraining } from './PhotoTrainingLab';
import { runDigitPipeline } from '../../lib/cv/digit';
import { trainAllVariants } from '../../lib/cv/digitTrainer';
import { previewTiles } from '../../lib/cv/digitData';
import { runEdgePipeline } from '../../lib/cv/edge';
import { runOcrPipeline } from '../../lib/cv/ocr';
import { canvasFromDataURL, extractInput28 } from '../../lib/cv/imageOps';
import { useChiti } from '../chiti/ChitiProvider';
import { GuideProvider, ChitiAvatar } from '../../components/guide/GuideProvider';
import AnimatedPipeline from './AnimatedPipeline';
import GenericCVPipelineViewer from './GenericCVPipelineViewer';
import CVPresetTests from './CVPresetTests';

const getCVGuideSteps = (canTrainInBrowser) => {
  const steps = [
    { target: '[data-guide="cv-canvas"]', say: "Draw a digit or shape here — this is what the AI will try to recognise.", mood: 'point' },
    { target: '[data-guide="cv-predict"]', say: "Hit Predict Drawing to run your image through the trained model.", mood: 'point' },
    { target: '[data-guide="cv-pipeline"]', say: "Watch the stages here. Each one transforms the image step by step.", mood: 'think' },
    { target: '[data-guide="cv-presets"]', say: "Try these preset images to see how the model handles different styles.", mood: 'point' },
  ];
  if (canTrainInBrowser) {
    steps.push({ target: '[data-guide="cv-report"]', say: "This panel shows how well the model performed on different datasets.", mood: 'idle', cta: 'Ready to test!' });
  } else {
    steps[steps.length - 1].cta = 'Ready to test!';
    steps[steps.length - 1].mood = 'idle';
  }
  return steps;
};

// Computer-vision scenarios run fully in the browser (no Docker/Celery/LLM):
// the same real models used in the CV demonstration playground.
const CV_PIPELINES = {
  'The Digit Detective':     runDigitPipeline,
  'The Handwriting Decoder': runOcrPipeline,
  'The Edge Explorer':       runEdgePipeline,
};

// Hex palette for Plotly (CSS vars don't resolve inside Plotly traces).
const PLOTLY_COLORS = ['#00F0FF', '#00FF88', '#B200FF', '#FF3366', '#facc15', '#f472b6', '#FF9933', '#5E5CE6'];

const PREDICTION_PROMPTS = {
  'The Social Media Trend': "Give me the number of likes, I'll try to guess the comments!",
  'The Smart Greenhouse': "Set the sunlight and water, I'll predict the growth!",
  'The Paper Plane Lab': "Give me the wing size and weight, I'll predict the flight distance!",
  'The Bean Sprout Project': "Give me the light and water, I'll predict the sprout height!",
  'The Study Score Predictor': "Tell me the study hours, I'll guess the score!",
  'The Lemonade Stand': "Give me the temperature, I'll predict the sales!",
  'The Speedrun Timer': "Give me the player stats, I'll predict the time!",
  'The Bike Brake Test': "Give me the speed and weight, I'll predict the stopping distance!",
  'The Chat Moderator': "Enter the chat details, I'll predict if it's toxic!",
  'The Spam Catcher': "Give me the clues, I'll catch the spam!",
  'The Smart Trash Can': "Give me the weight and material, I'll sort the trash!",
  'The Gaming Bot Detector': "Give me the actions, I'll tell you if it's a bot!",
  'The Forest Forager': "Give me the mushroom details, I'll tell you if it's poisonous!",
  'The Dog Translator': "Give me the barks and wags, I'll tell you what they want!",
  'The Magic Potion Sorter': "Give me the ingredients, I'll predict the potion type!",
  'The Self-Driving Eye': "Give me the pixels, I'll identify the road sign!",
  'The Emotion Reader': "Give me the facial features, I'll predict the emotion!"
};

const DataCanvas = ({ scenario, selectedVariant, onSelectVariant, previewData, loading, onRunModel, isTraining, experimentResult, experimentError, onRefreshScenarios }) => {
  const [interpretData, setInterpretData] = useState(null);
  const [allPreviews, setAllPreviews] = useState({});
  const [cvInputImage, setCvInputImage] = useState(null);
  const [cvResult, setCvResult] = useState(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvError, setCvError] = useState(null);
  // Edge detection and grid data for animated pipeline
  const [cvEdgeImage, setCvEdgeImage] = useState(null);
  const [cvGridData, setCvGridData] = useState(null);
  // Real in-browser training (Digit Detective): the trained classifier head, the
  // measured train-on-X/test-on-Y matrix, and live progress while it runs.
  const [trainMatrix, setTrainMatrix] = useState(null);
  const [trainProgress, setTrainProgress] = useState(null);

  // Animation states: 'selection', 'data_review', 'feeding_training', 'trained', 'robot_predict', 'error'
  const [animationStep, setAnimationStep] = useState('selection');
  const rootRef = useRef(null);

  const chiti = useChiti();

  // A4: Audio-guided flow using Chiti
  useEffect(() => {
    if (scenario?.model_type !== 'COMPUTER_VISION') return;

    if (animationStep === 'selection' || animationStep === 'data_selection') {
      const greetKey = `cv_greeted_${scenario.id}`;
      if (!sessionStorage.getItem(greetKey)) {
        sessionStorage.setItem(greetKey, 'true');
        chiti.react('greet', { say: `Welcome to the ${scenario.title} scenario!` });
      }
    } else if (animationStep === 'data_review') {
      let story = "Interesting visual patterns here. Ready to train when you are.";
      if (selectedVariant === 'clean') story = "These are perfectly upright, clean digits. A model trained on this will expect neat handwriting!";
      else if (selectedVariant === 'messy') story = "These digits are messy and slanted. This teaches the AI to handle real-world, sloppy handwriting.";
      else if (selectedVariant === 'noisy') story = "These digits are grainy, like a bad scan. The AI has to learn to ignore the noise and focus on the shapes.";
      else if (selectedVariant === 'normal') story = "These are clean, normal handwriting letters. Great for reading everyday documents.";
      else if (selectedVariant === 'cursive') story = "These letters are connected and flowing. Much harder for an AI to decode!";
      else if (selectedVariant === 'sobel_clean') story = "This dataset uses edge detection on clean images to find the outlines.";
      else if (selectedVariant === 'sobel_noisy') story = "This dataset uses edge detection, but the images are noisy, which might confuse the edge detector!";
      else if (selectedVariant === 'shapes') story = "Strong, simple outlines! This is exactly what edge detection looks for.";
      else if (selectedVariant === 'complex') story = "A busy scene with lots of overlapping edges. It might get messy!";
      else if (selectedVariant === 'gradient') story = "Smooth colors with no sharp boundaries. Edge detection won't see much here.";
      
      const reviewKey = `cv_reviewed_${scenario.id}_${selectedVariant}`;
      if (!sessionStorage.getItem(reviewKey)) {
        sessionStorage.setItem(reviewKey, 'true');
        chiti.react('think', { say: story });
      }
    } else if (animationStep === 'trained') {
      chiti.react('celebrate', { say: "Training complete!" });
    } else if (animationStep === 'robot_predict') {
      chiti.react('greet', { say: "I've learned the features of the dataset! Use the tools to test me, and I'll break down exactly how I see it." });
    }
  }, [animationStep, scenario?.model_type, selectedVariant, chiti.react]);

  useEffect(() => {
    if (!selectedVariant) {
      setAnimationStep('selection');
    }
    // fresh dataset → clear any previous in-browser CV run
    setCvResult(null);
    setCvError(null);
    setCvInputImage(null);
  }, [selectedVariant]);

  // Whenever the flow moves to a new step, scroll its scroll container back to top
  // so a step never opens already scrolled down.
  useEffect(() => {
    const scroller = rootRef.current?.closest('[data-scroll]');
    if (scroller) scroller.scrollTop = 0;
    else window.scrollTo(0, 0);
  }, [animationStep]);

  const isCV = scenario?.model_type === 'COMPUTER_VISION';
  const isImageShowcase = hasImageShowcase(scenario?.title);
  // Only the digit scenario has a model that can genuinely be fitted in-browser:
  // OCR (Tesseract) and edge detection (Sobel) have no weights to learn.
  const canTrainInBrowser = scenario?.title === 'The Digit Detective';
  const trainedHead = trainMatrix?.[selectedVariant]?.head || null;

  const runCvPrediction = async (testVariant = 'drawn', imageOverride = null) => {
    const input = imageOverride || cvInputImage;
    if (!input) { alert('Please provide an image or draw something first!'); return; }
    setCvBusy(true); setCvError(null); setCvResult(null);
    setCvEdgeImage(null); setCvGridData(null);
    try {
      const srcCanvas = await canvasFromDataURL(input);
      const pipeline = CV_PIPELINES[scenario.title] || runDigitPipeline;

      // trainedHead is the model the student just fitted, so the prediction
      // reflects the dataset they chose rather than a fixed factory model.
      const res = await pipeline(srcCanvas, { trainedVariant: selectedVariant, testVariant, trainedHead });

      // Compute edge detection image for the animated pipeline
      try {
        const edgeRes = await runEdgePipeline(srcCanvas);
        if (edgeRes?.ok && edgeRes.stages?.[2]?.image) {
          setCvEdgeImage(edgeRes.stages[2].image); // neon edge image
        }
      } catch (_) { /* edge detection is optional */ }

      // Extract 28x28 grid for the grid animation
      try {
        const grid = extractInput28(srcCanvas);
        if (grid) setCvGridData(Array.from(grid));
      } catch (_) { /* grid extraction is optional */ }
      
      if (res?.ok) {
        setCvResult(res);
        if (res.mismatch_message) {
          chiti.react('surprised', { say: "Whoa, this doesn't match what I learned!" });
        } else {
          chiti.react('agree', { say: res.prediction || "Got it! Look at the pipeline steps below." });
        }
      }
      else {
        setCvError(res?.message || (res?.reason === 'blank'
          ? 'Draw something bigger and bolder, then try again!'
          : 'The vision model could not read that — try a clearer drawing.'));
        chiti.react('wrong', { say: "I couldn't quite see that. Try drawing it a bit clearer." });
      }
    } catch (err) {
      console.error('Client CV pipeline failed', err);
      setCvError('Something went wrong running the vision pipeline. Please try again.');
    } finally {
      setCvBusy(false);
    }
  };

  useEffect(() => {
    if (!scenario) return;

    const fetchAllPreviews = async () => {
      // Create an array of fetch promises
      const fetchPromises = (scenario.variants || []).map(async (variant) => {
        // We check current state to avoid duplicate requests, but since it might be stale,
        // we mainly rely on this for the initial batch.
        try {
          const response = await api.get(`/${scenario.model_type.toLowerCase()}/preview/`, {
            params: { scenario_id: scenario.id, variant_name: variant.name }
          });
          return { name: variant.name, data: response.data };
        } catch (err) {
          console.error("Failed to fetch preview for", variant.name);
          return null;
        }
      });

      // Wait for all requests to finish at the same time
      const results = await Promise.all(fetchPromises);
      
      // Update state once with all new data
      setAllPreviews(prev => {
        const next = { ...prev };
        let updated = false;
        results.forEach(res => {
          if (res && res.data) {
            next[res.name] = res.data;
            updated = true;
          }
        });
        return updated ? next : prev;
      });
    };
    
    fetchAllPreviews();
  }, [scenario]);

  useEffect(() => {
    const fetchInterpret = async () => {
      if (!scenario || !selectedVariant) return;
      try {
        const response = await api.get(`/${scenario.model_type.toLowerCase()}/interpret/`, {
          params: { scenario_id: scenario.id, variant_name: selectedVariant }
        });
        setInterpretData(response.data);
      } catch (err) {
        console.error("No interpretation found", err);
        setInterpretData(null);
      }
    };
    fetchInterpret();
  }, [scenario, selectedVariant]);

  useEffect(() => {
    if (animationStep === 'feeding_training' && !isTraining) {
      if (experimentResult) {
        if (scenario?.model_type === 'COMPUTER_VISION') {
          setAnimationStep('data_review');
        } else {
          setAnimationStep('trained');
          setTimeout(() => {
            setAnimationStep('robot_predict');
          }, 2000);
        }
      } else if (experimentError) {
        setAnimationStep('error');
      }
    }
  }, [isTraining, experimentResult, experimentError, animationStep, scenario]);

  if (!scenario) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <h2>Select an experiment from the left to begin.</h2>
      </div>
    );
  }

  const getScenarioAssets = (title) => {
    const map = {
      'The Smart Greenhouse': { bg: '/smart_greenhouse_bg.png', video: 'w77zPAtVTuI' },
      'The Paper Plane Lab': { bg: '/paper_plane_lab_bg.png', video: 'aircAruvnKk' },
      'The Bean Sprout Project': { bg: '/bean_sprout_project_bg.png', video: 'w77zPAtVTuI' },
      'The Study Score Predictor': { bg: '/study_score_predictor_bg.png', video: 'aircAruvnKk' },
      'The Lemonade Stand': { bg: '/lemonade_stand_bg.png', video: 'aircAruvnKk' },
      'The Speedrun Timer': { bg: '/speedrun_timer_bg.png', video: 'aircAruvnKk' },
      'The Bike Brake Test': { bg: '/bike_brake_test_bg.png', video: 'aircAruvnKk' },
      'The Chat Moderator': { bg: '/chat_moderator_bg.png', video: 'aircAruvnKk' },
      'The Spam Catcher': { bg: '/spam_catcher_bg.png', video: 'aircAruvnKk' },
      'The Smart Trash Can': { bg: '/smart_trash_can_bg.png', video: 'aircAruvnKk' },
      'The Gaming Bot Detector': { bg: '/gaming_bot_detector_bg.png', video: 'aircAruvnKk' },
      'The Forest Forager': { bg: '/forest_forager_bg.png', video: 'w77zPAtVTuI' },
      'The Dog Translator': { bg: '/dog_translator_bg.png', video: 'aircAruvnKk' },
      'The Magic Potion Sorter': { bg: '/magic_potion_sorter_bg.png', video: 'aircAruvnKk' },
      'The Self-Driving Eye': { bg: '/self_driving_eye_bg.png', video: 'aircAruvnKk' },
      'The Emotion Reader': { bg: '/emotion_reader_bg.png', video: 'aircAruvnKk' },
    };
    return map[title] || { bg: null, video: null };
  };

  const getBgStyle = () => {
    const assets = getScenarioAssets(scenario?.title);
    if (assets.bg) {
      return {
        backgroundImage: `url('${assets.bg}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundBlendMode: 'overlay',
        backgroundColor: 'rgba(10, 15, 30, 0.85)',
        minHeight: '100%',
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden'
      };
    }
    return { minHeight: '100%', position: 'relative', overflow: 'hidden' };
  };

  const handleVariantClick = (name) => {
    onSelectVariant(name);
    setAnimationStep('data_review');
  };

  const handleDeleteVariant = async (e, variantId) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this custom dataset?')) {
      try {
        await api.delete(`/scenarios/variant/${variantId}/`);
        if (onRefreshScenarios) {
          onRefreshScenarios();
        } else {
          window.location.reload();
        }
      } catch (err) {
        console.error("Failed to delete variant", err);
        alert("Failed to delete variant: " + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleNextToTrain = async () => {
    setAnimationStep('feeding_training');

    if (scenario?.model_type !== 'COMPUTER_VISION') {
      onRunModel();
      return;
    }

    // The Digit Detective trains for real, in the browser: a fresh classifier
    // head is fitted to the chosen dataset and then scored against all three.
    // The other CV scenarios have nothing to fit (Tesseract and Sobel are fixed),
    // so they keep the short hand-off animation.
    if (canTrainInBrowser) {
      setTrainMatrix(null);
      setTrainProgress({ phase: 'features', done: 0, total: 1 });
      try {
        const matrix = await trainAllVariants(setTrainProgress);
        setTrainMatrix(matrix); // null when the datasets aren't installed yet
      } catch (err) {
        console.error('In-browser training failed', err);
        setTrainMatrix(null);
      } finally {
        setTrainProgress(null);
      }
      setAnimationStep('trained');
      setTimeout(() => setAnimationStep('robot_predict'), 1800);
      return;
    }

    setTimeout(() => {
      setAnimationStep('trained');
      setTimeout(() => setAnimationStep('robot_predict'), 2000);
    }, 3000);
  };

  const featureCols = previewData?.columns ? previewData.columns.slice(0, -1) : [];
  const yCol = previewData?.columns ? previewData.columns[previewData.columns.length - 1] : '';

  const chartData = previewData?.rows?.map((row) => {
    const obj = {};
    previewData.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  }) || [];

  const isClassification = scenario?.model_type.toLowerCase() === 'classification';
  const COLORS = ['var(--accent-cyan)', 'var(--accent-green)', 'var(--accent-purple)', 'var(--accent-red)', '#facc15', '#f472b6'];

  let groupedData = {};
  if (isClassification && chartData.length > 0) {
    chartData.forEach(row => {
      const label = row[yCol];
      if (!groupedData[label]) groupedData[label] = [];
      groupedData[label].push(row);
    });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--glass-border)', padding: '12px', borderRadius: '8px', color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
          <h4 style={{ margin: '0 0 8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', color: 'var(--accent-cyan)' }}>Data Point</h4>
          {Object.entries(data).map(([key, val]) => (
            <p key={key} style={{ margin: '3px 0', fontSize: '0.95rem' }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{key}:</strong> {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate Deep Analysis Stats
  const deepStats = {};
  if (chartData.length > 0 && featureCols.length > 0) {
    featureCols.forEach(col => {
      const values = chartData.map(row => row[col]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        deepStats[col] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        };
      }
    });
    // Add Y col if numeric
    if (!isClassification && yCol) {
      const yValues = chartData.map(row => row[yCol]).filter(v => typeof v === 'number');
      if (yValues.length > 0) {
        deepStats[yCol] = {
          min: Math.min(...yValues),
          max: Math.max(...yValues),
          avg: (yValues.reduce((a, b) => a + b, 0) / yValues.length).toFixed(2),
        };
      }
    }
  }

  return (
    <div ref={rootRef} style={{ ...getBgStyle(), padding: '40px' }}>
      <AnimatePresence mode="popLayout">
        
        {/* View 1: Selection */}
        {animationStep === 'selection' && (
          <motion.div 
            key="selection" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ maxWidth: '1240px', margin: '0 auto' }}
          >
            <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#ffffff', textShadow: '0 2px 14px rgba(0,0,0,0.85)' }}>{scenario.title}</h1>
            <p style={{ color: '#eef0f6', fontSize: '1.1rem', marginBottom: '24px', textShadow: '0 1px 10px rgba(0,0,0,0.8)', maxWidth: 820 }}>
              {scenario.challenge}
            </p>

            {/* Authored narrative layer (seeded on the Scenario model) */}
            {scenario.story && (
              <div style={{ padding: '20px 24px', background: 'rgba(12,10,24,0.82)', backdropFilter: 'blur(3px)', borderRadius: '12px', marginBottom: '16px', borderLeft: '5px solid var(--accent-purple)' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#d9a8ff', margin: '0 0 8px' }}>Why predict this?</h3>
                <p style={{ color: '#e5e8f2', fontSize: '1.02rem', lineHeight: 1.65, margin: 0 }}>{scenario.story}</p>
              </div>
            )}
            {scenario.data_story && (
              <div style={{ padding: '20px 24px', background: 'rgba(6,18,26,0.82)', backdropFilter: 'blur(3px)', borderRadius: '12px', marginBottom: '16px', borderLeft: '5px solid var(--accent-cyan)' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#8fe6ff', margin: '0 0 8px' }}>Where the data comes from</h3>
                <p style={{ color: '#e5e8f2', fontSize: '1.02rem', lineHeight: 1.65, margin: 0 }}>{scenario.data_story}</p>
              </div>
            )}
            {scenario.guide_steps?.length > 0 && (
              <div style={{ padding: '20px 24px', background: 'rgba(6,20,12,0.82)', backdropFilter: 'blur(3px)', borderRadius: '12px', marginBottom: '24px', borderLeft: '5px solid #30D158' }}>
                <h3 style={{ fontSize: '1.15rem', color: '#7cf0a4', margin: '0 0 10px' }}>Your mission — step by step</h3>
                <ol style={{ margin: 0, paddingLeft: '22px', color: '#e5e8f2', fontSize: '1.02rem', lineHeight: 1.8 }}>
                  {scenario.guide_steps.map((st, i) => <li key={i}>{st}</li>)}
                </ol>
              </div>
            )}

            <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: 'var(--accent-purple)' }}>Select a Dataset Variant</h2>
            
            <div style={{ display: 'flex', gap: '25px', flexWrap: 'wrap' }}>
              {scenario.variants?.map((variant, index) => (
                <motion.div 
                  key={variant.name}
                  layoutId={`variant-card-${variant.name}`}
                  onClick={() => handleVariantClick(variant.name)}
                  whileHover={{ scale: 1.05 }}
                  className="glass-panel"
                  style={{
                    width: '260px',
                    height: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    position: 'relative',
                    zIndex: 2
                  }}
                >
                  <div style={{ padding: '16px 18px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'white', fontWeight: 'bold' }}>{variant.label}</h3>
                    {variant.description && (
                      <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: 1.45,
                                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {variant.description}
                      </p>
                    )}
                  </div>
                  
                  {variant.is_custom && (
                    <button 
                      onClick={(e) => handleDeleteVariant(e, variant.id)}
                      style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(255,51,102,0.2)', border: '1px solid rgba(255,51,102,0.4)', borderRadius: '6px', cursor: 'pointer', padding: '6px', color: 'var(--accent-red)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Delete Dataset"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    {isCV ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CVDatasetPreview scenario={scenario} variant={variant.name} mini={true} />
                      </div>
                    ) : allPreviews[variant.name] ? (
                      allPreviews[variant.name].columns?.length === 3 && scenario.model_type.toLowerCase() === 'regression' ? (
                        <Plot
                          data={[
                            {
                              x: allPreviews[variant.name].rows.map(r => r[0]),
                              y: allPreviews[variant.name].rows.map(r => r[1]),
                              z: allPreviews[variant.name].rows.map(r => r[2]),
                              type: 'scatter3d',
                              mode: 'markers',
                              marker: { color: '#00f0ff', size: 3 }
                            }
                          ]}
                          layout={{
                            autosize: true,
                            paper_bgcolor: 'transparent',
                            plot_bgcolor: 'transparent',
                            scene: {
                              xaxis: { title: allPreviews[variant.name].columns[0], backgroundcolor: 'transparent', gridcolor: '#333', tickfont: {size: 8, color: '#999'}, titlefont: {size: 10, color: '#fff'} },
                              yaxis: { title: allPreviews[variant.name].columns[1], backgroundcolor: 'transparent', gridcolor: '#333', tickfont: {size: 8, color: '#999'}, titlefont: {size: 10, color: '#fff'} },
                              zaxis: { title: allPreviews[variant.name].columns[2], backgroundcolor: 'transparent', gridcolor: '#333', tickfont: {size: 8, color: '#999'}, titlefont: {size: 10, color: '#fff'} },
                              camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                            },
                            margin: { l: 0, r: 0, b: 0, t: 0 },
                            font: { color: '#fff' },
                            showlegend: false
                          }}
                          useResizeHandler={true}
                          style={{ width: '100%', height: '100%' }}
                          config={{ displayModeBar: false, staticPlot: true }}
                        />
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                            <XAxis 
                              dataKey={allPreviews[variant.name].columns[0]} 
                              type={scenario.model_type.toLowerCase() === 'classification' && allPreviews[variant.name].columns.length === 2 ? 'category' : 'number'} 
                              hide 
                              domain={['dataMin - 10', 'dataMax + 10']}
                            />
                            <YAxis 
                              dataKey={allPreviews[variant.name].columns[allPreviews[variant.name].columns.length - 1]} 
                              type="number" 
                              hide 
                              domain={['dataMin - 10', 'dataMax + 10']}
                            />
                            <Scatter 
                              data={allPreviews[variant.name].rows.map(row => {
                                const obj = {};
                                allPreviews[variant.name].columns.forEach((col, i) => { obj[col] = row[i]; });
                                return obj;
                              })} 
                              fill="var(--accent-cyan)" 
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      )
                    ) : (
                      <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
                    )}
                  </div>
                  <div style={{ padding: '20px', textAlign: 'center', marginTop: 'auto' }}>
                    <span style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}>Graph</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* View 2: Data Review */}
        {animationStep === 'data_review' && (
          <motion.div 
            key="data_review" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <button 
                  onClick={() => onSelectVariant(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-cyan)', cursor: 'pointer', marginBottom: '10px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <ArrowLeft size={16} /> Back to Datasets
                </button>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0' }}>{scenario.variants.find(v => v.name === selectedVariant)?.label}</h1>
              </div>
              <button 
                className="btn-primary" 
                onClick={handleNextToTrain}
                disabled={loading}
                style={{ fontSize: '1.1rem', padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                Next: Train Model <ArrowRight size={18} />
              </button>
            </div>

            {/* The element morphing from the selected card */}
            <motion.div 
              layoutId={`variant-card-${selectedVariant}`} 
              className="glass-panel" 
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(15, 23, 42, 0.9)', zIndex: 10, position: 'relative' }}
            >
              {previewData && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  
                  {/* Chiti Mascot Guide */}
                  {isCV && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: 'rgba(12, 10, 24, 0.6)', padding: '20px', borderRadius: '16px', marginBottom: '20px', border: '1px solid rgba(100, 210, 255, 0.2)' }}>
                      <div style={{ background: 'linear-gradient(135deg, #10121a, #1a1c29)', padding: '15px', borderRadius: '50%', border: '2px solid rgba(100,210,255,0.4)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)', flexShrink: 0 }}>
                        <ChitiAvatar size={60} mood="think" />
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 5px', color: 'var(--accent-cyan)', fontSize: '1.2rem' }}>Chiti says:</h3>
                        <p style={{ margin: 0, color: '#e5e8f2', fontSize: '1.15rem', lineHeight: '1.5' }}>
                          {selectedVariant === 'clean' && "These are perfectly upright, clean digits. A model trained on this will expect neat handwriting!"}
                          {selectedVariant === 'messy' && "These digits are messy and slanted. This teaches the AI to handle real-world, sloppy handwriting."}
                          {selectedVariant === 'noisy' && "These digits are grainy, like a bad scan. The AI has to learn to ignore the noise and focus on the shapes."}
                          {selectedVariant === 'normal' && "These are clean, normal handwriting letters. Great for reading everyday documents."}
                          {selectedVariant === 'cursive' && "These letters are connected and flowing. Much harder for an AI to decode!"}
                          {selectedVariant === 'sobel_clean' && "This dataset uses edge detection on clean images to find the outlines."}
                          {selectedVariant === 'sobel_noisy' && "This dataset uses edge detection, but the images are noisy, which might confuse the edge detector!"}
                          {['clean', 'messy', 'noisy', 'normal', 'cursive', 'sobel_clean', 'sobel_noisy'].indexOf(selectedVariant) === -1 && "Interesting visual patterns here. Ready to train when you are."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Graph Area / Sample-data Area */}
                  <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
                    {isImageShowcase ? (
                      <div style={{ width: '100%' }}>
                        <ScenarioImageShowcase scenario={scenario} variant={selectedVariant} />
                      </div>
                    ) : isCV ? (
                      <div style={{ padding: '10px 0 4px', width: '100%' }}>
                        <h3 style={{ fontSize: '1.3rem', color: 'white', textAlign: 'center', marginBottom: '18px' }}>What this data looks like</h3>
                        <CVDatasetPreview scenario={scenario} variant={selectedVariant} />
                      </div>
                    ) : isClassification && featureCols.length > 2 ? (
                      <div style={{ width: '100%' }}>
                        <ClassParcoords rows={chartData} featureCols={featureCols} yCol={yCol} />
                      </div>
                    ) : (
                      <div style={{ height: '350px', width: '100%' }}>
                        {featureCols.length === 2 && !isClassification ? (
                          <Plot
                            data={[
                              {
                                x: chartData.map(r => r[featureCols[0]]),
                                y: chartData.map(r => r[featureCols[1]]),
                                z: chartData.map(r => r[yCol]),
                                type: 'scatter3d',
                                mode: 'markers',
                                marker: { color: '#00f0ff', size: 5, opacity: 0.8 },
                                name: 'Data Points'
                              }
                            ]}
                            layout={{
                              autosize: true,
                              paper_bgcolor: 'transparent',
                              plot_bgcolor: 'transparent',
                              scene: {
                                xaxis: { title: featureCols[0], backgroundcolor: 'transparent', gridcolor: '#333' },
                                yaxis: { title: featureCols[1], backgroundcolor: 'transparent', gridcolor: '#333' },
                                zaxis: { title: yCol, backgroundcolor: 'transparent', gridcolor: '#333' },
                                camera: { eye: { x: 1.5, y: 1.5, z: 1.5 } }
                              },
                              margin: { l: 0, r: 0, b: 0, t: 0 },
                              font: { color: '#fff' }
                            }}
                            useResizeHandler={true}
                            style={{ width: '100%', height: '100%' }}
                            config={{ displayModeBar: false }}
                          />
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 30, bottom: 25, left: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                              <XAxis 
                                dataKey={featureCols[0]} 
                                name={featureCols[0]} 
                                type="number" 
                                stroke="var(--text-secondary)" 
                                tick={{fontSize: 12}} 
                                label={{ value: featureCols[0], position: 'bottom', offset: 5, fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 'bold' }}
                              />
                              <YAxis 
                                dataKey={isClassification && featureCols.length > 1 ? featureCols[1] : yCol} 
                                name={isClassification && featureCols.length > 1 ? featureCols[1] : yCol} 
                                type={isClassification && featureCols.length === 1 ? 'category' : 'number'} 
                                stroke="var(--text-secondary)" 
                                tick={{fontSize: 12}} 
                                label={{ value: isClassification && featureCols.length > 1 ? featureCols[1] : yCol, angle: -90, position: 'insideLeft', offset: -5, fill: 'var(--text-secondary)', fontSize: 13, fontWeight: 'bold' }}
                              />
                              <Tooltip cursor={{strokeDasharray: '3 3'}} content={<CustomTooltip />} />
                              
                              {isClassification ? (
                                Object.keys(groupedData).map((label, i) => (
                                  <Scatter 
                                    key={label} 
                                    name={String(label)} 
                                    data={groupedData[label]} 
                                    fill={COLORS[i % COLORS.length]} 
                                  />
                                ))
                              ) : (
                                <Scatter name="Data Points" data={chartData} fill="var(--accent-cyan)" />
                              )}
                            </ScatterChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Dataset Explanation */}
                  <div style={{ padding: '25px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '20px', borderLeft: '5px solid var(--accent-cyan)' }}>
                    <h3 style={{ fontSize: '1.6rem', color: 'white', marginBottom: '10px' }}>What is this data?</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', lineHeight: '1.6', margin: 0 }}>
                      {scenario.variants.find(v => v.name === selectedVariant)?.description}
                    </p>
                  </div>

                  {/* Authored per-variant guidance */}
                  {scenario.variants.find(v => v.name === selectedVariant)?.watch_for && (
                    <div style={{ padding: '25px', background: 'rgba(255,159,10,0.05)', borderRadius: '12px', marginBottom: '20px', borderLeft: '5px solid #FF9F0A' }}>
                      <h3 style={{ fontSize: '1.4rem', color: '#FF9F0A', marginBottom: '10px' }}>🔎 What to watch for</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', lineHeight: '1.6', margin: 0 }}>
                        {scenario.variants.find(v => v.name === selectedVariant)?.watch_for}
                      </p>
                    </div>
                  )}

                  {/* Deep Analysis Section */}
                  {scenario?.model_type !== 'COMPUTER_VISION' && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '25px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <h3 style={{ fontSize: '1.8rem', color: 'var(--accent-purple)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={28} /> Deep Analysis
                      </h3>
                      
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        {/* Total Count */}
                        <div style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                            <Hash size={20} /> <span style={{ fontSize: '1.2rem' }}>Total Data Points</span>
                          </div>
                          <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{chartData.length}</div>
                        </div>
                        
                        {/* Feature Stats */}
                        {Object.keys(deepStats).map(colName => (
                          <div key={colName} style={{ flex: '1 1 250px', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '8px' }}>
                            <div style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', marginBottom: '15px', fontSize: '1.4rem' }}>{colName}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.2rem' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}><Minimize2 size={16}/> Min</span>
                              <span>{deepStats[colName].min}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '1.2rem' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}><Maximize2 size={16}/> Max</span>
                              <span>{deepStats[colName].max}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                              <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}><Activity size={16}/> Avg</span>
                              <span>{deepStats[colName].avg}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Interpretation Data (Bias/Descriptions) */}
                      {interpretData && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                          <div>
                            <h4 style={{ marginBottom: '15px', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>Dataset Context</h4>
                            {interpretData.column_descriptions.slice(0, 2).map(col => (
                              <div key={col.name} style={{ marginBottom: '12px' }}>
                                <strong style={{ fontSize: '1.1rem' }}>{col.name}: </strong>
                                <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{col.description}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ borderLeft: interpretData.bias_analysis.severity !== 'None' ? '3px solid var(--accent-red)' : '3px solid var(--accent-green)', paddingLeft: '20px' }}>
                            <h4 style={{ marginBottom: '15px', color: interpretData.bias_analysis.severity !== 'None' ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: '1.2rem' }}>AI Bias Check</h4>
                            <strong style={{ fontSize: '1.1rem', display: 'block', marginBottom: '5px' }}>{interpretData.bias_analysis.bias_type}</strong>
                            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', margin: 0 }}>{interpretData.bias_analysis.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* View 3: Feeding & Training */}
        {animationStep === 'feeding_training' && (
          <motion.div 
            key="feeding_training" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* The Video Model */}
            <motion.div
              layoutId="training-video-container"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{ width: '600px', borderRadius: '16px', overflow: 'hidden', border: '4px solid var(--accent-purple)', boxShadow: '0 0 40px rgba(168, 85, 247, 0.4)', zIndex: 10, background: '#000' }}
            >
              <video 
                src={trainingVideo} 
                autoPlay loop muted playsInline
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </motion.div>

            {/* Packet flying in */}
            <motion.div 
              layoutId={`variant-card-${selectedVariant}`} 
              initial={{ x: -400, scale: 0.4, opacity: 1 }}
              animate={{ x: -200, scale: 0.2, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
              className="glass-panel"
              style={{ position: 'absolute', padding: '15px 30px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent-cyan)', color: '#000', zIndex: 20 }}
            >
              <Package size={24} />
              <span style={{ fontWeight: 'bold' }}>Input Data</span>
            </motion.div>
            
            <h2 style={{ position: 'absolute', top: '10%', fontSize: '2rem', color: 'var(--accent-cyan)' }}>Training Model...</h2>

            {/* Real training reports where it actually is. `phase: features` is
                the frozen 784→128 layer turning images into numbers; `training`
                is gradient descent on the classifier head. */}
            {trainProgress && (
              <div style={{
                position: 'absolute', bottom: '12%', width: 'min(520px, 88vw)', textAlign: 'center',
                background: 'rgba(5,7,15,.8)', border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 14, padding: '18px 22px', zIndex: 30,
              }}>
                <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 600, marginBottom: 10 }}>
                  {trainProgress.phase === 'features'
                    ? `Reading image ${trainProgress.done} of ${trainProgress.total} from the ${trainProgress.variant} dataset…`
                    : trainProgress.phase === 'training'
                      ? `Learning — pass ${trainProgress.epoch} of ${trainProgress.epochs}`
                      : 'Scoring against every dataset…'}
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#00f0ff,#b200ff)',
                    transition: 'width .2s linear',
                    width: `${trainProgress.phase === 'features'
                      ? (trainProgress.done / Math.max(1, trainProgress.total)) * 100
                      : trainProgress.phase === 'training'
                        ? (trainProgress.epoch / Math.max(1, trainProgress.epochs)) * 100
                        : 100}%`,
                  }} />
                </div>
                {trainProgress.phase === 'training' && trainProgress.loss != null && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '.82rem', marginTop: 9, fontFamily: 'monospace' }}>
                    error: {trainProgress.loss.toFixed(4)} — smaller is better
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* View 4: Trained Output */}
        {animationStep === 'trained' && (
          <motion.div 
            key="trained" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* The Video Model (Still present, paused/looping) */}
            <motion.div
              layoutId="training-video-container"
              style={{ width: '600px', borderRadius: '16px', overflow: 'hidden', border: '4px solid var(--accent-green)', boxShadow: '0 0 40px rgba(74, 222, 128, 0.4)', zIndex: 10, background: '#000' }}
            >
              <video 
                src={trainingVideo} 
                autoPlay loop muted playsInline
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </motion.div>

            {/* Packet flying out */}
            <motion.div 
              layoutId="output-packet"
              initial={{ x: 0, scale: 0, opacity: 0 }}
              animate={{ x: 400, scale: 0.8, opacity: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="glass-panel"
              style={{ position: 'absolute', padding: '15px 30px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--accent-green)', color: '#000', zIndex: 20 }}
            >
              <Package size={24} />
              <span style={{ fontWeight: 'bold' }}>Trained Model</span>
            </motion.div>
            
            <h2 style={{ position: 'absolute', top: '10%', fontSize: '2rem', color: 'var(--accent-green)' }}>Training Complete!</h2>
          </motion.div>
        )}

        {/* View 5: Robot Predict */}
        {animationStep === 'robot_predict' && (
          <motion.div 
            key="robot_predict" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '15px' }}
          >
            {/* Compact Chiti Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', flexShrink: 0 }}>
              <div style={{ background: 'linear-gradient(135deg, #10121a, #1a1c29)', padding: '6px', borderRadius: '50%', border: '2px solid rgba(100,210,255,0.4)', flexShrink: 0 }}>
                <ChitiAvatar size={32} mood="cheer" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={20} color="var(--accent-cyan)" />
                  Trained on <strong style={{ color: 'var(--accent-green)' }}>{scenario.variants.find(v => v.name === selectedVariant)?.label}</strong> — test me!
                </h2>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button className="btn-secondary" onClick={() => onSelectVariant(null)} style={{ fontSize: '0.8rem', padding: '5px 12px' }}>Start Over</button>
              </div>
            </div>

            {/* Main content area */}
            <GuideProvider steps={getCVGuideSteps(canTrainInBrowser)} autoStartKey={`cvPredict-${scenario.id}`}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '16px', border: '1px solid var(--glass-border)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h4 style={{ color: 'var(--accent-green)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>
                  {PREDICTION_PROMPTS[scenario.title] || "Ask a Question"}
                </h4>
                
                {isCV ? (
                  /* ═══════ 2 or 3-COLUMN CV LAYOUT ═══════ */
                  <div style={{ display: 'grid', gridTemplateColumns: canTrainInBrowser ? '260px 1fr 280px' : '260px 1fr', gap: '15px', flex: 1, minHeight: 0 }}>
                    
                    {/* ── LEFT COLUMN: Canvas + Predict + Dataset tests ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                      {/* Drawing Canvas */}
                      <div data-guide="cv-canvas" style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <DrawingCanvas
                          scenario={scenario}
                          onImageReady={(img) => { setCvInputImage(img); setCvResult(null); setCvError(null); setCvEdgeImage(null); setCvGridData(null); }}
                          width={240}
                          height={240}
                        />
                      </div>

                      {/* Predict button — right below the canvas */}
                      <button
                        data-guide="cv-predict"
                        className="btn-primary"
                        onClick={() => runCvPrediction('drawn', null)}
                        disabled={cvBusy}
                        style={{ width: '100%', padding: '10px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '10px' }}
                      >
                        {cvBusy ? 'Processing…' : '🔍 Predict Drawing'} <Zap size={16} />
                      </button>

                      {/* Cross-dataset test buttons with thumbnails */}
                      <div data-guide="cv-presets">
                        <CVPresetTests 
                          scenario={scenario} 
                          selectedVariant={selectedVariant}
                          disabled={cvBusy}
                          onTestPreset={(variantName, imgUrl) => runCvPrediction(variantName, imgUrl)}
                        />
                      </div>

                      {cvError && (
                        <div style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.4)', color: '#ffe9c7', textAlign: 'center', fontSize: '0.8rem' }}>
                          ✏️ {cvError}
                        </div>
                      )}

                      {canTrainInBrowser && !trainMatrix && (
                        <div style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,159,10,.07)', border: '1px solid rgba(255,159,10,.35)', color: '#ffcf70', fontSize: '.7rem', lineHeight: 1.3 }}>
                          Datasets not installed — using factory model.
                        </div>
                      )}
                    </div>

                    {/* ── CENTER COLUMN: Animated Pipeline ── */}
                    <div data-guide="cv-pipeline" style={{
                      background: 'rgba(0,0,0,0.25)', borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '12px', display: 'flex', flexDirection: 'column', minHeight: 0,
                    }}>
                      {scenario.title === 'The Digit Detective' ? (
                        <AnimatedPipeline cvResult={cvResult} edgeImage={cvEdgeImage} gridData={cvGridData} />
                      ) : (
                        <GenericCVPipelineViewer cvResult={cvResult} />
                      )}
                    </div>

                    {/* ── RIGHT COLUMN: Compact Training Report ── */}
                    {canTrainInBrowser && (
                      <div data-guide="cv-report" style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
                        <TrainingReport variant={selectedVariant} matrix={trainMatrix} compact />
                      </div>
                    )}
                    </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Photo-capable scenarios: test with a real picture using the vision model */}
                    {hasPhotoTraining(scenario.title) && <PhotoPredictPanel scenario={scenario} />}

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {featureCols.map(col => (
                        <input 
                          key={col}
                          type="number" 
                          placeholder={`Enter ${col}...`}
                          id={`predict-input-${col}`}
                          style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: '#FFF', flex: 1, minWidth: '130px', fontSize: '1rem' }}
                        />
                      ))}
                      <button 
                        className="btn-primary"
                        onClick={async () => {
                          const features = {};
                          for (const col of featureCols) {
                            const val = document.getElementById(`predict-input-${col}`).value;
                            if (!val) {
                              alert(`Please enter a value for ${col}`);
                              return;
                            }
                            features[col] = Number(val);
                          }

                          try {
                            document.getElementById('predict-result').innerText = 'Thinking...';
                            const res = await api.post(`/${scenario.model_type.toLowerCase()}/predict/`, {
                              experiment_id: experimentResult.experiment_id,
                              features: features
                            });
                            document.getElementById('predict-result').innerText = `Prediction for ${yCol}: ${res.data.prediction.toFixed ? res.data.prediction.toFixed(2) : res.data.prediction}`;
                          } catch (e) {
                            document.getElementById('predict-result').innerText = `Error: ${e.response?.data?.error || e.message}`;
                          }
                        }}
                        style={{ padding: '12px 25px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        Predict <Zap size={18} />
                      </button>
                    </div>
                    <div style={{ marginTop: '20px', minHeight: '30px' }}>
                      <strong id="predict-result" style={{ fontSize: '1.4rem', color: 'var(--accent-green)' }}></strong>
                    </div>
                    <div style={{ marginTop: '15px', textAlign: 'right' }}>
                      <button 
                        className="btn-secondary" 
                        onClick={() => onSelectVariant(null)}
                        style={{ fontSize: '0.9rem', padding: '6px 16px' }}
                      >
                        Start Over
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </GuideProvider>
          </motion.div>
        )}

        {/* View 6: Error */}
        {animationStep === 'error' && (
          <motion.div 
            key="error" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <div className="glass-panel" style={{ padding: '40px', maxWidth: '600px', textAlign: 'center', border: '1px solid var(--accent-red)' }}>
              <AlertTriangle size={60} color="var(--accent-red)" style={{ marginBottom: '20px' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '15px', color: 'var(--accent-red)' }}>Training Failed</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '30px' }}>
                Oops! The model encountered an error during training: <br/><br/>
                <strong style={{ color: '#fff', background: 'rgba(255, 51, 102, 0.1)', padding: '10px', borderRadius: '8px', display: 'inline-block' }}>{experimentError}</strong>
              </p>
              <button 
                className="btn-primary"
                onClick={() => setAnimationStep('data_review')}
                style={{ fontSize: '1.1rem', padding: '10px 30px' }}
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
};

// ── In-browser CV pipeline stages (shared visual with the CV playground) ──
function CVStages({ stages = [], highlight }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
      {stages.map((st, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: 16 }}>
          <h4 style={{ color: 'var(--accent-cyan)', margin: '0 0 8px', fontSize: '1rem' }}>{i + 1} · {st.title}</h4>
          {st.image && <img src={st.image} alt={st.title} style={{ width: '100%', borderRadius: 8, margin: '4px 0 8px', imageRendering: 'pixelated' }} />}
          {st.text && <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: '10px 12px', margin: '4px 0 8px', wordBreak: 'break-word' }}>{st.text}</div>}
          {st.bars && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, margin: '6px 0 10px' }}>
              {st.bars.map((b, j) => (
                <div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', borderRadius: 3, height: `${Math.max(3, b.value * 82)}px`, background: j === highlight ? 'linear-gradient(180deg,#30d158,#0a84ff)' : 'rgba(255,255,255,0.2)' }} />
                  <span style={{ fontSize: '0.68rem', color: j === highlight ? '#30d158' : 'var(--text-secondary)', fontWeight: j === highlight ? 700 : 400 }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{st.description}</p>
        </div>
      ))}
    </div>
  );
}

// ── Parallel-coordinates view for classification with many features ──
// A 2-D scatter can only show 2 columns; parallel coordinates show every
// feature at once, one vertical axis each, lines coloured by their class.
function ClassParcoords({ rows, featureCols, yCol }) {
  const labels = useMemo(() => [...new Set(rows.map(r => r[yCol]))], [rows, yCol]);
  const idxOf = useMemo(() => labels.reduce((m, l, i) => { m[l] = i; return m; }, {}), [labels]);
  const n = labels.length;
  const colorVals = rows.map(r => idxOf[r[yCol]]);
  const colorscale = n <= 1
    ? [[0, PLOTLY_COLORS[0]], [1, PLOTLY_COLORS[0]]]
    : labels.map((l, i) => [i / (n - 1), PLOTLY_COLORS[i % PLOTLY_COLORS.length]]);

  return (
    <div style={{ width: '100%' }}>
      <Plot
        data={[{
          type: 'parcoords',
          line: { color: colorVals, colorscale, cmin: 0, cmax: Math.max(1, n - 1), showscale: false },
          dimensions: featureCols.map(col => ({
            label: col,
            values: rows.map(r => r[col]),
          })),
        }]}
        layout={{
          autosize: true,
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#c9cde0', size: 11 },
          margin: { l: 70, r: 50, t: 40, b: 24 },
        }}
        useResizeHandler
        style={{ width: '100%', height: '320px' }}
        config={{ displayModeBar: false }}
      />
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 }}>
        {labels.map((l, i) => (
          <span key={String(l)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: PLOTLY_COLORS[i % PLOTLY_COLORS.length] }} />
            {String(l)}
          </span>
        ))}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', marginTop: 8 }}>
        Each vertical line is one feature. Every data point is a thread crossing all of them, coloured by its class. Drag an axis to reorder, or drag along an axis to filter.
      </p>
    </div>
  );
}

export default DataCanvas;
