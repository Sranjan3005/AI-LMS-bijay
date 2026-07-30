import React from 'react';
import { Eye, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GenericCVPipelineViewer({ cvResult }) {
  if (!cvResult || !cvResult.stages) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, color: 'var(--text-secondary)', opacity: 0.5,
      }}>
        <Eye size={40} />
        <p style={{ margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>
          Draw something and click Predict<br/>to see how I process it step by step
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px', overflowY: 'auto', height: '100%' }}>
      {cvResult.stages.map((stage, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          {i > 0 && <ArrowDown size={20} color="rgba(255,255,255,0.2)" style={{ margin: '8px 0' }} />}
          <div className="glass-panel" style={{ width: '100%', padding: '15px', borderRadius: '12px', borderLeft: `4px solid ${i === cvResult.stages.length - 1 ? 'var(--accent-green)' : 'var(--accent-cyan)'}` }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Step {i + 1}: {stage.title}</span>
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {stage.description}
            </p>
            
            {stage.image && (
              <div style={{ display: 'flex', justifyContent: 'center', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>
                <img 
                  src={stage.image} 
                  alt={stage.title} 
                  style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '4px', imageRendering: 'pixelated', border: '1px solid rgba(255,255,255,0.1)' }} 
                />
              </div>
            )}
            
            {stage.text && (
              <div style={{ background: 'rgba(0,255,136,0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0,255,136,0.3)', textAlign: 'center', marginTop: '10px' }}>
                <strong style={{ color: 'var(--accent-green)', fontSize: '1.2rem', fontFamily: 'monospace' }}>
                  {stage.text}
                </strong>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
