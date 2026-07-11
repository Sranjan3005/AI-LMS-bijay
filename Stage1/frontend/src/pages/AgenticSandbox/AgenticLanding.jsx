import React, { useState } from 'react';
import { ArrowRight, Compass, Settings2, Sparkles, ArrowLeft } from 'lucide-react';
import AgenticWorkspace from './AgenticWorkspace';
import ExploreTab from './ExploreTab';
import BuildWizard from './BuildWizard';
import './AgenticFlow.css';

export default function AgenticLanding({ onBackToDashboard, initialView, autoLaunchId }) {
  // The learning flow can deep-link straight into a view ('explore' | 'workspace')
  // and auto-launch a preset template inside Explore (autoLaunchId).
  const [activeView, setActiveView] = useState(initialView || 'landing'); // 'landing', 'explore', 'build_wizard', 'workspace'
  const [userPrompt, setUserPrompt] = useState('');

  if (activeView === 'workspace') {
    return <AgenticWorkspace onBackToDashboard={() => setActiveView('landing')} userPrompt={userPrompt} />;
  }

  if (activeView === 'explore') {
    return <ExploreTab onBack={() => setActiveView('landing')} onOpenWorkspace={() => setActiveView('workspace')} autoLaunchId={autoLaunchId} />;
  }

  if (activeView === 'build_wizard') {
    return <BuildWizard 
      onBack={() => setActiveView('landing')} 
      onComplete={(prompt) => {
        setUserPrompt(prompt);
        setActiveView('workspace');
      }} 
    />;
  }

  return (
    <div className="landing-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f111a 0%, #1a1d2d 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      
      <button 
        onClick={onBackToDashboard} 
        style={{ 
          position: 'absolute', 
          top: 40, 
          left: 40, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'rgba(255,255,255,0.05)', 
          border: 'none', 
          padding: '10px 20px', 
          borderRadius: '8px', 
          color: '#cbd5e1', 
          cursor: 'pointer',
          transition: 'background 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
      >
        <ArrowLeft size={18} /> Go to Dashboard
      </button>
      
      <div style={{ textAlign: 'center', marginBottom: '60px', animation: 'fadeInDown 0.8s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: '50%' }}>
            <Sparkles size={40} color="#38bdf8" />
          </div>
        </div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '10px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Agentic Flow Studio
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
          Design, test, and deploy AI pipelines with our visual node editor. Choose an interactive template or start from scratch.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>
        
        {/* Explore Card */}
        <div 
          onClick={() => setActiveView('explore')}
          className="hover-card"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            width: '350px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <Compass size={30} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Explore Agentic Flow</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '30px' }}>
            Discover pre-built scenarios like Fake News Detection and Wildlife Rescue. Watch the AI build and execute the architecture.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#d946ef', fontWeight: 600 }}>
            Start Exploring <ArrowRight size={18} />
          </div>
        </div>

        {/* Build Card */}
        <div 
          onClick={() => setActiveView('build_wizard')}
          className="hover-card"
          style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '40px',
            width: '350px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <Settings2 size={30} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '15px' }}>Build Agentic Flow</h2>
          <p style={{ color: '#94a3b8', lineHeight: '1.6', marginBottom: '30px' }}>
            Start with a blank canvas or answer a few questions to let our wizard set up the foundation for your custom AI pipeline.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', fontWeight: 600 }}>
            Start Building <ArrowRight size={18} />
          </div>
        </div>

      </div>
    </div>
  );
}
