import React, { useState } from 'react';
import { ArrowLeft, Bot, Sparkles, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '../../api';
import { ChitiAvatar } from '../../components/guide/GuideProvider';
import * as voice from '../../components/chiti/voice';

export default function BuildWizard({ onBack, onComplete }) {
  const [prompt, setPrompt] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleStartBuilding = async () => {
    setIsEvaluating(true);
    setFeedback(null);
    try {
      const response = await api.post('/agentic/workflows/evaluate_idea/', { idea: prompt });
      setFeedback(response.data);
      if (response.data.is_feasible) {
        voice.speak("Looks doable! " + response.data.explanation);
      } else {
        voice.speak("Might be tricky... " + response.data.explanation);
      }
    } catch (error) {
      console.error("Evaluation error:", error);
      // Fallback
      setFeedback({ is_feasible: true, explanation: "We couldn't evaluate this right now, but give it a try!" });
      voice.speak("We couldn't evaluate this right now, but give it a try!");
    }
    setIsEvaluating(false);
  };

  React.useEffect(() => {
    voice.speak("Hi! I'm Chiti! What do you want to build? Describe your AI pipeline idea.");
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button onClick={onBack} className="btn-secondary" style={{ position: 'absolute', top: 40, left: 40, display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ textAlign: 'center', maxWidth: '600px', width: '100%', animation: 'fadeInUp 0.5s ease-out' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
          <div style={{ background: 'linear-gradient(135deg, #10121a, #1a1c29)', padding: '20px', borderRadius: '50%', border: '2px solid rgba(100,210,255,0.4)', boxShadow: '0 10px 30px rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyItems: 'center' }}>
            <ChitiAvatar size={80} mood={feedback ? (feedback.is_feasible ? 'cheer' : 'think') : 'idle'} />
          </div>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '20px' }}>What do you want to build?</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.2rem', marginBottom: '40px' }}>
          Describe your AI pipeline idea.
        </p>

        <div style={{ position: 'relative', marginBottom: '30px' }}>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setFeedback(null); // Clear feedback if they change their mind
            }}
            placeholder="e.g., An agent that reads resumes, extracts skills, and scores them..."
            style={{
              width: '100%',
              minHeight: '120px',
              background: 'rgba(30, 41, 59, 0.5)',
              border: '2px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '20px',
              fontSize: '1.1rem',
              color: 'white',
              fontFamily: 'inherit',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.3s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
          <Sparkles size={20} color="#3b82f6" style={{ position: 'absolute', top: 20, right: 20, opacity: prompt ? 1 : 0.3 }} />
        </div>

        {feedback && (
          <div style={{
            marginBottom: '30px',
            padding: '20px',
            borderRadius: '16px',
            background: feedback.is_feasible ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${feedback.is_feasible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            textAlign: 'left'
          }}>
            {feedback.is_feasible ? (
              <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={24} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: feedback.is_feasible ? '#10b981' : '#ef4444' }}>
                {feedback.is_feasible ? 'Looks doable!' : 'Might be tricky...'}
              </h3>
              <p style={{ margin: 0, color: '#cbd5e1', lineHeight: '1.5' }}>
                {feedback.explanation}
              </p>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          {feedback?.is_feasible ? (
            <button
              onClick={() => onComplete(prompt)}
              style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              Go to Canvas <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleStartBuilding}
              disabled={!prompt.trim() || isEvaluating}
              style={{
                padding: '12px 30px',
                fontSize: '1.1rem',
                borderRadius: '12px',
                background: prompt.trim() ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#334155',
                color: prompt.trim() ? 'white' : '#94a3b8',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: prompt.trim() && !isEvaluating ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s'
              }}
            >
              {isEvaluating ? (
                <><Loader2 size={18} className="spin" /> Checking Idea...</>
              ) : (
                <>Check Feasibility <Sparkles size={18} /></>
              )}
            </button>
          )}
        </div>
      </div>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
