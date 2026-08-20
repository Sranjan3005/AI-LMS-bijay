import React from 'react';
import { Activity, LayoutGrid, BrainCircuit, ArrowLeft } from 'lucide-react';

const TimelineSidebar = ({ 
  activeModule, setActiveModule, 
  scenarios, selectedScenario, onSelectScenario,
  onBackToDashboard
}) => {

  const modules = [
    { id: 'regression', icon: Activity, label: 'Regression' },
    { id: 'classification', icon: LayoutGrid, label: 'Classification' },
    { id: 'neural_network', icon: BrainCircuit, label: 'Neural Networks' }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', background: 'var(--bg-panel)' }}>
      {/* Header & Back Button */}
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={onBackToDashboard}
          style={{ 
            background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px', fontSize: '0.9rem'
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <img 
            src="/ai_sidebar_img.png" 
            alt="AI Brain" 
            style={{ width: '100px', height: '100px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: '10px' }} 
          />
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--accent-cyan)', textAlign: 'center' }}>Prediction Engine</h2>
      </div>

      {/* Module Selector */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '15px' }}>Model Types</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {modules.map(mod => {
            const isActive = activeModule === mod.id;
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px', borderRadius: '8px', border: 'none',
                  background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.2s',
                  fontWeight: isActive ? '600' : '400'
                }}
              >
                <Icon size={18} />
                <span style={{ fontFamily: 'Outfit' }}>{mod.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Scenario List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '15px' }}>Experiments</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scenarios.map(scenario => {
            const isSelected = selectedScenario?.id === scenario.id;
            return (
              <div 
                key={scenario.id}
                onClick={() => onSelectScenario(scenario)}
                style={{
                  padding: '12px', borderRadius: '8px', cursor: 'pointer',
                  background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  borderLeft: isSelected ? '3px solid var(--accent-purple)' : '3px solid transparent'
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: isSelected ? '600' : '400' }}>
                  {scenario.title}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  );
};

export default TimelineSidebar;
