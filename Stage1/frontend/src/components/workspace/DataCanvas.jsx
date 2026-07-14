import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Database, Zap, AlertTriangle, Package, Bot, ArrowRight, ArrowLeft, BarChart2, Hash, Maximize2, Minimize2, Activity, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import api from '../../api';
import trainingVideo from '../../assets/training_video.mp4';
import DrawingCanvas from './DrawingCanvas';
import { runDigitPipeline } from '../../lib/cv/digit';
import { runEdgePipeline } from '../../lib/cv/edge';
import { runOcrPipeline } from '../../lib/cv/ocr';
import { canvasFromDataURL } from '../../lib/cv/imageOps';

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
  // Client-side CV prediction (runs in-browser, no backend)
  const [cvResult, setCvResult] = useState(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvError, setCvError] = useState(null);

  // Animation states: 'selection', 'data_review', 'feeding_training', 'trained', 'robot_predict', 'error'
  const [animationStep, setAnimationStep] = useState('selection');
  const rootRef = useRef(null);

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

  const runCvPrediction = async () => {
    if (!cvInputImage) { alert('Please draw something on the canvas first!'); return; }
    setCvBusy(true); setCvError(null); setCvResult(null);
    try {
      const srcCanvas = await canvasFromDataURL(cvInputImage);
      const pipeline = CV_PIPELINES[scenario.title] || runDigitPipeline;
      const res = await pipeline(srcCanvas);
      if (res?.ok) setCvResult(res);
      else setCvError(res?.message || (res?.reason === 'blank'
        ? 'Draw something bigger and bolder, then try again!'
        : 'The vision model could not read that — try a clearer drawing.'));
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

  const handleNextToTrain = () => {
    setAnimationStep('feeding_training');
    if (scenario?.model_type === 'COMPUTER_VISION') {
      // Simulate training for CV since backend trains lazily on prediction
      setTimeout(() => {
        setAnimationStep('trained');
        setTimeout(() => {
          setAnimationStep('robot_predict');
        }, 2000);
      }, 3000);
    } else {
      onRunModel();
    }
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
                    {allPreviews[variant.name] ? (
                      allPreviews[variant.name].input_type === 'canvas' ? (
                        <div style={{ padding: '10px' }}>
                          {allPreviews[variant.name].sample_image ? (
                            <img src={`data:image/png;base64,${allPreviews[variant.name].sample_image}`} alt="Sample" style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '8px', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ color: 'var(--text-secondary)' }}>Draw directly on the canvas!</div>
                          )}
                        </div>
                      ) : (
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
                  
                  {/* Graph Area / Sample-data Area */}
                  <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'center' }}>
                    {isCV ? (
                      <div style={{ padding: '10px 0 4px', width: '100%' }}>
                        <h3 style={{ fontSize: '1.3rem', color: 'white', textAlign: 'center', marginBottom: '18px' }}>What this data looks like</h3>
                        <CVSampleGallery scenario={scenario} />
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
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
          >
            <motion.div 
              layoutId="output-packet"
              className="glass-panel"
              style={{ maxWidth: '1040px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px', borderRadius: '24px', background: 'rgba(15, 23, 42, 0.95)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '30px' }}>
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  style={{ 
                    width: '100px', height: '100px', borderRadius: '50%', 
                    background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-green))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    boxShadow: '0 10px 30px rgba(74, 222, 128, 0.3)'
                  }}>
                  <Bot size={50} color="#000" />
                </motion.div>

                <div style={{ flex: 1 }}>
                  <h2 style={{ marginBottom: '15px', fontSize: '1.8rem', color: 'var(--text-primary)' }}>Hi! I'm your trained model. 🤖</h2>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '25px', fontSize: '1.1rem' }}>
                    I've reviewed the <strong>{scenario.variants.find(v => v.name === selectedVariant)?.label}</strong> dataset and found the underlying patterns. 
                    Give me some new feature values below, and I'll predict the outcome!
                  </p>

                  <div style={{ background: 'rgba(0,0,0,0.4)', padding: '25px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                    <h4 style={{ color: 'var(--accent-green)', marginBottom: '15px', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.9rem' }}>
                      {PREDICTION_PROMPTS[scenario.title] || "Ask a Question"}
                    </h4>
                    
                    {isCV ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                          <DrawingCanvas
                            scenario={scenario}
                            onImageReady={(img) => { setCvInputImage(img); setCvResult(null); setCvError(null); }}
                            width={280}
                            height={280}
                          />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <button
                            className="btn-primary"
                            onClick={runCvPrediction}
                            disabled={cvBusy}
                            style={{ padding: '12px 30px', fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                          >
                            {cvBusy ? 'Reading the pixels…' : 'Predict'} <Zap size={18} />
                          </button>
                        </div>

                        {cvError && (
                          <div style={{ marginTop: '20px', padding: '14px 18px', borderRadius: '12px', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.4)', color: '#ffe9c7', textAlign: 'center' }}>
                            ✏️ {cvError}
                          </div>
                        )}

                        {cvResult && (
                          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '24px' }}>
                            <div style={{ padding: '16px 20px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,240,255,0.08))', border: '1px solid rgba(0,255,136,0.3)', fontSize: '1.15rem', fontWeight: 600, textAlign: 'center', marginBottom: '18px' }}>
                              🎯 {cvResult.prediction || (cvResult.digit != null ? `It reads: ${cvResult.digit} — ${cvResult.confidence}% confident` : 'Done!')}
                            </div>
                            <CVStages stages={cvResult.stages} highlight={cvResult.digit} />
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>

                  <div style={{ marginTop: '25px', textAlign: 'right' }}>
                    <button 
                      className="btn-secondary" 
                      onClick={() => onSelectVariant(null)}
                      style={{ fontSize: '1rem' }}
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
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

// ── Sample-data gallery: shows what the training data actually looks like ──
// (varied handwriting / shapes), the CV analogue of showing the chart for
// regression scenarios.
function drawShape(ctx, shape, size) {
  const c = size / 2, r = size * 0.32;
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(c, c, r, 0, Math.PI * 2);
  } else if (shape === 'square') {
    ctx.rect(c - r, c - r, r * 2, r * 2);
  } else if (shape === 'triangle') {
    ctx.moveTo(c, c - r); ctx.lineTo(c + r, c + r); ctx.lineTo(c - r, c + r); ctx.closePath();
  } else if (shape === 'star') {
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const x = c + rad * Math.cos(a), y = c + rad * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
  }
  ctx.stroke();
}

function SampleTile({ spec, size = 104 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    if (spec.rotate) ctx.rotate((spec.rotate * Math.PI) / 180);
    if (spec.type === 'glyph') {
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${spec.weight || 'bold'} ${spec.fontSize || 58}px ${spec.font}`;
      ctx.fillText(spec.text, 0, spec.dy || 0);
    } else {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      drawShape(ctx, spec.shape, size);
    }
    ctx.restore();
  }, [spec, size]);
  return (
    <div style={{ textAlign: 'center' }}>
      <canvas ref={ref} width={size} height={size} style={{ width: size, height: size, borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: '#000' }} />
      {spec.caption && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 6 }}>{spec.caption}</div>}
    </div>
  );
}

function buildSampleSpecs(title) {
  if (title === 'The Edge Explorer') {
    return [
      { type: 'shape', shape: 'circle', caption: 'circle' },
      { type: 'shape', shape: 'square', caption: 'square', rotate: 8 },
      { type: 'shape', shape: 'triangle', caption: 'triangle' },
      { type: 'shape', shape: 'star', caption: 'star', rotate: -6 },
    ];
  }
  if (title === 'The Handwriting Decoder') {
    const word = 'Sutra';
    return [
      { type: 'glyph', text: word, font: "'Courier New', monospace", fontSize: 28, caption: 'neat print' },
      { type: 'glyph', text: word, font: 'Georgia, serif', fontSize: 30, caption: 'serif', rotate: -3 },
      { type: 'glyph', text: word, font: "'Comic Sans MS', cursive", fontSize: 28, caption: 'rounded', rotate: 4 },
      { type: 'glyph', text: word, font: "'Segoe Script', 'Brush Script MT', cursive", weight: 'normal', fontSize: 30, caption: 'cursive', rotate: -5 },
    ];
  }
  // The Digit Detective (default): the same digit in many handwriting styles
  const fonts = [
    { font: "'Courier New', monospace", rotate: 0 },
    { font: 'Georgia, serif', rotate: -10 },
    { font: "'Comic Sans MS', cursive", rotate: 8 },
    { font: "'Segoe Script', 'Brush Script MT', cursive", rotate: -6, weight: 'normal' },
    { font: 'Impact, sans-serif', rotate: 5 },
    { font: "'Trebuchet MS', sans-serif", rotate: -4 },
  ];
  return [3, 7, 2, 5, 8, 4].map((d, i) => ({
    type: 'glyph', text: String(d), fontSize: 60, ...fonts[i], caption: `style ${i + 1}`,
  }));
}

function CVSampleGallery({ scenario }) {
  const specs = useMemo(() => buildSampleSpecs(scenario?.title), [scenario?.title]);
  const isDigits = scenario?.title === 'The Digit Detective';
  const isWords = scenario?.title === 'The Handwriting Decoder';
  const caption = isDigits
    ? 'The model learned from 60,000 handwritten digits — every one written by a different hand. Here are a few styles it studied. Yours just joins the collection.'
    : isWords
      ? 'OCR grows up on samples like these — from neat print to flowing cursive. Notice how the joined-up styles are the hardest to cut into separate letters.'
      : 'Edge detection needs no training data at all — it is pure maths. These are the kinds of shapes you can trace: sharp outlines are its favourite food.';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {specs.map((sp, i) => <SampleTile key={i} spec={sp} />)}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, textAlign: 'center', maxWidth: 620, margin: '16px auto 0' }}>{caption}</p>
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
