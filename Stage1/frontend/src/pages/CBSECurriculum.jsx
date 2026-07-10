import React, { useState } from 'react';
import { Ico } from '../components/sutra/icons';

// Extracted from the CBSE "Computational Thinking & AI" framework — Early-AI strand, Classes 6–8.
const CBSE = {
  '6': { tag: 'AI awareness & data basics', units: [
    { n: 1, t: 'Introduction to AI & Everyday Examples', h: 5, d: 'What AI is; the difference between AI and automation; human vs. machine intelligence; AI types — supervised, unsupervised and reinforcement learning.' },
    { n: 2, t: 'Basic Data Concepts', h: 5, d: 'Data types — numbers, text, images and sound; simple data organisation and representation using tables and charts.' },
    { n: 3, t: 'Simple Pattern Recognition & Decision Making', h: 5, d: 'Identifying patterns in data or daily routines; making simple decisions based on observations.' },
    { n: 4, t: 'Ethics & Digital Responsibility', h: 5, d: 'Online safety, privacy, passwords and ethical use of technology; understanding digital footprints.' },
  ], outcomes: [
    'Summarise basic ideas and applications of AI',
    'Describe how machine intelligence differs from human intelligence',
    'Explain automation vs. AI using real-world cases',
    'Differentiate supervised, unsupervised & reinforcement learning',
    'Organise and represent data as text, numbers, images and sound',
    'Recognise simple patterns and make decisions from data',
    'Practise internet safety — secure passwords, privacy, safe behaviour',
    'Apply human-centred, ethical thinking to everyday AI',
  ], map: ['Understanding AI', 'Maths for AI', 'Data & Analysis', 'AI Ethics Arena'] },
  '7': { tag: 'Predictive techniques & AI domains', units: [
    { n: 1, t: 'AI Domains', h: 5, d: 'Predictive techniques — classification, regression and clustering, with hands-on practice on a small dataset; Computer Vision, NLP and Data Science; examples like chatbots, image recognition and translation.' },
    { n: 2, t: 'AI in Industries', h: 5, d: 'Applications across healthcare, education, transport and communication; how AI improves accuracy, efficiency and productivity.' },
    { n: 3, t: 'Data Visualisation & Analysis', h: 5, d: 'Collecting structured data; creating bar charts, line graphs and pie charts; interpreting patterns.' },
    { n: 4, t: 'Ethics & AI Bias Awareness', h: 5, d: 'Introduction to bias in AI; case examples; responsible and fair use of AI; digital citizenship.' },
  ], outcomes: [
    'Distinguish regression (predict a number), classification (group by learned patterns) and clustering (group similar items)',
    'Explain the AI domains: Data Science, Computer Vision and NLP',
    'Explain what bias in AI means and spot unfair results',
    'Collect & organise structured data and build bar, line and pie charts',
    'Apply basic predictive techniques to a small dataset',
    'Explain uses of AI in healthcare, education, transport & communication',
    'Maintain data privacy and give informed consent',
    'Demonstrate responsible digital citizenship',
  ], map: ['Linear Regression', 'Classification', 'Computer Vision', 'Data & Analysis', 'AI Ethics Arena'] },
  '8': { tag: 'AI project cycle, applications & fairness', units: [
    { n: 1, t: 'AI Project Lifecycle (Conceptual)', h: 5, d: 'The stages of an AI project — Define Problem, Collect Data, Test AI Tools, Reflect & Improve; how AI learns from patterns in data.' },
    { n: 2, t: 'Deeper Dive into AI Applications', h: 5, d: 'AI in the environment, healthcare, automation and education; hands-on with simple no-code AI tools — image classifiers, chatbots and data-prediction apps.' },
    { n: 3, t: 'Data and Fairness', h: 5, d: 'How AI uses data; identifying bias in datasets; simple strategies to ensure fairness and inclusivity.' },
    { n: 4, t: 'Ethics and Responsible AI', h: 5, d: 'Privacy issues, misinformation and social impact; responsible use of AI and digital tools; reflection on real-world challenges.' },
  ], outcomes: [
    'Describe the AI project cycle: Define → Collect → Test → Reflect & Improve',
    'Apply no-code AI tools to real problems and judge their usefulness',
    'Explain how AI uses data and find sources of bias in datasets',
    'Apply basic strategies for fairness and inclusivity',
    'Understand AI as an algorithm using datasets, learning and prediction',
    'Analyse AI’s benefits and risks in healthcare, automation & education',
    'Describe AI ethics as the values that keep AI responsible',
  ], map: ['Agentic Flow Studio', 'Computer Vision', 'Data & Analysis', 'AI Ethics Arena'] },
};

const CBSECurriculum = () => {
  const [cls, setCls] = useState('6');
  const c = CBSE[cls];

  return (
    <div className="wrap">
      <div className="page-head">
        <span className="eyebrow"><Ico name="read" />CBSE · Computational Thinking &amp; AI</span>
        <h1>The AI syllabus,<br /><span className="grad">Classes 6 to 8.</span></h1>
        <p>The Early-AI strand of CBSE's CT &amp; AI framework — 20 hours per class per year. Pick a class to see its units, learning outcomes, and exactly which Sutra modules deliver them.</p>
        <div className="classtabs" role="tablist" aria-label="Choose class">
          {['6', '7', '8'].map(k => (
            <button key={k} className={cls === k ? 'on' : ''} role="tab" onClick={() => setCls(k)}>Class {k}</button>
          ))}
        </div>
      </div>

      <div style={{ paddingBottom: 56 }}>
        <div className="cbse-meta">
          <span className="eyebrow">Class {cls} · Early AI</span>
          <span className="m-hours">20 hours / year · 4 units</span>
          <span className="m-hours">{c.tag}</span>
        </div>

        <div className="syl-grid">
          {c.units.map(u => (
            <div className="unit" key={u.n}>
              <div className="unit-top"><div className="unit-n">{u.n}</div><span className="unit-h">{u.h} hrs</span></div>
              <h4>{u.t}</h4><p>{u.d}</p>
            </div>
          ))}
        </div>

        <div className="out-wrap">
          <h3><Ico name="tick" />Learning outcomes — a Class {cls} student can…</h3>
          <ul className="outcomes">
            {c.outcomes.map((o, i) => (
              <li key={i}><Ico name="tick" w={2.4} /><span>{o}</span></li>
            ))}
          </ul>
        </div>

        <div className="mapbar">
          <span className="lab">Delivered in Sutra by</span>
          {c.map.map(m => <span className="maptag" key={m}>{m}</span>)}
        </div>
      </div>
    </div>
  );
};

export default CBSECurriculum;
