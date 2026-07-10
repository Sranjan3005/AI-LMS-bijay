import React from 'react';
import { Ico } from '../components/sutra/icons';

/** Renders a "Theory" explainer from the content registry. */
const ExplainerPage = ({ data, onOpenModule, onBack }) => {
  if (!data) return null;
  return (
    <div className="wrap">
      <div className="explainer">
        <button className="btn btn-ghost btn-sm exp-back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
          Back to my flow
        </button>

        <span className="eyebrow" style={{ color: data.color }}>{data.eyebrow}</span>
        <h1 className="exp-title">{data.title}</h1>
        <p className="lede">{data.lede}</p>

        {data.video ? (
          <div className="exp-video">
            <iframe src={data.video} title={data.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        ) : null}

        {data.sections?.map((s, i) => (
          <div className="exp-section" key={i}>
            <h3>{s.h}</h3>
            <p>{s.p}</p>
          </div>
        ))}

        {data.keypoints?.length ? (
          <div className="exp-key">
            <h4><Ico name="tick" />Remember this</h4>
            <ul>
              {data.keypoints.map((k, i) => (
                <li key={i}><Ico name="tick" w={2.4} /><span>{k}</span></li>
              ))}
            </ul>
          </div>
        ) : null}

        {data.open ? (
          <div className="exp-cta">
            <button className="btn btn-thread btn-lg" onClick={() => onOpenModule(data.open)}>
              {data.openLabel || 'Try it now'}<Ico name="arrowR" w={2.2} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ExplainerPage;
