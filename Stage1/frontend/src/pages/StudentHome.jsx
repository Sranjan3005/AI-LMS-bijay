import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Ico } from '../components/sutra/icons';
import { firstName, initials } from '../components/sutra/SutraShell';
import { subTarget, moduleOpenTarget } from '../content/flowTargets';
import TodayMission from '../components/story/TodayMission';
import api from '../api';

// In-fiction chapter names — same four activity types, but framed as steps in
// Chiti's story (Briefing → watch Chiti try → your turn → the verdict).
const TYPE = {
  theory: { label: 'Briefing', color: 'var(--s-theory)', icon: 'read' },
  demo: { label: 'Watch Chiti try', color: 'var(--s-demo)', icon: 'play' },
  hands: { label: 'Your turn', color: 'var(--s-hands)', icon: 'terminal' },
  assign: { label: 'The verdict', color: 'var(--s-assign)', icon: 'edit' },
};
const STLABEL = { done: 'Completed', live: 'Ongoing', soon: 'Upcoming' };

// Hero collage — mini product-UI vignettes woven around the tagline (Toddle-style).
// Each card is a tiny, real-looking slice of the platform, tagged with the USP it proves.

// CBSE-aligned learning flow — mapped to the app's real modules via `open`.
const PHASES = [
  { no: '01', t: 'Foundations', d: 'What AI is, and the maths that makes it work.', c: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)', ca: 'rgba(191,90,242,.4)', mods: [
    { t: 'Understanding AI', cls: 'Class 6 · Concept', open: 'foundations', m: 'linear-gradient(135deg,#BF5AF2,#5E5CE6)', mg: 'rgba(191,90,242,.3)', rc: '#BF5AF2', ic: 'book', dates: '02 Jun – 12 Jun', st: 'done', p: 100, subs: [
      { ty: 'theory', n: 'What is AI, really?', d: 'The big idea in 4 steps — teach a machine yourself and see how AI learns from examples instead of fixed rules.', date: '02 Jun', st: 'done', stt: 'Done', res: [{ t: 'Interactive lesson', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'When rules break — and robots learn', d: 'Program a delivery robot with if-else rules, watch them fail in a busy market, then watch it learn by trial and reward.', date: '05 Jun', st: 'done', stt: 'Done', res: [{ t: 'Interactive demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Spot the AI around you', d: 'Sort everyday apps into AI / not-AI and see the reason behind every answer.', date: '08 Jun', st: 'done', stt: 'Done', res: [{ t: 'Activity', i: 'terminal', k: 1 }] },
      { ty: 'assign', n: 'Quiz: AI in daily life', d: 'Auto-graded check on core ideas and the AI project cycle.', date: '12 Jun · 9/10', st: 'done', stt: 'Graded', res: [{ t: 'Quiz', i: 'check', k: 1 }] },
    ] },
    { t: 'Maths for AI', cls: 'Class 6 · Concept', open: 'foundations', m: 'linear-gradient(135deg,#7C7AFF,#5E5CE6)', mg: 'rgba(94,92,230,.3)', rc: '#7C7AFF', ic: 'sigma', dates: '13 Jun – 24 Jun', st: 'done', p: 100, subs: [
      { ty: 'theory', n: 'Numbers, graphs & slope', d: 'Explainer resource: the arithmetic→algebra→calculus chain, and why slope is “how fast things change”.', date: '13 Jun', st: 'done', stt: 'Done', res: [{ t: 'Explainer', i: 'read', k: 1 }, { t: '6 min read', i: 'book' }] },
      { ty: 'demo', n: 'The auto-rickshaw fare meter', d: 'Set the base fare and rate per km — and watch y = mx + c draw a live prediction line.', date: '16 Jun', st: 'done', stt: 'Done', res: [{ t: 'Demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Play with slope & weights', d: 'Drag slope & intercept sliders to fit a line through real points and watch the error fall.', date: '19 Jun', st: 'done', stt: 'Done', res: [{ t: 'Sandbox', i: 'sliders', k: 1 }] },
      { ty: 'assign', n: 'Worksheet: read a graph', d: 'Interpret trends and predict the next value from a chart.', date: '24 Jun · 8/10', st: 'done', stt: 'Graded', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '02', t: 'Working with Data', d: 'Where models get their fuel — collect it, clean it, question it.', c: 'linear-gradient(135deg,#64D2FF,#0A84FF)', ca: 'rgba(100,210,255,.4)', mods: [
    { t: 'Data & Analysis', cls: 'Class 6–7 · Data Lab', open: 'data', m: 'linear-gradient(135deg,#64D2FF,#0A84FF)', mg: 'rgba(100,210,255,.3)', rc: '#64D2FF', ic: 'bars', dates: '01 Jul – 22 Jul', st: 'live', p: 60, subs: [
      { ty: 'theory', n: 'What is data, really?', d: 'Explainer resource: rows, features, labels, data types (text, numbers, images, sound) and where bias sneaks in.', date: '01 Jul', st: 'done', stt: 'Done', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Chart Detective — read the story', d: 'Read bar, line & pie charts, answer quick checks, and catch a biased survey red-handed.', date: '05 Jul', st: 'done', stt: 'Done', res: [{ t: 'Demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Which chart fits your data?', d: 'Upload a small CSV (or use ours), pick a chart for it, and learn which chart suits which data.', date: '09 Jul', st: 'live', stt: 'In progress', res: [{ t: 'Sandbox', i: 'terminal', k: 1 }, { t: 'Upload CSV', i: 'file' }] },
      { ty: 'hands', alt: true, n: 'Speak AI — word match', d: 'Match the words of AI — model, label, bias, accuracy — to their kid-friendly meanings.', date: '10 Jul', st: 'live', stt: 'New', res: [{ t: 'Game', i: 'terminal', k: 1 }] },
      { ty: 'assign', n: 'Project: clean a messy dataset', d: 'Turn a raw, dirty dataset into model-ready data and explain your steps.', date: 'due 11 Jul', st: 'soon', stt: 'Not started', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
  ] },
  { no: '03', t: 'Machine-Learning Models', d: 'One model per module — build each from the ground up.', c: 'linear-gradient(135deg,#30D158,#0A84FF)', ca: 'rgba(48,209,88,.4)', mods: [
    { t: 'Linear Regression', cls: 'Class 7 · Model', open: 'regression', m: 'linear-gradient(135deg,#30D158,#00C7BE)', mg: 'rgba(48,209,88,.3)', rc: '#30D158', ic: 'trend', dates: '15 Jul – 25 Jul', st: 'live', p: 35, subs: [
      { ty: 'theory', n: 'How regression fits a line', d: 'Explainer resource: best-fit lines, error, and predicting a number — the concept before the console.', date: '15 Jul', st: 'live', stt: 'Reading', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Explore regression scenarios', d: 'Pick a real-world problem — lemonade sales, exam scores, viral posts — and train a model to predict a number.', date: '18 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Scenario lab', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train on your own data', d: 'Collect or create your own data for a scenario, then train a regression model on it.', date: '22 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Data lab', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Build & explain a regressor', d: 'Ship a working regression model with a 5-part explainable-AI write-up.', date: 'due 25 Jul', st: 'soon', stt: 'Upcoming', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Classification', cls: 'Class 7 · Model', open: 'classification', m: 'linear-gradient(135deg,#00C7BE,#0A84FF)', mg: 'rgba(0,199,190,.3)', rc: '#00C7BE', ic: 'scatter', dates: '28 Jul – 07 Aug', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'How classifiers draw boundaries', d: 'Explainer resource: categories, decision boundaries and accuracy vs. a fair guess.', date: '28 Jul', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Explore classification scenarios', d: 'Pick a problem — spam, waste sorting, mushrooms — and train a model to put things in the right group.', date: '31 Jul', st: 'soon', stt: 'Locked', res: [{ t: 'Scenario lab', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train on your own data', d: 'Create your own labelled examples for a scenario, then train and test a classifier on them.', date: '04 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Data lab', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Build your own classifier', d: 'Pick a problem, build a classifier, and defend where it fails.', date: 'due 07 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Neural Networks', cls: 'Class 8 · Model', open: 'neural', m: 'linear-gradient(135deg,#0A84FF,#5E5CE6)', mg: 'rgba(10,132,255,.3)', rc: '#0A84FF', ic: 'neural', dates: '11 Aug – 22 Aug', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'Neurons, layers & weights', d: 'Explainer resource: how stacking simple units lets a network learn complex patterns.', date: '11 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Explore neural-network scenarios', d: 'Pick a scenario — reading speed signs, spotting emotions — and watch a network learn as its accuracy climbs.', date: '14 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Scenario lab', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Train on your own data', d: 'Create your own examples for a scenario, then train and test a neural network on them.', date: '18 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Data lab', i: 'lab', k: 1 }] },
      { ty: 'assign', n: 'Tune a network', d: 'Improve a starter network and explain what each change did.', date: 'due 22 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Submit', i: 'edit', k: 1 }] },
    ] },
    { t: 'Computer Vision', cls: 'Class 8 · Model', open: 'vision', m: 'linear-gradient(135deg,#FF9F0A,#FF375F)', mg: 'rgba(255,159,10,.3)', rc: '#FF9F0A', ic: 'eye', dates: '25 Aug – 05 Sep', st: 'soon', p: 0, subs: [
      { ty: 'theory', n: 'How machines see', d: 'Explainer resource: pixels, features and how an image becomes numbers a model can read.', date: '25 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Explainer', i: 'read', k: 1 }] },
      { ty: 'demo', n: 'Vision Playground — detect, trace, read', d: 'Run real AI in your browser: detect objects with your webcam, trace edges, and read handwritten digits.', date: '28 Aug', st: 'soon', stt: 'Locked', res: [{ t: 'Live demo', i: 'play', k: 1 }] },
      { ty: 'hands', n: 'Explore vision scenarios', d: 'Draw or upload your own images — digits, handwriting, shapes — and watch the AI see them stage by stage.', date: '01 Sep', st: 'soon', stt: 'Locked', res: [{ t: 'Scenario lab', i: 'lab', k: 1 }] },
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

// ISO date → "Fri, 11 Jul"
const formatDue = (iso) => {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  } catch { return ''; }
};

const SubRow = ({ s, m, onOpenSub, locked }) => {
  const T = TYPE[s.ty];
  const go = () => { if (!locked) onOpenSub(subTarget(m, s), s, m); };
  return (
    <div className={`sub ${locked ? 'is-locked' : 'is-click'}`} style={{ '--fc': T.color }} role="button" tabIndex={locked ? -1 : 0}
         aria-disabled={locked || undefined}
         onClick={go}
         onKeyDown={(e) => { if (!locked && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go(); } }}>
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
      {locked ? (
        <div className="sub-end"><span className="pill soon"><span className="dot" />Locked</span><span className="sub-date">Finish the module to unlock</span></div>
      ) : (
        <div className="sub-end"><Pill st={s.st} label={s.stt} /><span className="sub-date">{s.date}</span></div>
      )}
      <div className="sub-go"><Ico name={locked ? 'lock' : 'arrowR'} w={2.2} /></div>
    </div>
  );
};

const ModuleRow = ({ m, st, open, onToggle, onOpenSub, onOpenCaseFile, ringP, completion, unlocked, perf }) => (
  <div className={`mrow${open ? ' is-open' : ''}`} id={`mod-${m.t}`} style={{ '--m': m.m, '--mg': m.mg }}>
    <div className="mrow-head" role="button" tabIndex={0} aria-expanded={open}
         onClick={onToggle}
         onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}>
      <div className="mrow-ic"><Ico name={m.ic} w={2.1} /></div>
      <div className="mrow-title"><div className="tt">{m.t}</div><div className="sb">{m.cls.toUpperCase()}</div></div>
      <div className="mrow-dates"><span className="k">TIMELINE</span>{m.dates}</div>
      <Pill st={st || m.st} />
      <div className="ring" style={{ '--p': ringP, '--rc': m.rc }}><span>{ringP}</span></div>
      <div className="mrow-exp"><Ico name="plus" w={2.4} /></div>
    </div>
    <div className="subs"><div className="subs-in"><div className="subs-pad">
      <div className="mstats">
        <div className="mstat">
          <div className="mstat-lab">Module completion</div>
          <div className="cbar"><i style={{ width: `${Math.round(completion / 3 * 100)}%`, background: m.m }} /></div>
          <div className="mstat-sub">{completion}/3 activities{unlocked ? ' · assignment unlocked' : ''}</div>
        </div>
        <div className="mstat">
          <div className="mstat-lab">Performance</div>
          <div className="mstat-val" style={{ '--rc': m.rc }}>{perf?.avg_percent != null ? `${perf.avg_percent}%` : '—'}</div>
          <div className="mstat-sub">{perf?.graded ? `avg over ${perf.graded} graded task${perf.graded > 1 ? 's' : ''}` : 'No tasks graded yet'}</div>
        </div>
      </div>
      {m.subs.map((s, i) => <SubRow key={i} s={s} m={m} onOpenSub={onOpenSub} locked={s.ty === 'assign' && !unlocked} />)}
      <div className="mopen" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {onOpenCaseFile && (
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onOpenCaseFile(m); }}>
            <Ico name="book" w={2.2} />Read the case file
          </button>
        )}
        <button className="btn btn-thread btn-sm" onClick={(e) => { e.stopPropagation(); onOpenSub(moduleOpenTarget(m), null, m); }}>
          Open {m.t}<Ico name="arrowR" w={2.2} />
        </button>
      </div>
    </div></div></div>
  </div>
);

const CHAPTER_ORDER = ['theory', 'demo', 'hands', 'assign'];

const StudentHome = ({ initialOpen, onOpenSub, onOpenCaseFile, onOpenChapter, onNavigate, classFilter, onClearClassFilter, mobileTab = 'today' }) => {
  const { user } = useContext(AuthContext);
  // Re-open the module the student last visited (else the first in-progress one).
  const [openId, setOpenId] = useState(initialOpen || 'Data & Analysis');

  // CBSE "Open learning flow" → show only the modules that class covers.
  const modFilter = classFilter?.modules || null;
  const inFilter = (m) => !modFilter || modFilter.includes(m.t);
  const phasesToShow = modFilter
    ? PHASES.map(p => ({ ...p, mods: p.mods.filter(inFilter) })).filter(p => p.mods.length)
    : PHASES;

  // When a class filter arrives, open its first module so the flow isn't all collapsed.
  useEffect(() => {
    if (!modFilter) return;
    const first = PHASES.flatMap(p => p.mods).find(inFilter);
    if (first) setOpenId(first.t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter]);
  // Live per-module performance from graded assignments (falls back to demo %).
  const [progress, setProgress] = useState({});
  const [activity, setActivity] = useState({});                        // {module_key: [subtypes opened]}
  const [summary, setSummary] = useState({ pending: 0, next_due: null }); // front-page due card
  useEffect(() => {
    api.get('/assignments/progress/').then((r) => setProgress(r.data || {})).catch(() => {});
    api.get('/assignments/activity/').then((r) => setActivity(r.data || {})).catch(() => {});
    api.get('/assignments/summary/').then((r) => setSummary(r.data || { pending: 0, next_due: null })).catch(() => {});
  }, []);

  // Real submodule completion: opening theory/demo/hands. All three (or an
  // already-placed task) unlocks the module's assignment.
  const openedCount = (m) => (['theory', 'demo', 'hands'].filter(t => (activity[m.open] || []).includes(t)).length);
  const isUnlocked = (m) => openedCount(m) >= 3 || (progress[m.open]?.assigned > 0);
  // Module completion = activities opened (theory/demo/hands) out of 3. This is
  // the single source of truth for BOTH the header ring and the completion bar,
  // so they always agree. Performance (avg score) is shown separately.
  const completionPct = (m) => Math.round(openedCount(m) / 3 * 100);
  // Derive live module status + track totals from graded work (authored fallbacks).
  const statusFor = (m) => {
    const pr = progress[m.open];
    if (!pr || !pr.assigned) return m.st;
    if (pr.graded === pr.assigned) return 'done';
    if (pr.graded > 0) return 'live';
    return m.st;
  };
  const allMods = PHASES.flatMap(p => p.mods);
  const ringOf = (m) => completionPct(m);
  const doneCount = allMods.filter(m => statusFor(m) === 'done').length;
  const trackPct = Math.round(allMods.reduce((a, m) => a + ringOf(m), 0) / allMods.length);

  // The single "next chapter" that drives the Today's-mission card: the first
  // not-yet-opened chapter, walking the flow in order. Assignments only count
  // once their module's three core chapters are done.
  const nextChapter = (() => {
    for (const m of allMods) {
      const opened = activity[m.open] || [];
      const coreDone = ['theory', 'demo', 'hands'].every(c => opened.includes(c));
      for (const ty of CHAPTER_ORDER) {
        if (ty === 'assign' && !coreDone) continue;
        if (!opened.includes(ty)) {
          const sub = m.subs.find(s => s.ty === ty);
          return { moduleTitle: m.t, subType: ty, moduleKey: m.open, m, sub };
        }
      }
    }
    return null;
  })();
  const resumeChapter = () => {
    if (!nextChapter?.sub) return;
    if (onOpenChapter) onOpenChapter(nextChapter.m, nextChapter.subType);
    else onOpenSub(subTarget(nextChapter.m, nextChapter.sub), nextChapter.sub, nextChapter.m);
  };

  // Core chapters (theory/demo/hands) go through the story flow so their Back
  // lands on the StoryBeat reveal; everything else uses the plain sub opener.
  const openSubOrChapter = (target, s, m) => {
    if (onOpenChapter && s && ['theory', 'demo', 'hands'].includes(s.ty)) return onOpenChapter(m, s.ty);
    return onOpenSub(target, s, m);
  };

  // On return from a lesson/explainer, scroll the last-opened module into view.
  useEffect(() => {
    if (!initialOpen) return;
    const raf = requestAnimationFrame(() => {
      document.getElementById(`mod-${initialOpen}`)?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(raf);
  }, [initialOpen]);

  return (
    <div data-mtab={mobileTab}>
      {/* Today — the focused mission (one thing per screen on mobile) */}
      <div className="mpane mpane-today">
        <div className="wrap">
          <TodayMission
            user={user}
            activity={activity}
            current={nextChapter}
            onStartMission={() => nextChapter && onOpenCaseFile?.(nextChapter.m)}
            onResumeChapter={resumeChapter}
          />
        </div>
      </div>

      {/* Path — the full learning journey (its own tab on mobile) */}
      <div className="mpane mpane-path">
      <div className="wrap"><div className="divider" /></div>

      <section className="jour" id="flow">
        <div className="wrap">
          <div className="jour-top">
            <div>
              <span className="eyebrow"><Ico name="trend" />Your learning flow</span>
              <h2 style={{ marginTop: 12 }}>From arithmetic to agents.</h2>
              <p>Welcome back, {firstName(user?.name)} — you're <strong style={{ color: 'var(--t1)' }}>{trackPct}%</strong> through the AI track.</p>
            </div>
            <div className="jour-who">
              <div className="jour-meta"><div className="nm">{user?.name || 'Student'}</div><div className="cl">CLASS {user?.grade || '8'} · AI TRACK</div></div>
              <div className="jour-av">{initials(user?.name)}</div>
            </div>
          </div>

          <div className="sum">
            <div className="sumc accent">
              <div className="lab"><Ico name="tick" />Track progress</div>
              <div className="big">{trackPct}%</div><div className="pbar"><i style={{ width: `${trackPct}%` }} /></div>
              <div className="note">{doneCount} of {allMods.length} modules complete</div>
            </div>
            <div className="sumc">
              <div className="lab"><Ico name="check" />Assignments due</div>
              <div className="big">{summary.pending ?? 0}</div>
              <div className="note">{summary.next_due ? `Next: ${formatDue(summary.next_due)}` : 'Nothing due — nice!'}</div>
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
            <b>Every mission:</b>
            <span className="lg"><i style={{ background: 'var(--s-theory)' }} />Briefing</span>
            <span className="lg"><i style={{ background: 'var(--s-demo)' }} />Watch Chiti try</span>
            <span className="lg"><i style={{ background: 'var(--s-hands)' }} />Your turn</span>
            <span className="lg"><i style={{ background: 'var(--s-assign)' }} />The verdict</span>
          </div>

          {modFilter && (
            <div className="classfilter">
              <span className="cf-txt">
                Showing <strong>Class {classFilter.cls}</strong> modules — the ones CBSE places in this class.
              </span>
              <button className="btn btn-ghost btn-sm" onClick={onClearClassFilter}>Show all modules</button>
            </div>
          )}

          {phasesToShow.map(p => (
            <div key={p.no}>
              <div className="phase" style={{ '--pc': p.c }}>
                <div className="phase-no">{p.no}</div>
                <div className="phase-bar" />
                <div><div className="phase-t">{p.t}</div><div className="phase-d">{p.d}</div></div>
              </div>
              <div className="pgroup" style={{ '--pc-a': p.ca }}>
                <div className="mlist">
                  {p.mods.map(m => (
                    <ModuleRow key={m.t} m={m} st={statusFor(m)}
                      open={openId === m.t}
                      onToggle={() => setOpenId(openId === m.t ? null : m.t)}
                      onOpenSub={openSubOrChapter}
                      onOpenCaseFile={onOpenCaseFile}
                      ringP={ringOf(m)}
                      completion={openedCount(m)}
                      unlocked={isUnlocked(m)}
                      perf={progress[m.open]} />
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
      </div>{/* /mpane-path */}
    </div>
  );
};

export default StudentHome;
