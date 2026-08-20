import React, { useState, useEffect, useRef } from 'react';
import DataCanvas from '../components/workspace/DataCanvas';
import ResultsOverlay from '../components/workspace/ResultsOverlay';
import CVPipelineOverlay from '../components/workspace/CVPipelineOverlay';
import ScenarioPreviewStrip from '../components/workspace/ScenarioPreviewStrip';
import api from '../api';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// Per-model presentation for the scoped scenario picker. Each landing-page
// model module opens straight into ITS scenarios — no shared "Prediction Engine".
const MODEL_META = {
  REGRESSION:      { title: 'Regression', tag: 'Predict a number', sub: 'Pick a real-world problem and train a model to predict a number — then see how good its predictions are.', accent: '#30D158', grad: 'linear-gradient(135deg,#30D158,#00C7BE)' },
  CLASSIFICATION:  { title: 'Classification', tag: 'Sort into groups', sub: 'Pick a problem and train a model to sort things into the right category — and watch where it gets fooled.', accent: '#00C7BE', grad: 'linear-gradient(135deg,#00C7BE,#0A84FF)' },
  NEURAL_NETWORK:  { title: 'Neural Networks', tag: 'A brain-inspired model', sub: 'Train a network of tiny decision-makers and watch its accuracy climb as it practises.', accent: '#0A84FF', grad: 'linear-gradient(135deg,#0A84FF,#5E5CE6)' },
  COMPUTER_VISION: { title: 'Computer Vision', tag: 'Teach a machine to see', sub: 'Draw or upload, and watch the AI turn pixels into an answer, stage by stage.', accent: '#FF9F0A', grad: 'linear-gradient(135deg,#FF9F0A,#FF375F)' },
};

const LabWorkspace = ({ onBackToDashboard, modelType, initialCategory, initialScenarioId }) => {
  const filterType = modelType || initialCategory || null;
  const autoSelectedRef = useRef(false);
  const meta = MODEL_META[filterType] || { title: 'Scenarios', tag: '', sub: 'Pick a scenario to train a model.', accent: '#5E5CE6', grad: 'linear-gradient(135deg,#5E5CE6,#BF5AF2)' };

  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [experimentResult, setExperimentResult] = useState(null);
  const [experimentError, setExperimentError] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const fetchScenarios = async () => {
    try {
      const response = await api.get('/scenarios/');
      const list = filterType ? response.data.filter(s => s.model_type === filterType) : response.data;
      setScenarios(list);
      // Deep-link: arriving from "train your own data" opens straight into that scenario.
      if (initialScenarioId && !autoSelectedRef.current) {
        const target = list.find(s => s.id === initialScenarioId);
        if (target) {
          autoSelectedRef.current = true;
          setSelectedScenario(target);
          setSelectedVariant(null);
          setPreviewData(null);
        }
      }
      if (selectedScenario) {
        const updated = list.find(s => s.id === selectedScenario.id);
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedScenario)) setSelectedScenario(updated);
      }
    } catch (err) {
      console.error('Failed to fetch scenarios', err);
    }
  };

  useEffect(() => { fetchScenarios(); }, []);

  useEffect(() => {
    if (selectedScenario && selectedVariant) fetchPreview();
  }, [selectedScenario, selectedVariant]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const response = await api.get(`/${selectedScenario.model_type.toLowerCase()}/preview/`, {
        params: { scenario_id: selectedScenario.id, variant_name: selectedVariant },
      });
      setPreviewData(response.data);
    } catch (err) {
      console.error('Failed to fetch preview', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleRunModel = async (extraPayload = {}) => {
    setIsTraining(true);
    setShowResults(false);
    setExperimentResult(null);
    setExperimentError(null);
    try {
      let response = await api.post(`/${selectedScenario.model_type.toLowerCase()}/run/`, {
        scenario_id: selectedScenario.id,
        variant_name: selectedVariant,
        student_prompt: '',
        ...extraPayload,
      });
      if (response.data.task_id) {
        while (true) {
          const statusRes = await api.get(`/${selectedScenario.model_type.toLowerCase()}/run-status/`, {
            params: { task_id: response.data.task_id },
          });
          if (statusRes.data.status === 'completed') { response = { data: statusRes.data.result }; break; }
          if (statusRes.data.status === 'failed') throw new Error(statusRes.data.error || 'Experiment failed during background processing.');
          await new Promise(r => setTimeout(r, 1500));
        }
      }
      setExperimentResult(response.data);
      setShowResults(true);
    } catch (err) {
      console.error('Experiment failed', err);
      setExperimentError(err.response?.data?.error || err.message);
    } finally {
      setIsTraining(false);
    }
  };

  // ── Scoped scenario picker (agentic-style cards, Sutra dark) ──
  if (!selectedScenario) {
    return (
      <div style={pageStyle}>
        <div style={headerBarStyle}>
          <button style={{ ...backStyle, margin: 0 }} onClick={onBackToDashboard}><ArrowLeft size={16} /> Back to my flow</button>
        </div>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(16px,4vw,56px)' }}>
          <div style={{ textAlign: 'center', margin: '10px 0 34px' }}>
            <span style={{ ...eyebrowStyle, color: meta.accent }}>{meta.tag}</span>
            <h1 style={{ fontSize: 'clamp(1.9rem,3.4vw,2.6rem)', margin: '10px 0 8px', fontWeight: 700 }}>
              <span style={{ background: meta.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{meta.title}</span> scenarios
            </h1>
            <p style={{ color: '#9aa0b5', maxWidth: 560, margin: '0 auto', lineHeight: 1.6 }}>{meta.sub}</p>
          </div>

          {scenarios.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9aa0b5' }}>Loading scenarios…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 22 }}>
              {scenarios.map(sc => (
                <button key={sc.id} onClick={() => { setSelectedScenario(sc); setSelectedVariant(null); setPreviewData(null); }}
                  style={cardStyle}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = `${meta.accent}66`; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                  <div style={{ ...cardIcon, background: `${meta.accent}22` }}>{sc.icon}</div>
                  <h3 style={{ fontSize: '1.35rem', margin: '0 0 8px' }}>{sc.title}</h3>
                  <p style={{ color: '#9aa0b5', lineHeight: 1.55, fontSize: '0.95rem', flex: 1, margin: 0 }}>{sc.challenge}</p>
                  <ScenarioPreviewStrip title={sc.title} accent={meta.accent} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: meta.accent, fontWeight: 600, marginTop: 16 }}>
                    Start this scenario <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Selected scenario: the training canvas ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#070812' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', background: 'rgba(10,12,26,0.9)' }}>
        <button style={{ ...backStyle, margin: 0, marginRight: 20 }} onClick={() => setSelectedScenario(null)}>
          <ArrowLeft size={16} /> Back to {meta.title} scenarios
        </button>
        <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedScenario.icon} {selectedScenario.title}
        </h2>
      </div>

      <div data-scroll style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
        <DataCanvas
          scenario={selectedScenario}
          selectedVariant={selectedVariant}
          onSelectVariant={setSelectedVariant}
          previewData={previewData}
          loading={loadingPreview}
          onRunModel={handleRunModel}
          isTraining={isTraining}
          experimentResult={experimentResult}
          experimentError={experimentError}
          onRefreshScenarios={fetchScenarios}
        />
        {showResults && experimentResult && (
          selectedScenario?.model_type === 'COMPUTER_VISION' ? (
            <CVPipelineOverlay result={experimentResult} scenario={selectedScenario} onClose={() => setShowResults(false)} />
          ) : (
            <ResultsOverlay result={experimentResult} scenario={selectedScenario} onClose={() => setShowResults(false)} />
          )
        )}
      </div>
    </div>
  );
};

const pageStyle = {
  minHeight: '100vh',
  background: 'radial-gradient(1200px 600px at 80% -10%, rgba(94,92,230,0.16), transparent 60%), radial-gradient(900px 500px at -10% 30%, rgba(100,210,255,0.10), transparent 55%), #070812',
  color: '#f2f3f8',
  fontFamily: "'Outfit','Segoe UI',sans-serif",
  padding: '0 0 80px',
};
const headerBarStyle = {
  position: 'sticky', top: 0, zIndex: 50,
  display: 'flex', alignItems: 'center',
  padding: '14px clamp(16px,4vw,56px)',
  background: 'rgba(7,8,18,0.82)', backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(255,255,255,0.07)',
  marginBottom: 24,
};
const backStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)', color: '#cdd1e0', padding: '9px 16px', borderRadius: 10,
  cursor: 'pointer', fontSize: '0.92rem', fontFamily: 'inherit',
};
const eyebrowStyle = { display: 'inline-flex', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 };
const cardStyle = {
  background: 'rgba(16,18,32,0.72)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18,
  padding: 28, cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', textAlign: 'left',
  display: 'flex', flexDirection: 'column', color: '#f2f3f8', fontFamily: 'inherit',
};
const cardIcon = {
  width: 58, height: 58, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '2rem', marginBottom: 16,
};

export default LabWorkspace;
