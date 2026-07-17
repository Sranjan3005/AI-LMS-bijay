import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Search, Zap, ShieldAlert, Cpu, Star } from 'lucide-react';
import AgenticWorkspace from './AgenticWorkspace';

const SCENARIOS = [
  {
    id: 'fake-news',
    title: 'Fake News Detective',
    description: 'An AI pipeline that reads an article and searches the web to verify its facts.',
    icon: <ShieldAlert size={24} color="#ef4444" />,
    color: '#ef4444',
    nodes: [
      { id: 'node_1', type: 'textInput', position: { x: 80, y: 190 }, data: { label: 'Article Text' } },
      { id: 'node_3', type: 'webSearch', position: { x: 440, y: 30 }, data: { label: 'Fact Check' } },
      { id: 'node_4', type: 'merger', position: { x: 820, y: 190 }, data: { label: 'Combine Results' } },
      { id: 'node_5', type: 'customizer', position: { x: 1140, y: 190 }, data: { label: 'Verdict Generator', prompt: 'Determine if this is fake news based on the article and the fact-check evidence.' } },
      { id: 'node_6', type: 'display', position: { x: 1460, y: 190 }, data: { label: 'Final Output' } }
    ],
    edges: [
      { id: 'e1-3', source: 'node_1', target: 'node_3' },
      { id: 'e1-4', source: 'node_1', target: 'node_4' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' },
      { id: 'e4-5', source: 'node_4', target: 'node_5' },
      { id: 'e5-6', source: 'node_5', target: 'node_6' }
    ]
  },
  {
    id: 'wildlife-drone',
    title: 'Wildlife Rescue Drone',
    description: 'Processes images from drones to identify endangered animals and alert nearby rangers.',
    icon: <Zap size={24} color="#eab308" />,
    color: '#eab308',
    nodes: [
      { id: 'node_1', type: 'objectDetection', position: { x: 100, y: 160 }, data: { label: 'Animal Detector' } },
      { id: 'node_2', type: 'decider', position: { x: 480, y: 160 }, data: { label: 'Is it endangered?', condition: 'One of the detected animals is an endangered species (e.g. elephant, tiger, rhino, zebra, giraffe, panda).' } },
      { id: 'node_3', type: 'messenger', position: { x: 860, y: 60 }, data: { label: 'Alert Rangers', recipient: 'Forest Rangers' } },
      { id: 'node_4', type: 'display', position: { x: 860, y: 280 }, data: { label: 'Ignore (common animal)' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3', sourceHandle: 'true' },
      { id: 'e2-4', source: 'node_2', target: 'node_4', sourceHandle: 'false' }
    ]
  },
  {
    id: 'smart-cafe',
    title: 'Smart Cafeteria',
    description: 'Analyzes student feedback documents to generate a cafeteria satisfaction chart.',
    icon: <Cpu size={24} color="#3b82f6" />,
    color: '#3b82f6',
    nodes: [
      { id: 'node_1', type: 'documentReader', position: { x: 100, y: 100 }, data: { label: 'Feedback Forms' } },
      { id: 'node_2', type: 'summarizer', position: { x: 400, y: 100 }, data: { label: 'Extract Key Topics' } },
      { id: 'node_3', type: 'sentimentRadar', position: { x: 700, y: 100 }, data: { label: 'Score Topics' } },
      { id: 'node_4', type: 'chartGenerator', position: { x: 1000, y: 100 }, data: { label: 'Satisfaction Chart' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e2-3', source: 'node_2', target: 'node_3' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' }
    ]
  },
  {
    id: 'review-reply',
    title: 'Auto Review Responder',
    description: 'Reads a Google-Maps review, gauges its mood, fact-checks it against the business records, drafts a reply, and escalates to management if changes are needed.',
    icon: <Star size={24} color="#f59e0b" />,
    color: '#f59e0b',
    nodes: [
      { id: 'node_1', type: 'textInput', position: { x: 80, y: 180 }, data: { label: 'Customer Review' } },
      { id: 'node_2', type: 'sentimentRadar', position: { x: 380, y: 70 }, data: { label: 'Read the Mood' } },
      { id: 'node_3', type: 'customizer', position: { x: 380, y: 300 }, data: { label: 'Fact-Check (internal records)', prompt: 'Check the review’s specific claims (dish names, prices, wait times, staff) against our restaurant’s internal menu and policy records. List what is accurate and what is mistaken.' } },
      { id: 'node_4', type: 'merger', position: { x: 700, y: 185 }, data: { label: 'Combine Findings' } },
      { id: 'node_5', type: 'customizer', position: { x: 960, y: 185 }, data: { label: 'Draft the Reply', prompt: 'Using the mood and the fact-check, write a warm, professional public reply to this review. Thank genuine praise, politely correct any factual mistakes, and apologise for real problems.' } },
      { id: 'node_6', type: 'decider', position: { x: 1240, y: 185 }, data: { label: 'Needs management action?', condition: 'The review reports a serious, genuine problem (safety, hygiene, staff misconduct, or a refund) that a manager must act on.' } },
      { id: 'node_7', type: 'display', position: { x: 1520, y: 80 }, data: { label: 'Auto-post the reply' } },
      { id: 'node_8', type: 'display', position: { x: 1520, y: 300 }, data: { label: 'Escalate to Management' } }
    ],
    edges: [
      { id: 'e1-2', source: 'node_1', target: 'node_2' },
      { id: 'e1-3', source: 'node_1', target: 'node_3' },
      { id: 'e2-4', source: 'node_2', target: 'node_4' },
      { id: 'e3-4', source: 'node_3', target: 'node_4' },
      { id: 'e4-5', source: 'node_4', target: 'node_5' },
      { id: 'e5-6', source: 'node_5', target: 'node_6' },
      { id: 'e6-7', source: 'node_6', target: 'node_7', sourceHandle: 'false' },
      { id: 'e6-8', source: 'node_6', target: 'node_8', sourceHandle: 'true' }
    ]
  }
];

// Shared "how to run" tail for every Chiti walkthrough.
const RUN_STEPS = [
  { target: '[data-guide="save"]', mood: 'think', say: 'When you\'re ready, hit Save so the computer can run your pipeline.' },
  { target: '[data-guide="run"]', mood: 'think', say: 'Then press “Test Pipeline” — your data now flows through every node.' },
  { target: '[data-guide="run"]', mood: 'point', say: 'Each node reports its result in the log panel that pops up here.' },
];

// Chiti's per-scenario walkthrough — spotlights that scenario's real nodes by id.
const GUIDES = {
  'wildlife-drone': [
    { target: '[data-guide="canvas"]', mood: 'point', say: "Hi, I'm Chiti! 🤖 This drone pipeline turns aerial photos into ranger alerts. Let me show you the parts 🦌" },
    { target: '[data-id="node_1"]', mood: 'think', say: 'The Animal Detector (Object Detection) scans each drone photo and lists every animal it finds.' },
    { target: '[data-id="node_2"]', mood: 'point', say: "The Decider checks its condition — is any animal endangered? — and splits the path in two." },
    { target: '[data-id="node_3"]', mood: 'point', say: 'If yes → Alert Rangers. If no → the other branch just ignores it.' },
    ...RUN_STEPS,
    { target: '[data-guide="demo"]', mood: 'cheer', say: "When it finishes, the “See it in action” button lights up — click it to watch the boxes and alert play out! 🎬" },
  ],
  'fake-news': [
    { target: '[data-guide="canvas"]', mood: 'point', say: "Hi, I'm Chiti! 🕵️ This pipeline reads an article and checks whether it's trustworthy." },
    { target: '[data-id="node_1"]', mood: 'think', say: 'Paste the article text here — that’s the input the pipeline reads.' },
    { target: '[data-id="node_3"]', mood: 'think', say: 'Fact Check searches the web for evidence about the article’s claims.' },
    { target: '[data-id="node_4"]', mood: 'point', say: 'The Merger combines the original article with the evidence it found.' },
    { target: '[data-id="node_5"]', mood: 'point', say: 'The Verdict Generator weighs it all up and decides: real or fake?' },
    ...RUN_STEPS,
    { target: '[data-guide="canvas"]', mood: 'cheer', say: 'The final verdict lands in the Display node. You just built a fact-checker! 🎉' },
  ],
  'smart-cafe': [
    { target: '[data-guide="canvas"]', mood: 'point', say: "Hi, I'm Chiti! 📊 This turns a pile of feedback forms into one clear chart." },
    { target: '[data-id="node_1"]', mood: 'think', say: 'Feedback Forms reads the documents students submitted.' },
    { target: '[data-id="node_2"]', mood: 'think', say: 'Extract Key Topics summarises hundreds of comments into the main themes.' },
    { target: '[data-id="node_3"]', mood: 'point', say: 'Score Topics rates how positive or negative each theme is.' },
    { target: '[data-id="node_4"]', mood: 'point', say: 'Satisfaction Chart draws all those scores as one picture.' },
    ...RUN_STEPS,
    { target: '[data-guide="canvas"]', mood: 'cheer', say: 'From messy forms to a clean chart — that’s the power of a pipeline! 🎉' },
  ],
  'review-reply': [
    { target: '[data-guide="canvas"]', mood: 'point', say: "Hi, I'm Chiti! 🌟 This drafts a reply to a Google review — and knows when to call a manager." },
    { target: '[data-id="node_2"]', mood: 'think', say: 'Read the Mood scores whether the review is happy or angry.' },
    { target: '[data-id="node_3"]', mood: 'think', say: 'Fact-Check compares the review’s claims against our own records.' },
    { target: '[data-id="node_5"]', mood: 'point', say: 'Draft the Reply writes a polite response using the mood and the facts.' },
    { target: '[data-id="node_6"]', mood: 'point', say: 'The Decider checks: does a real problem need a manager to step in?' },
    ...RUN_STEPS,
    { target: '[data-guide="canvas"]', mood: 'cheer', say: 'Routine replies auto-post; serious ones escalate. Smart and safe! 🎉' },
  ],
};

// Deep "why this pipeline" explainer shown before building.
const EXPLAINERS = {
  'wildlife-drone': {
    goal: 'Spot endangered animals in drone photos and automatically alert rangers — without a human watching every single frame.',
    flow: [
      { node: 'Animal Detector', type: 'Object Detection', why: 'The input is a photo and we need to find the animals in it, so we use a dedicated Object-Detection node — a fixed ML task, not a free-text prompt.' },
      { node: 'Is it endangered?', type: 'Decider', why: 'We must react differently for rare vs common animals, so a Decider checks a condition and routes to ONLY one branch.' },
      { node: 'Alert Rangers', type: 'Send Message', why: 'The TRUE branch takes an action — it dispatches an alert to the rangers with the sighting.' },
      { node: 'Ignore', type: 'Display', why: 'The FALSE branch simply logs common animals — no action needed.' },
    ],
  },
  'fake-news': {
    goal: 'Judge whether a news article is trustworthy by checking its claims against real evidence on the web.',
    flow: [
      { node: 'Article Text', type: 'Text Input', why: 'The article is plain text, so a simple text-input node starts the flow.' },
      { node: 'Fact Check', type: 'Web Search', why: 'To verify claims we look them up online — the Web Search node fetches outside evidence.' },
      { node: 'Combine Results', type: 'Merger', why: 'The verdict needs BOTH the article and the evidence, so a Merger unites the two streams.' },
      { node: 'Verdict Generator', type: 'Customizer (AI)', why: 'An AI reasons over the combined info and writes a real-or-fake judgement.' },
      { node: 'Final Output', type: 'Display', why: 'The Display node shows the verdict to the reader.' },
    ],
  },
  'smart-cafe': {
    goal: 'Turn a stack of written cafeteria feedback forms into a single, clear satisfaction chart.',
    flow: [
      { node: 'Feedback Forms', type: 'Document Reader', why: 'The input is documents, so a Document Reader ingests the raw text.' },
      { node: 'Extract Key Topics', type: 'Summarizer', why: 'Hundreds of comments are too many to read — the Summarizer distils them into key themes.' },
      { node: 'Score Topics', type: 'Sentiment Radar', why: 'For each theme we measure mood, so a Sentiment node scores positive vs negative.' },
      { node: 'Satisfaction Chart', type: 'Chart Generator', why: 'Numbers are clearer as a picture — the Chart node visualises the scores.' },
    ],
  },
  'review-reply': {
    goal: 'Automatically read a customer review, draft a fitting public reply, and escalate serious problems to management.',
    flow: [
      { node: 'Customer Review', type: 'Text Input', why: 'The review arrives as text, so a text-input node begins the flow.' },
      { node: 'Read the Mood', type: 'Sentiment Radar', why: 'Tone changes the reply, so we measure sentiment first.' },
      { node: 'Fact-Check (internal records)', type: 'Customizer (AI)', why: 'Claims about prices or menu must be checked against OUR data, not the web — a Customizer prompt does this against internal records.' },
      { node: 'Combine Findings', type: 'Merger', why: 'The reply needs the mood AND the fact-check, so a Merger brings them together.' },
      { node: 'Draft the Reply', type: 'Customizer (AI)', why: 'An AI writes a warm, accurate response from the combined findings.' },
      { node: 'Needs management action?', type: 'Decider', why: 'Some reviews report real problems — a Decider routes those to a human.' },
      { node: 'Auto-post / Escalate', type: 'Display ×2', why: 'Routine replies post automatically; serious ones are escalated to management.' },
    ],
  },
};

function ScenarioExplainer({ scenario, onBuild, onClose }) {
  const ex = EXPLAINERS[scenario.id];
  if (!ex) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(4,6,14,.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(760px, 96vw)', maxHeight: '90vh', overflow: 'auto', background: 'rgba(16,20,32,.98)', border: `1px solid ${scenario.color}55`, borderRadius: 20, padding: 26, color: '#f2f3f8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ background: `${scenario.color}22`, width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{scenario.icon}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>{scenario.title}</h2>
            <div style={{ color: '#94a3b8', fontSize: '.85rem' }}>Pre-built pipeline · {ex.flow.length} nodes</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ background: `${scenario.color}14`, border: `1px solid ${scenario.color}44`, borderRadius: 12, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.1em', color: scenario.color, fontWeight: 700, marginBottom: 4 }}>The goal</div>
          <div style={{ color: '#e2e8f0', lineHeight: 1.6 }}>{ex.goal}</div>
        </div>

        <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.1em', color: '#94a3b8', fontWeight: 700, marginBottom: 12 }}>How the pipeline works — and why these nodes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ex.flow.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: scenario.color, color: '#05060f', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</div>
                {i < ex.flow.length - 1 && <div style={{ width: 2, flex: 1, background: `${scenario.color}55`, margin: '2px 0' }} />}
              </div>
              <div style={{ paddingBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: '1.02rem' }}>{f.node}</b>
                  <span style={{ fontSize: '.72rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1' }}>{f.type}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '.92rem', lineHeight: 1.55, marginTop: 3 }}>{f.why}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1', padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Maybe later</button>
          <button onClick={onBuild} style={{ flex: 1, background: `linear-gradient(135deg, ${scenario.color}, ${scenario.color}bb)`, border: 0, color: '#05060f', padding: '11px 18px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: '1rem' }}>Build this pipeline →</button>
        </div>
      </div>
    </div>
  );
}

export default function ExploreTab({ onBack, autoLaunchId }) {
  const [explainScenario, setExplainScenario] = useState(null);
  // Deep-link from the learning flow: auto-launch a preset template by id.
  const [loadingScenario, setLoadingScenario] = useState(
    autoLaunchId ? SCENARIOS.find(s => s.id === autoLaunchId) || null : null
  );
  const [loadingStep, setLoadingStep] = useState(0);
  const [showWorkspace, setShowWorkspace] = useState(false);

  useEffect(() => {
    if (loadingScenario) {
      const steps = 4;
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep += 1;
        setLoadingStep(currentStep);
        if (currentStep >= steps) {
          clearInterval(interval);
          setTimeout(() => setShowWorkspace(true), 800);
        }
      }, 800);
      return () => clearInterval(interval);
    }
  }, [loadingScenario]);

  if (showWorkspace && loadingScenario) {
    return <AgenticWorkspace 
      onBackToDashboard={onBack} 
      presetFlow={{
        id: loadingScenario.id,
        name: loadingScenario.title,
        nodes: loadingScenario.nodes,
        edges: loadingScenario.edges,
        guide: GUIDES[loadingScenario.id],
      }}
      isExploreMode={true}
    />;
  }

  if (loadingScenario) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f111a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px', animation: 'pulse 1.5s infinite' }}>
          <Cpu size={40} color="#38bdf8" />
        </div>
        <h2 style={{ fontSize: '2rem', marginBottom: '30px' }}>AI is building your architecture...</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
          {['Parsing scenario requirements', 'Selecting appropriate LLM nodes', 'Wiring input and output channels', 'Finalizing graph state'].map((text, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: loadingStep >= idx ? 1 : 0.3, transition: 'opacity 0.5s' }}>
              {loadingStep > idx ? <CheckCircle2 color="#10b981" size={20} /> : <div style={{width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #475569'}} />}
              <span style={{ color: loadingStep > idx ? '#f8fafc' : '#94a3b8' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f111a', color: 'white', padding: '40px' }}>
      <button onClick={onBack} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '40px', background: 'rgba(255,255,255,0.05)', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#cbd5e1', cursor: 'pointer' }}>
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '15px' }}>Explore Templates</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Select a predefined AI pipeline and watch the architecture build itself.</p>
      </div>

      <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
        {SCENARIOS.map(scenario => (
          <div 
            key={scenario.id}
            onClick={() => EXPLAINERS[scenario.id] ? setExplainScenario(scenario) : setLoadingScenario(scenario)}
            style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '30px',
              width: '320px',
              cursor: 'pointer',
              transition: 'transform 0.2s, background 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.8)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)'; }}
          >
            <div style={{ background: `${scenario.color}22`, width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
              {scenario.icon}
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '12px', color: '#f8fafc' }}>{scenario.title}</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.5' }}>{scenario.description}</p>
          </div>
        ))}
      </div>

      {explainScenario && (
        <ScenarioExplainer
          scenario={explainScenario}
          onClose={() => setExplainScenario(null)}
          onBuild={() => { setLoadingScenario(explainScenario); setExplainScenario(null); }}
        />
      )}
    </div>
  );
}
