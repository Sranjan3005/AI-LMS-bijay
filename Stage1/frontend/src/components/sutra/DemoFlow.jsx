import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, PlayCircle, Wrench, Globe2 } from 'lucide-react';
import s from './DemoFlow.module.css';

/**
 * DemoFlow — the Sutra multi-step demonstration shell:
 *   ① Watch (video — auto-hidden when no `video` src is provided yet)
 *   ② Try it (the interactive, passed as children)
 *   ③ In real life (mapping cards + optional one-question check)
 *
 * Props:
 *   eyebrow, title (string | node), lede, accent (css color)
 *   video      — mp4 asset import or YouTube embed URL ('' hides the step)
 *   tryLabel   — optional label override for step ②
 *   realLife   — [{ icon:'🛵', title, text }]
 *   check      — { q, options: [..], answer: index, explain }
 *   onBack     — back to the learning flow
 */
const DemoFlow = ({ eyebrow, title, lede, accent = '#64d2ff', video = '', tryLabel = 'Try it', realLife = [], check, onBack, children }) => {
  const steps = [
    ...(video ? [{ key: 'watch', label: 'Watch', icon: <PlayCircle size={15} /> }] : []),
    { key: 'try', label: tryLabel, icon: <Wrench size={15} /> },
    ...(realLife.length ? [{ key: 'real', label: 'In real life', icon: <Globe2 size={15} /> }] : []),
  ];
  const [stepIdx, setStepIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const step = steps[stepIdx];
  const isYouTube = typeof video === 'string' && video.includes('youtube');

  return (
    <div className={s.page} style={{ '--acc': accent }}>
      <div className={s.top}>
        <button className={s.back} onClick={onBack}><ArrowLeft size={16} /> Back to my flow</button>
      </div>

      <div className={s.head}>
        <span className={s.eyebrow}>{eyebrow}</span>
        <h1>{title}</h1>
        {lede && <p className={s.lede}>{lede}</p>}
      </div>

      <div className={s.stepsNav}>
        {steps.map((st, i) => (
          <button key={st.key} className={`${s.stepBtn} ${i === stepIdx ? s.stepOn : ''}`} onClick={() => setStepIdx(i)}>
            <span className={s.stepNum}>{i + 1}</span>{st.icon}{st.label}
          </button>
        ))}
      </div>

      <div className={s.body}>
        {step.key === 'watch' && (
          <div className={s.card}>
            <div className={s.videoWrap}>
              {isYouTube
                ? <iframe src={video} title={typeof title === 'string' ? title : 'Demo video'} allowFullScreen />
                : <video src={video} controls playsInline />}
            </div>
            <p className={s.videoNote}>Watch first — then try it yourself in the next step.</p>
          </div>
        )}

        {step.key === 'try' && children}

        {step.key === 'real' && (
          <div className={s.card}>
            <div className={s.rlGrid}>
              {realLife.map((r, i) => (
                <div key={i} className={s.rlCard}>
                  <div className={s.rlIcon}>{r.icon}</div>
                  <h4>{r.title}</h4>
                  <p>{r.text}</p>
                </div>
              ))}
            </div>
            {check && (
              <div className={s.check}>
                <div className={s.checkQ}>{check.q}</div>
                {check.options.map((o, i) => (
                  <button key={i}
                    className={`${s.opt} ${picked !== null && i === check.answer ? s.optRight : ''} ${picked === i && i !== check.answer ? s.optWrong : ''}`}
                    onClick={() => setPicked(i)} disabled={picked !== null}>
                    {o}
                  </button>
                ))}
                {picked !== null && <div className={s.explain}>{check.explain}</div>}
              </div>
            )}
          </div>
        )}

        <div className={s.foot}>
          <button className={`${s.navBtn} ${s.navGhost}`} disabled={stepIdx === 0} onClick={() => setStepIdx(stepIdx - 1)}>
            <ArrowLeft size={16} /> Previous
          </button>
          {stepIdx < steps.length - 1
            ? <button className={s.navBtn} onClick={() => setStepIdx(stepIdx + 1)}>Next <ArrowRight size={16} /></button>
            : <button className={s.navBtn} onClick={onBack}>Finish <ArrowRight size={16} /></button>}
        </div>
      </div>
    </div>
  );
};

export default DemoFlow;
export { default as demoStyles } from './DemoFlow.module.css';
