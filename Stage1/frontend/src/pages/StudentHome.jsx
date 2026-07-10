import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Ico } from '../components/sutra/icons';
import { firstName, initials } from '../components/sutra/SutraShell';
import api from '../api';

// Theory submodule → destination. Existing lessons open their real page; the
// rest open a Sutra explainer (see content/explainers.js).
const THEORY = {
  'Understanding AI': { view: 'emergence_lesson' },
  'Maths for AI': { view: 'maths_lesson' },
  'Data & Analysis': { view: 'data_analysis' },
  'Linear Regression': { view: 'linear_regression_lesson' },
  'Classification': { content: 'classification' },
  'Neural Networks': { content: 'neural' },
  'Computer Vision': { view: 'computer_vision_lesson' },
  'Agentic Flow Studio': { content: 'agentic' },
  'AI Ethics Arena': { content: 'ethics' },
};

function subTarget(m, s) {
  if (s.ty === 'theory') return THEORY[m.t] || { open: m.open };
  if (s.ty === 'assign') return { assignments: m.open };
  return { open: m.open };   // demonstration + hands-on → the real workspace
}

const TYPE = {
  theory: { label: 'Theory', color: 'var(--s-theory)', icon: 'read' },
  demo: { label: 'Demonstration', color: 'var(--s-demo)', icon: 'play' },
  hands: { label: 'Hands-on', color: 'var(--s-hands)', icon: 'terminal' },
  assign: { label: 'Assignment', color: 'var(--s-assign)', icon: 'edit' },
};
const STLABEL = { done: 'Completed', live: 'Ongoing', soon: 'Upcoming' };

// CBSE-aligned learning flow — mapped to the app's real modules via `open`.
const PHASES = [
  { no: '01', t: 'Foundations', d: 'What AI is, and the maths that makes it work.', c: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)', ca: 'rgba(191,90,242,.4)', mods: [
    { t: 'Understanding AI', cls: 'Class 6 · Concept', open: 'foundations', m: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)', mg: 'rgba(191,90,242,.3)', rc: '#BF5AF2', ic: 'book', dates: '02 Jun – 12 Jun', st: 'done', p: 100, subs: [
      { ty: 'theory', n: 'What is Artificial Intelligence?', d: 'Explainer resource: how machines learn from examples, AI vs automation, and human vs machine intelligence.', date: '02 Jun', st: 'done', stt: 'Done', res: [{ t: 'Explainer', i: 'read', k: 1 }, { t: '8 min read', i: 'book' }] },
      { ty: 'demo', n: 'Smart Puppy — code vs. learn', d: 'Watch a puppy “trained” vs “programmed” to see supervised, unsupervised & reinforcement learning.', date: '05 Jun', st: 'done', stt: 'Done', res: [{ t: 'Interactive demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Spot the AI around you', d: 'Tag everyday apps as AI / not-AI and justify each in the sandbox.', date: '08 Jun', st: 'done', stt: 'Done', res: [{ t: 'Activity', i: 'terminal', k: 1 }] },
      { ty: 'assign', n: 'Quiz: AI in daily life', d: 'Auto-graded check on core ideas and the AI project cycle.', date: '12 Jun · 9/10', st: 'done', stt: 'Graded', res: [{ t: 'Quiz', i: 'check', k: 1 }] },
    ] },
    { t: 'Maths for AI', cls: 'Class 6 · Concept', open: 'foundations', m: 'linear-gradient(135deg,#7C7AFF,#5E5CE6)', mg: 'rgba(94,92,230,.3)', rc: '#7C7AFF', ic: 'sigma', dates: '13 Jun – 24 Jun', st: 'done', p: 100, subs: [
      { ty: 'theory', n: 'Numbers, graphs & slope', d: 'Explainer resource: the arithmetic→algebra→calculus chain, and why slope is “how fast things change”.', date: '13 Jun', st: 'done', stt: 'Done', res: [{ t: 'Explainer', i: 'read', k: 1 }, { t: '6 min read', i: 'book' }] },
      { ty: 'demo', n: 'See the maths behind a prediction', d: 'A guided walkthrough of a line fitting points as numbers update live.', date: '16 Jun', st: 'done', stt: 'Done', res: [{ t: 'Demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Play with slope & weights', d: 'Drag sliders to change a line’s slope and see the error rise and fall.', date: '19 Jun', st: 'done', stt: 'Done', res: [{ t: 'Sandbox', i: 'sliders', k: 1 }] },
      { ty: 'assign', n: 'Worksheet: read a graph', d: 'Interpret trends and predict the next value from a chart.', date: '24 Jun · 8/10', st: 'done', stt: 'Graded', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '02', t: 'Working with Data', d: 'Where models get their fuel — collect it, clean it, question it.', c: 'linear-gradient(135deg,#64D2FF,#0A84FF)', ca: 'rgba(100,210,255,.4)', mods: [
    { t: 'Data & Analysis', cls: 'Class 6–7 · Data Lab', open: 'data', m: 'linear-gradient(135deg,#64D2FF,#0A84FF)', mg: 'rgba(100,210,255,.3)', rc: '#64D2FF', ic: 'bars', dates: '01 Jul – 22 Jul', st: 'live', p: 60, subs: [
      { ty: 'theory', n: 'What is data, really?', d: 'Explainer resource: rows, features, labels, data types (text, numbers, images, sound) and where bias sneaks in.', date: '01 Jul', st: 'done', stt: 'Done', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Charts & spotting bias', d: 'Watch a dataset turn into bar, line & pie charts, then see how a skewed sample misleads.', date: '05 Jul', st: 'done', stt: 'Done', res: [{ t: 'Demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Upload & clean a CSV', d: 'Bring your own CSV, fix missing values, and feed it toward the models.', date: '09 Jul', st: 'live', stt: 'In progress', res: [{ t: 'Sandbox', i: 'terminal', k: 1 }, { t: 'Upload CSV', i: 'file' }] },
      { ty: 'assign', n: 'Project: clean a messy dataset', d: 'Turn a raw, dirty dataset into model-ready data and explain your steps.', date: 'due 11 Jul', st: 'soon', stt: 'Not started', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '03', t: 'Machine-Learning Models', d: 'One model per module — build each from the ground up.', c: 'linear-gradient(135deg,#30D158,#0A84FF)', ca: 'rgba(48,209,88,.4)', mods: [
    { t: 'Linear Regression', cls: 'Class 7 · Model', open: 'regression', m: 'linear-gradient(135deg,#30D158,#00C7BE)', mg: 'rgba(48,209,88,.3)', rc: '#30D158', ic: 'trend', dates: '15 Jul – 25 Jul', st: 'live', p: 35, subs: [
      { ty: 'theory', n: 'How regression fits a line', d: 'Explainer resource: best-fit lines, error, and predicting a number — the concept before the console.', date: '15 Jul', st: 'live', stt: 'Reading', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Predict lemonade sales', d: 'Watch a real scikit-learn model train on lemonade-stand data and draw its line.', date: '18 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train it on your own inputs', d: 'Change the data, retrain, and predict on numbers you pick — see the loss curve move.', date: '22 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Train model', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Build & explain a regressor', d: 'Ship a working regression model with a 5-part explainable-AI write-up.', date: 'due 25 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Classification', cls: 'Class 7 · Model', open: 'classification', m: 'linear-gradient(135deg,#00C7BE,#0A84FF)', mg: 'rgba(0,199,190,.3)', rc: '#00C7BE', ic: 'scatter', dates: '28 Jul – 07 Aug', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'How classifiers draw boundaries', d: 'Explainer resource: categories, decision boundaries and accuracy vs. a fair guess.', date: '28 Jul', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Spam or not spam?', d: 'Watch a classifier sort messages and show its confidence.', date: '31 Jul', st: 'soon', stt: 'Locked', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train your own classifier', d: 'Feed labelled examples, train, and test on new cases in the sandbox.', date: '04 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Train model', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Build your own classifier', d: 'Pick a problem, build a classifier, and defend where it fails.', date: 'due 07 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Neural Networks', cls: 'Class 8 · Model', open: 'neural', m: 'linear-gradient(135deg,#0A84FF,#5E5CE6)', mg: 'rgba(10,132,255,.3)', rc: '#0A84FF', ic: 'neural', dates: '11 Aug – 22 Aug', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'Neurons, layers & weights', d: 'Explainer resource: how stacking simple units lets a network learn complex patterns.', date: '11 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Watch a network learn', d: 'See weights adjust across epochs as accuracy climbs.', date: '14 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train a small neural net', d: 'Set layers and learning rate, train, and read the loss curve.', date: '18 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Train model', i: 'sliders', k: 1 }] },
      { ty: 'assign', n: 'Tune a network', d: 'Improve a starter network and explain what each change did.', date: 'due 22 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Computer Vision', cls: 'Class 8 · Model', open: 'vision', m: 'linear-gradient(135deg,#FF9F0A,#FF375F)', mg: 'rgba(255,159,10,.3)', rc: '#FF9F0A', ic: 'eye', dates: '25 Aug – 05 Sep', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'How machines see', d: 'Explainer resource: pixels, features and how an image becomes numbers a model can read.', date: '25 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Image classifier in action', d: 'Watch a vision model label photos live and show what it focused on.', date: '28 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train an image model', d: 'Upload images, train a classifier, and test it on your own pictures.', date: '01 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Train model', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Build an image classifier', d: 'Create a working vision classifier and report its accuracy and blind spots.', date: 'due 05 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '04', t: 'Building with AI', d: 'Put the pieces together into a working AI system.', c: 'linear-gradient(135deg,#FF9F0A,#FF375F)', ca: 'rgba(255,159,10,.4)', mods: [
    { t: 'Agentic Flow Studio', cls: 'Class 8 · Build', open: 'agentic', m: 'linear-gradient(135deg,#FF375F,#FF9F0A)', mg: 'rgba(255,55,95,.3)', rc: '#FF375F', ic: 'nodes', dates: '08 Sep – 26 Sep', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'What are AI agents & pipelines?', d: 'Explainer resource: nodes, tools and how connected agents solve a task step by step.', date: '08 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Run a prebuilt agent flow', d: 'Watch a ready-made pipeline read, summarise and decide — live on the canvas.', date: '12 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Wire your first agent', d: 'Drag, drop and connect nodes to build a working flow in the studio.', date: '18 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Studio', i: 'terminal', k: 1 }] },
      { ty: 'assign', n: 'Capstone: news fact-checking agent', d: 'Build an agent that searches, reads and flags claims — your end-of-track project.', date: 'due 26 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '05', t: 'Responsible AI', d: 'The judgement that separates a builder from a technician.', c: 'linear-gradient(135deg,#FF453A,#FF9F0A)', ca: 'rgba(255,69,58,.4)', mods: [
    { t: 'AI Ethics Arena', cls: 'Class 6–8 · Woven throughout', open: 'ethics', m: 'linear-gradient(135deg,#FF453A,#FF9F0A)', mg: 'rgba(255,69,58,.3)', rc: '#FF453A', ic: 'shield', dates: 'Ongoing · all term', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'Bias, fairness & privacy', d: 'Explainer resource: the four pillars — bias, fairness, accountability, privacy — with real headlines.', date: 'runs alongside', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'The Emotion-Detector dilemma', d: 'Work a real case where a model reads faces — and gets people wrong.', date: 'runs alongside', st: 'soon', stt: 'Locked', res: [{ t: 'Case', i: 'debate', k: 1 }] },
      { ty: 'hands', n: 'Deepfake Detective', d: 'Investigate manipulated media in a guided challenge and call it.', date: 'runs alongside', st: 'soon', stt: 'Locked', res: [{ t: 'Challenge', i: 'terminal', k: 1 }] },
      { ty: 'assign', n: 'Write a stakeholder argument', d: 'Argue a dilemma from an assigned stakeholder’s side using the framework.', date: 'due end of term', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
];

const Pill = ({ st, label }) => (
  <span className={`pill ${st}`}><span className="dot" />{label || STLABEL[st]}</span>
);

const SubRow = ({ s, m, onOpenSub }) => {
  const T = TYPE[s.ty];
  const go = () => onOpenSub(subTarget(m, s), s, m);
  return (
    <div className="sub is-click" style={{ '--fc': T.color }} role="button" tabIndex={0}
         onClick={go}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }}>
      <div className="sub-flag" />
      <div className="sub-name">
        <div className="tbadge"><Ico name={T.icon} />{T.label}</div>
        <div className="n">{s.n}</div>
        <div className="d">{s.d}</div>
      </div>
      <div className="res">
        {s.res.map((r, i) => (
          <span key={i} className={`chip${r.k ? ' key' : ''}`}><Ico name={r.i} />{r.t}</span>
        ))}
      </div>
      <div className="sub-end"><Pill st={s.st} label={s.stt} /><span className="sub-date">{s.date}</span></div>
      <div className="sub-go"><Ico name="arrowR" w={2.2} /></div>
    </div>
  );
};

const ModuleRow = ({ m, open, onToggle, onOpenModule, onOpenSub, ringP }) => (
  <div className={`mrow${open ? ' is-open' : ''}`} style={{ '--m': m.m, '--mg': m.mg }}>
    <div className="mrow-head" role="button" tabIndex={0} aria-expanded={open}
         onClick={onToggle}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
      <div className="mrow-ic"><Ico name={m.ic} w={2.1} /></div>
      <div className="mrow-title"><div className="tt">{m.t}</div><div className="sb">{m.cls.toUpperCase()}</div></div>
      <div className="mrow-dates"><span className="k">TIMELINE</span>{m.dates}</div>
      <Pill st={m.st} />
      <div className="ring" style={{ '--p': ringP, '--rc': m.rc }}><span>{ringP}</span></div>
      <div className="mrow-exp"><Ico name="plus" w={2.4} /></div>
    </div>
    <div className="subs"><div className="subs-in"><div className="subs-pad">
      {m.subs.map((s, i) => <SubRow key={i} s={s} m={m} onOpenSub={onOpenSub} />)}
      <div className="mopen">
        <button className="btn btn-thread btn-sm" onClick={(e) => { e.stopPropagation(); onOpenModule(m.open); }}>
          Open {m.t}<Ico name="arrowR" w={2.2} />
        </button>
      </div>
    </div></div></div>
  </div>
);

const StudentHome = ({ onOpenModule, onOpenSub, onNavigate }) => {
  const { user } = useContext(AuthContext);
  // Open the first in-progress module by default.
  const [openId, setOpenId] = useState('Data & Analysis');
  // Live per-module performance from graded assignments (falls back to demo %).
  const [progress, setProgress] = useState({});
  useEffect(() => {
    api.get('/assignments/progress/').then((r) => setProgress(r.data || {})).catch(() => {});
  }, []);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <span className="eyebrow hero-eyebrow">
            <Ico name="spark" />The AI-building school · CBSE CT &amp; AI aligned
          </span>
          <h1>AI literacy,<br /><span className="grad">taught through building.</span></h1>
          <p className="sub">Sutra is a hands-on AI curriculum for Classes 6–12. You don't watch AI — you train real models, wire live agents, and argue the ethics. One thread from arithmetic to intelligence.</p>
          <div className="hero-cta">
            <a className="btn btn-thread btn-lg" href="#flow"
               onClick={(e) => { e.preventDefault(); document.getElementById('flow')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Go to my learning flow<Ico name="arrowDown" w={2.2} />
            </a>
            <a className="btn btn-ghost btn-lg" onClick={() => onNavigate('cbse')}>See the CBSE curriculum</a>
          </div>
          <div className="trust">
            <span className="badge"><Ico name="tick" w={2.4} />CBSE CT &amp; AI (Classes 6–8) mapped</span>
            <span className="badge"><Ico name="tick" w={2.4} />No installs · browser sandbox</span>
            <span className="badge"><Ico name="tick" w={2.4} />Teacher dashboards</span>
          </div>
        </div>
      </section>

      <div className="wrap"><div className="divider" /></div>

      <section className="jour" id="flow">
        <div className="wrap">
          <div className="jour-top">
            <div>
              <span className="eyebrow"><Ico name="trend" />Your learning flow</span>
              <h2 style={{ marginTop: 12 }}>From arithmetic to agents.</h2>
              <p>Welcome back, {firstName(user?.name)} — you're <strong style={{ color: 'var(--t1)' }}>48%</strong> through the AI track.</p>
            </div>
            <div className="jour-who">
              <div className="jour-meta"><div className="nm">{user?.name || 'Student'}</div><div className="cl">CLASS {user?.grade || '8'} · AI TRACK</div></div>
              <div className="jour-av">{initials(user?.name)}</div>
            </div>
          </div>

          <div className="sum">
            <div className="sumc accent">
              <div className="lab"><Ico name="tick" />Track progress</div>
              <div className="big">48%</div><div className="pbar"><i style={{ width: '48%' }} /></div>
              <div className="note">2 of 9 modules complete</div>
            </div>
            <div className="sumc">
              <div className="lab"><Ico name="check" />Assignments due</div>
              <div className="big">2</div><div className="note">Next: Fri, 11 Jul</div>
            </div>
            <div className="sumc">
              <div className="lab"><Ico name="cal" />Next live class</div>
              <div className="big" style={{ fontSize: '1.5rem', marginTop: 18 }}>Data &amp; Analysis</div><div className="note">Thu · 10:00 · Ms. Iyer</div>
            </div>
            <div className="sumc">
              <div className="lab"><Ico name="bolt" />Streak</div>
              <div className="big">5 <span style={{ fontSize: '1.1rem', color: 'var(--t3)', fontWeight: 500 }}>days</span></div><div className="note">Keep it going!</div>
            </div>
          </div>

          <div className="legend">
            <b>Every module:</b>
            <span className="lg"><i style={{ background: 'var(--s-theory)' }} />Theory</span>
            <span className="lg"><i style={{ background: 'var(--s-demo)' }} />Demonstration</span>
            <span className="lg"><i style={{ background: 'var(--s-hands)' }} />Hands-on</span>
            <span className="lg"><i style={{ background: 'var(--s-assign)' }} />Assignment</span>
          </div>

          {PHASES.map(p => (
            <div key={p.no}>
              <div className="phase" style={{ '--pc': p.c }}>
                <div className="phase-no">{p.no}</div>
                <div className="phase-bar" />
                <div><div className="phase-t">{p.t}</div><div className="phase-d">{p.d}</div></div>
              </div>
              <div className="pgroup" style={{ '--pc-a': p.ca }}>
                <div className="mlist">
                  {p.mods.map(m => (
                    <ModuleRow key={m.t} m={m}
                      open={openId === m.t}
                      onToggle={() => setOpenId(openId === m.t ? null : m.t)}
                      onOpenModule={onOpenModule}
                      onOpenSub={onOpenSub}
                      ringP={progress[m.open]?.avg_percent ?? m.p} />
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="raise">
            <div className="raise-l">
              <div className="raise-ic"><Ico name="debate" /></div>
              <div>
                <h4>Stuck on something, or spot a problem?</h4>
                <p>Raise a request — it goes straight to your teacher and the Sutra team.</p>
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('contact')}>Raise a request / report</button>
          </div>
        </div>
      </section>
    </>
  );
};

export default StudentHome;
