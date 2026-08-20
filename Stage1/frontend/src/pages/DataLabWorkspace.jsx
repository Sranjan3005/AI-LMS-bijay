import React, { useState, useEffect } from 'react';
import DataLabCanvas from '../components/workspace/DataLabCanvas';
import ScenarioPreviewStrip from '../components/workspace/ScenarioPreviewStrip';
import api from '../api';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// "Train on your own data" — a module-scoped picker for collecting/creating
// custom data, styled to match the Sutra look (no shared "Data Lab" hub).
const MODEL_META = {
  REGRESSION:      { title: 'Regression', accent: '#30D158', grad: 'linear-gradient(135deg,#30D158,#00C7BE)' },
  CLASSIFICATION:  { title: 'Classification', accent: '#00C7BE', grad: 'linear-gradient(135deg,#00C7BE,#0A84FF)' },
  NEURAL_NETWORK:  { title: 'Neural Networks', accent: '#0A84FF', grad: 'linear-gradient(135deg,#0A84FF,#5E5CE6)' },
  COMPUTER_VISION: { title: 'Computer Vision', accent: '#FF9F0A', grad: 'linear-gradient(135deg,#FF9F0A,#FF375F)' },
};

const DataLabWorkspace = ({ onBackToDashboard, modelType, initialCategory, onOpenDemonstration }) => {
  const filterType = modelType || initialCategory || null;
  const meta = MODEL_META[filterType] || { title: 'Scenarios', accent: '#64D2FF', grad: 'linear-gradient(135deg,#64D2FF,#0A84FF)' };
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);

  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        const response = await api.get('/scenarios/');
        setScenarios(filterType ? response.data.filter(s => s.model_type === filterType) : response.data);
      } catch (err) {
        console.error('Failed to fetch scenarios', err);
      }
    };
    fetchScenarios();
  }, []);

  if (!selectedScenario) {
    return (
      <div style={pageStyle}>
        <div style={headerBarStyle}>
          <button style={{ ...backStyle, margin: 0 }} onClick={onBackToDashboard}><ArrowLeft size={16} /> Back to my flow</button>
        </div>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(16px,4vw,56px)' }}>
          <div style={{ textAlign: 'center', margin: '10px 0 34px' }}>
            <span style={{ ...eyebrowStyle, color: meta.accent }}>Bring your own data</span>
            <h1 style={{ fontSize: 'clamp(1.9rem,3.4vw,2.6rem)', margin: '10px 0 8px', fontWeight: 700 }}>
              Train <span style={{ background: meta.grad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{meta.title}</span> on your own data
            </h1>
            <p style={{ color: '#9aa0b5', maxWidth: 580, margin: '0 auto', lineHeight: 1.6 }}>
              Pick a problem, then create or collect your own data for it — and feed it straight into a model you train.
            </p>
          </div>

          {scenarios.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#9aa0b5' }}>Loading scenarios…</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 22 }}>
              {scenarios.map(sc => (
                <button key={sc.id} onClick={() => setSelectedScenario(sc)}
                  style={cardStyle}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.borderColor = `${meta.accent}66`; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}>
                  <div style={{ ...cardIcon, background: `${meta.accent}22` }}>{sc.icon}</div>
                  <h3 style={{ fontSize: '1.35rem', margin: '0 0 8px' }}>{sc.title}</h3>
                  <p style={{ color: '#9aa0b5', lineHeight: 1.55, fontSize: '0.95rem', flex: 1, margin: 0 }}>{sc.challenge}</p>
                  <ScenarioPreviewStrip title={sc.title} accent={meta.accent} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: meta.accent, fontWeight: 600, marginTop: 16 }}>
                    Collect my own data <ArrowRight size={16} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#070812' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', background: 'rgba(10,12,26,0.9)' }}>
        <button style={{ ...backStyle, margin: 0, marginRight: 20 }} onClick={() => setSelectedScenario(null)}>
          <ArrowLeft size={16} /> Back to {meta.title} scenarios
        </button>
        <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedScenario.icon} {selectedScenario.title} — your data
        </h2>
      </div>
      <div data-scroll style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
        <DataLabCanvas scenario={selectedScenario} onBackToDashboard={onBackToDashboard} onOpenDemonstration={onOpenDemonstration} />
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

export default DataLabWorkspace;
