import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { BookOpen, BarChart2, BrainCircuit, ShieldAlert, LogOut, Network, ClipboardList } from 'lucide-react';

const StudentDashboard = ({ onNavigateToLab, onNavigateToDataLab, onNavigateToAgentic, onNavigateToFoundations, onNavigateToEthics, onNavigateToAssignments }) => {
  const { user, logout } = useContext(AuthContext);

  const modules = [
    {
      id: 'foundations',
      title: 'AI Foundations',
      subtitle: 'Class 6–7 Intro',
      description: 'Supervised, Unsupervised, RL, AI in daily life, and the project cycle.',
      icon: BookOpen,
      color: 'var(--accent-purple)',
      active: true,
      onClick: onNavigateToFoundations
    },
    {
      id: 'data_lab',
      title: 'Data Lab',
      subtitle: 'Class 7–8',
      description: 'Collect data, charts, patterns, bias detection, and preprocessing.',
      icon: BarChart2,
      color: 'var(--accent-cyan)',
      active: true,
      onClick: onNavigateToDataLab
    },
    {
      id: 'prediction_engine',
      title: 'Prediction Engine',
      subtitle: 'Class 7–8',
      description: 'Regression, Classification, Clustering, and Neural Networks.',
      icon: BrainCircuit,
      color: 'var(--accent-green)',
      active: true,
      onClick: onNavigateToLab
    },
    {
      id: 'ethics',
      title: 'AI Ethics Arena',
      subtitle: 'Class 6–8',
      description: 'Bias, fairness, accountability, privacy, and digital citizenship.',
      icon: ShieldAlert,
      color: 'var(--accent-red)',
      active: true,
      onClick: onNavigateToEthics
    },
    {
      id: 'agentic_sandbox',
      title: 'Agentic Flow Sandbox',
      subtitle: 'Module 5',
      description: 'Build your own AI Agents, connect them together, and solve complex missions!',
      icon: Network,
      color: 'var(--accent-orange, #f97316)',
      active: true,
      onClick: onNavigateToAgentic
    },
    {
      id: 'assignments',
      title: 'Assignments & Grading',
      subtitle: 'Course Work',
      description: 'View your pending assignments, submit projects, and check your grades.',
      icon: ClipboardList,
      color: '#4f46e5',
      active: true,
      onClick: onNavigateToAssignments
    }
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '10px' }}>Your Learning Journey</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user?.name}. Ready to explore?</p>
        </div>
        <button className="btn-secondary" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Grid of Modules */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '30px' }}>
        {modules.map(mod => {
          const Icon = mod.icon;
          return (
            <div 
              key={mod.id}
              className="glass-panel"
              onClick={mod.active ? mod.onClick : undefined}
              style={{ 
                flex: '1 1 500px',
                maxWidth: '550px',
                padding: '30px', 
                cursor: mod.active ? 'pointer' : 'not-allowed',
                opacity: mod.active ? 1 : 0.6,
                display: 'flex',
                gap: '20px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                border: mod.active ? `1px solid ${mod.color}` : '1px solid var(--glass-border)'
              }}
              onMouseEnter={(e) => {
                if(mod.active) {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = `0 10px 30px rgba(0,0,0,0.5), 0 0 15px ${mod.color}33`;
                }
              }}
              onMouseLeave={(e) => {
                if(mod.active) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <div style={{ 
                width: '60px', height: '60px', borderRadius: '12px', 
                background: `${mod.color}22`, color: mod.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={32} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: mod.color, fontWeight: '600', marginBottom: '5px', textTransform: 'uppercase' }}>
                  {mod.subtitle}
                </div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{mod.title}</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', fontSize: '0.95rem' }}>
                  {mod.description}
                </p>
                {!mod.active && (
                  <div style={{ display: 'inline-block', marginTop: '15px', padding: '4px 10px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.8rem' }}>
                    Locked — Coming Soon
                  </div>
                )}
                {mod.active && (
                  <button className="btn-primary" style={{ marginTop: '15px', padding: '8px 16px', fontSize: '0.9rem' }}>
                    Enter Module
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  );
};

export default StudentDashboard;
