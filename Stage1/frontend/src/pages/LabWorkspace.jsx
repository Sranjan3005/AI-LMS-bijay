import React, { useState, useEffect } from 'react';
import DataCanvas from '../components/workspace/DataCanvas';
import ResultsOverlay from '../components/workspace/ResultsOverlay';
import CVPipelineOverlay from '../components/workspace/CVPipelineOverlay';
import api from '../api';
import { ArrowLeft, Beaker } from 'lucide-react';

const LabWorkspace = ({ onBackToDashboard, initialCategory }) => {
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const [experimentResult, setExperimentResult] = useState(null);
  const [experimentError, setExperimentError] = useState(null);
  const [isTraining, setIsTraining] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Auto-scroll to initialCategory on mount
  useEffect(() => {
    if (!selectedScenario && initialCategory && scenarios.length > 0) {
      setTimeout(() => {
        document.getElementById(`category-${initialCategory}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedScenario, initialCategory, scenarios]);

  const fetchScenarios = async () => {
    try {
      const response = await api.get('/scenarios/');
      // We fetch ALL scenarios, not filtered by activeModule
      setScenarios(response.data);
      if (selectedScenario) {
        const updated = response.data.find(s => s.id === selectedScenario.id);
        // Only update if it actually changed to prevent infinite loops if called from elsewhere
        if (updated && JSON.stringify(updated) !== JSON.stringify(selectedScenario)) {
          setSelectedScenario(updated);
        }
      }
    } catch (err) {
      console.error("Failed to fetch scenarios", err);
    }
  };

  // Fetch all scenarios on mount
  useEffect(() => {
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (selectedScenario && selectedVariant) {
      fetchPreview();
    }
  }, [selectedScenario, selectedVariant]);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const response = await api.get(`/${selectedScenario.model_type.toLowerCase()}/preview/`, {
        params: {
          scenario_id: selectedScenario.id,
          variant_name: selectedVariant
        }
      });
      setPreviewData(response.data);
    } catch (err) {
      console.error("Failed to fetch preview", err);
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
        ...extraPayload
      });

      if (response.data.task_id) {
        while (true) {
          const statusRes = await api.get(`/${selectedScenario.model_type.toLowerCase()}/run-status/`, {
            params: { task_id: response.data.task_id }
          });
          
          if (statusRes.data.status === 'completed') {
            response = { data: statusRes.data.result };
            break;
          } else if (statusRes.data.status === 'failed') {
            throw new Error(statusRes.data.error || 'Experiment failed during background processing.');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      setExperimentResult(response.data);
      setShowResults(true);
    } catch (err) {
      console.error("Experiment failed", err);
      setExperimentError(err.response?.data?.error || err.message);
    } finally {
      setIsTraining(false);
    }
  };

  if (!selectedScenario) {
    const allCategories = [...new Set(scenarios.map(s => s.model_type))];
    const preferredOrder = ['REGRESSION', 'CLASSIFICATION', 'NEURAL_NETWORK', 'COMPUTER_VISION'];
    const uniqueCategories = allCategories.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a);
      const indexB = preferredOrder.indexOf(b);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* FIXED TOP NAV */}
        <div style={{
          background: 'rgba(10, 15, 30, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '20px 40px',
          borderBottom: '1px solid var(--glass-border)',
          zIndex: 10,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <button className="btn-secondary" onClick={onBackToDashboard} style={{ marginBottom: '10px' }}>
                <ArrowLeft size={18} /> Back to Dashboard
              </button>
              <h1 style={{ fontSize: '2.2rem', margin: 0 }}>
                <Beaker size={32} style={{ verticalAlign: 'middle', marginRight: '10px' }} /> Prediction Engine
              </h1>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {uniqueCategories.map(cat => (
                <button
                  key={`nav-${cat}`}
                  onClick={() => {
                    document.getElementById(`category-${cat}`)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="btn-secondary"
                  style={{
                    background: 'rgba(0, 240, 255, 0.1)',
                    borderColor: 'rgba(0, 240, 255, 0.3)',
                    color: '#00F0FF'
                  }}
                >
                  {cat.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTENT */}
        <div style={{ padding: '40px', flex: 1, overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '40px', fontSize: '1.1rem' }}>
            Select an experiment below to start training AI models!
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '50px' }}>
            {uniqueCategories.map(cat => {
              const catScenarios = scenarios.filter(s => s.model_type === cat);
              return (
                <div key={cat} id={`category-${cat}`}>
                  <h2 style={{ 
                    fontSize: '1.8rem', 
                    marginBottom: '20px', 
                    paddingBottom: '10px', 
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--accent-cyan)'
                  }}>
                    {cat.replace(/_/g, ' ')}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {catScenarios.map(scenario => (
                      <div 
                        key={scenario.id}
                        className="glass-panel"
                        onClick={() => {
                          setSelectedScenario(scenario);
                          setSelectedVariant(null);
                          setPreviewData(null);
                        }}
                        style={{
                          cursor: 'pointer',
                          padding: '20px',
                          transition: 'transform 0.2s',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '3rem' }}>{scenario.icon}</div>
                        <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{scenario.title}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: 'bold' }}>
                          {scenario.model_type.replace(/_/g, ' ')}
                        </span>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>{scenario.challenge}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      
      {/* Top Header with Back Button */}
      <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', background: 'rgba(10, 15, 30, 0.8)' }}>
        <button 
          className="btn-secondary" 
          onClick={() => setSelectedScenario(null)}
          style={{ padding: '8px 15px', marginRight: '20px' }}
        >
          <ArrowLeft size={18} /> Back to Scenarios
        </button>
        <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {selectedScenario.icon} {selectedScenario.title}
        </h2>
      </div>

      {/* Main Data Canvas */}
      <div style={{ flex: 1, position: 'relative', overflowY: 'auto' }}>
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

        {/* OVERLAY: Results frosted glass card */}
        {showResults && experimentResult && (
          selectedScenario?.model_type === 'COMPUTER_VISION' ? (
            <CVPipelineOverlay 
              result={experimentResult} 
              onClose={() => setShowResults(false)} 
            />
          ) : (
            <ResultsOverlay 
              result={experimentResult} 
              onClose={() => setShowResults(false)} 
            />
          )
        )}
      </div>

    </div>
  );
};

export default LabWorkspace;
