import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Search, Zap, ShieldAlert, Cpu } from 'lucide-react';
import AgenticWorkspace from './AgenticWorkspace';

const SCENARIOS = [
  {
    id: 'fake-news',
    title: 'Fake News Detective',
    description: 'An AI pipeline that reads an article, checks sentiment, and searches the web to verify facts.',
    icon: <ShieldAlert size={24} color="#ef4444" />,
    color: '#ef4444',
    nodes: [
      { id: 'node_1', type: 'textInput', position: { x: 100, y: 100 }, data: { label: 'Article Text' } },
      { id: 'node_2', type: 'sentimentRadar', position: { x: 400, y: 50 }, data: { label: 'Analyze Sentiment' } },
      { id: 'node_3', type: 'webSearch', position: { x: 400, y: 200 }, data: { label: 'Fact Check' } },
      { id: 'node_4', type: 'merger', position: { x: 700, y: 125 }, data: { label: 'Combine Results' } },
      { id: 'node_5', type: 'customizer', position: { x: 900, y: 125 }, data: { label: 'Verdict Generator', prompt: 'Determine if this is fake news based on sentiment and facts.' } },
      { id: 'node_6', type: 'display', position: { x: 1200, y: 125 }, data: { label: 'Final Output' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e1-3', source: 'node_1', target: 'node_3' },
      { id: 'e2-4', source: 'node_2', target: 'node_4' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' },
      { id: 'e4-5', source: 'node_4', target: 'node_5' },
      { id: 'e5-6', source: 'node_5', target: 'node_6' }
    ]
  },
  {
    id: 'wildlife-drone',
    title: 'Wildlife Rescue Drone',
    description: 'Processes images from drones to identify endangered animals and alert nearby rangers.',
    icon: <Zap size={24} color="#eab308" />,
    color: '#eab308',
    nodes: [
      { id: 'node_1', type: 'visionScanner', position: { x: 100, y: 150 }, data: { label: 'Drone Camera' } },
      { id: 'node_2', type: 'customizer', position: { x: 400, y: 150 }, data: { label: 'Animal ID', prompt: 'Identify the animal in the image.' } },
      { id: 'node_3', type: 'decider', position: { x: 700, y: 150 }, data: { label: 'Is Endangered?' } },
      { id: 'node_4', type: 'display', position: { x: 1000, y: 50 }, data: { label: 'Ignore' } },
      { id: 'node_5', type: 'display', position: { x: 1000, y: 250 }, data: { label: 'Alert Rangers' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' },
      { id: 'e3-4', source: 'node_3', target: 'node_4', sourceHandle: 'false' },
      { id: 'e3-5', source: 'node_3', target: 'node_5', sourceHandle: 'true' }
    ]
  },
  {
    id: 'smart-cafe',
    title: 'Smart Cafeteria',
    description: 'Analyzes student feedback documents to generate a cafeteria satisfaction chart.',
    icon: <Cpu size={24} color="#3b82f6" />,
    color: '#3b82f6',
    nodes: [
      { id: 'node_1', type: 'documentReader', position: { x: 100, y: 100 }, data: { label: 'Feedback Forms' } },
      { id: 'node_2', type: 'summarizer', position: { x: 400, y: 100 }, data: { label: 'Extract Key Topics' } },
      { id: 'node_3', type: 'sentimentRadar', position: { x: 700, y: 100 }, data: { label: 'Score Topics' } },
      { id: 'node_4', type: 'chartGenerator', position: { x: 1000, y: 100 }, data: { label: 'Satisfaction Chart' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' }
    ]
  }
];

export default function ExploreTab({ onBack, autoLaunchId }) {
  // Deep-link from the learning flow: auto-launch a preset template by id.
  const [loadingScenario, setLoadingScenario] = useState(
    autoLaunchId ? SCENARIOS.find(s => s.id === autoLaunchId) || null : null
  );
  const [loadingStep, setLoadingStep] = useState(0);
  const [showWorkspace, setShowWorkspace] = useState(false);

  useEffect(() => {
    if (loadingScenario) {
      const steps = 4;
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep += 1;
        setLoadingStep(currentStep);
        if (currentStep >= steps) {
          clearInterval(interval);
          setTimeout(() => setShowWorkspace(true), 800);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [loadingScenario]);

  if (showWorkspace && loadingScenario) {
    return <AgenticWorkspace 
      onBackToDashboard={onBack} 
      presetFlow={{
        name: loadingScenario.title,
        nodes: loadingScenario.nodes,
        edges: loadingScenario.edges
      }} 
      isExploreMode={true}
    />;
  }

  if (loadingScenario) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f111a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', animation: 'pulse 1.5s infinite' }}>
          <Cpu size={40} color="#38bdf8" />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>AI is building your architecture...</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
          {['Parsing scenario requirements', 'Selecting appropriate LLM nodes', 'Wiring input and output channels', 'Finalizing graph state'].map((text, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: loadingStep >= idx ? 1 : 0.3, transition: 'opacity 0.5s' }}>
              {loadingStep > idx ? <CheckCircle2 color="#10b981" size={20} /> : <div style={{width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #475569'}} />}
              <span style={{ color: loadingStep > idx ? '#f8fafc' : '#94a3b8' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: 'white', padding: '40px' }}>
      <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '15px' }}>Explore Templates</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Select a predefined AI pipeline and watch the architecture build itself.</p>
      </div>

      <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
        {SCENARIOS.map(scenario => (
          <div 
            key={scenario.id}
            onClick={() => setLoadingScenario(scenario)}
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '30px',
              width: '320px',
              cursor: 'pointer',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)'; }}
          >
            <div style={{ background: `${scenario.color}22`, width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              {scenario.icon}
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: '#f8fafc' }}>{scenario.title}</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.5' }}>{scenario.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
