import React from 'react';
import SocialMediaDataLab from './SocialMediaDataLab';
import TabularDataLab from './TabularDataLab';
import ImageDataLab from './ImageDataLab';

/**
 * DataLabCanvas — "collect your own data" router.
 * Each scenario gets a collection method tailored to its data type:
 *   • The Social Media Trend → its bespoke Instagram flow
 *   • Regression / Classification → editable table built from the scenario's own columns
 *   • Computer Vision / Neural  → varied image-sample cards
 * Every flow shows live, client-side inference about the data as it's collected.
 */
const DataLabCanvas = ({ scenario, onOpenDemonstration }) => {
  if (scenario.title === 'The Social Media Trend') {
    return <SocialMediaDataLab scenario={scenario} onBackToDashboard={() => {}} onOpenDemonstration={onOpenDemonstration} />;
  }

  const isImage = scenario.model_type === 'COMPUTER_VISION' || scenario.model_type === 'NEURAL_NETWORK';

  return (
    <div style={{ padding: 'clamp(20px, 3vw, 40px)', maxWidth: 1440, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.1rem)', margin: '0 0 8px' }}>Collect data for {scenario.title}</h2>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.05rem', lineHeight: 1.6, maxWidth: 760 }}>
          Great AI starts with good data — <i>“garbage in, garbage out.”</i> Build your own dataset below and watch,
          in real time, whether it’s the kind of data this model needs.
        </p>
      </div>

      {/* Authored context (seeded on the scenario) */}
      {(scenario.data_story || scenario.guide_steps?.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: scenario.data_story && scenario.guide_steps?.length ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: 16, marginBottom: 24 }}>
          {scenario.data_story && (
            <div style={{ padding: '18px 22px', background: 'rgba(0,240,255,0.05)', borderRadius: 12, border: '1px solid rgba(0,240,255,0.2)' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)', margin: '0 0 8px' }}>Where the data comes from</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.96rem' }}>{scenario.data_story}</p>
            </div>
          )}
          {scenario.guide_steps?.length > 0 && (
            <div style={{ padding: '18px 22px', background: 'rgba(48,209,88,0.05)', borderRadius: 12, border: '1px solid rgba(48,209,88,0.25)' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#30D158', margin: '0 0 10px' }}>Your mission — step by step</h3>
              <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.96rem' }}>
                {scenario.guide_steps.map((st, i) => <li key={i}>{st}</li>)}
              </ol>
            </div>
          )}
        </div>
      )}

      {isImage
        ? <ImageDataLab scenario={scenario} onOpenDemonstration={onOpenDemonstration} />
        : <TabularDataLab scenario={scenario} onOpenDemonstration={onOpenDemonstration} />}
    </div>
  );
};

export default DataLabCanvas;
