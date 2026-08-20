import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  useReactFlow,
  useOnSelectionChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Play, Save, ArrowLeft, Trash2, Terminal, X, Bot, ClipboardCheck, Sparkles } from 'lucide-react';
import api, { API_BASE_URL } from '../../api';
import './AgenticFlow.css';

// Derive the WebSocket origin from the API base URL so it works on Azure
// (https -> wss) and locally (http -> ws) without code changes.
const WS_ORIGIN = API_BASE_URL
  .replace(/^http/, 'ws')      // http->ws, https->wss
  .replace(/\/api\/v1\/?$/, ''); // strip the REST path, keep scheme+host

import Sidebar from './Sidebar';

import FakeNewsExecutionAnimation from './FakeNewsExecutionAnimation';
import WildlifeExecutionAnimation from './WildlifeExecutionAnimation';
import ReviewReplyExecutionAnimation from './ReviewReplyExecutionAnimation';
import AttendanceExecutionAnimation from './AttendanceExecutionAnimation';
import { GuideProvider } from '../../components/guide/GuideProvider';
import { loadDetector, detect } from '../../lib/cv/detector';
import { DATASET_DRAG_TYPE, urlToDataUrl } from '../../lib/dataLibrary';

// Chiti's walkthrough of the agentic canvas — explains the pipeline, then guides
// the run order: Save → Run → read results → See it in action.
const AGENTIC_STEPS = [
  { target: '[data-guide="canvas"]', mood: 'point', say: "Hi, I'm Chiti! 🤖 This is your AI pipeline. Each block is a NODE that does one job, and data flows left → right along the arrows." },
  { target: '[data-guide="save"]', mood: 'think', say: 'Step 1 — Save your workflow so the computer can run it.' },
  { target: '[data-guide="run"]', mood: 'think', say: 'Step 2 — hit “Test Pipeline”. Your data now travels through every node, one by one.' },
  { target: '[data-guide="run"]', mood: 'point', say: 'Step 3 — the results stream into the log panel that pops up here. Each node reports what it did, and the final answer lands in the Display node.' },
  { target: '[data-guide="canvas"]', mood: 'cheer', say: "That's it — you built and ran an AI pipeline! 🎉 For camera flows like the Wildlife Drone, a “See it in action” button also appears so you can watch it play out visually." },
];

// Input
import TextInputNode from './nodes/TextInputNode';
import DocumentReaderNode from './nodes/DocumentReaderNode';
import VisionScannerNode from './nodes/VisionScannerNode';
import SpeechToTextNode from './nodes/SpeechToTextNode';
// Processing
import CustomizerNode from './nodes/CustomizerNode';
import ObjectDetectionNode from './nodes/ObjectDetectionNode';
import SummarizerNode from './nodes/SummarizerNode';
import SentimentRadarNode from './nodes/SentimentRadarNode';
import WebSearchNode from './nodes/WebSearchNode';
import WebScraperNode from './nodes/WebScraperNode';
// Routing
import DeciderNode from './nodes/DeciderNode';
import MergerNode from './nodes/MergerNode';
// Output
import DisplayNode from './nodes/DisplayNode';
import ChartGeneratorNode from './nodes/ChartGeneratorNode';
import MessengerNode from './nodes/MessengerNode';

// Register all custom nodes
const nodeTypes = {
  textInput: TextInputNode,
  documentReader: DocumentReaderNode,
  visionScanner: VisionScannerNode,
  speechToText: SpeechToTextNode,
  customizer: CustomizerNode,
  objectDetection: ObjectDetectionNode,
  summarizer: SummarizerNode,
  sentimentRadar: SentimentRadarNode,
  webSearch: WebSearchNode,
  webScraper: WebScraperNode,
  decider: DeciderNode,
  merger: MergerNode,
  display: DisplayNode,
  chartGenerator: ChartGeneratorNode,
  messenger: MessengerNode,
};

const initialNodes = [];
const getId = () => `node_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

// Drop any edge whose source/target node is missing — prevents "broken" edges
// left dangling after a node is removed (in a template or a saved workflow).
const pruneEdges = (nodes, edges) => {
  const ids = new Set((nodes || []).map((n) => n.id));
  return (edges || []).filter((e) => ids.has(e.source) && ids.has(e.target));
};

// Guarantee every Object-Detection node with an image has real client-side
// detections before we save/run. The detector is async, so we AWAIT it here
// rather than relying on the user to wait for the on-node chips to appear.
async function ensureDetections(nodes) {
  const pending = nodes.filter((n) => n.type === 'objectDetection' && n.data?.fileBase64 && !Array.isArray(n.data?.detections));
  if (!pending.length) return nodes;
  try { await loadDetector(); } catch { return nodes; }
  const results = {};
  for (const n of pending) {
    try {
      const img = new Image();
      img.src = n.data.fileBase64;
      await img.decode();
      const preds = await detect(img, 20, null); // all coco classes (incl. animals)
      results[n.id] = preds.map((p) => ({ label: p.class, score: Math.round(p.score * 100) }));
    } catch { results[n.id] = []; }
  }
  return nodes.map((n) => (results[n.id] ? { ...n, data: { ...n.data, detections: results[n.id] } } : n));
}

function Canvas({ onBackToDashboard, presetFlow, isExploreMode, assignment }) {
  const reactFlowWrapper = useRef(null);
  const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(presetFlow?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(pruneEdges(presetFlow?.nodes, presetFlow?.edges));
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workflowName, setWorkflowName] = useState(presetFlow?.name || 'My Awesome Flow');
  const [workflowId, setWorkflowId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [dailyPoints, setDailyPoints] = useState(null);
  const [showWildlife, setShowWildlife] = useState(false);
  const [showFakeNews, setShowFakeNews] = useState(false);
  const [showReviewReply, setShowReviewReply] = useState(false);
  const [showAttendance, setShowAttendance] = useState(false);

  // Is this flow from a preset? (used to pick which animation to show)
  const isReviewReply = presetFlow?.id === 'review-reply';
  const isAttendance = presetFlow?.id === 'auto-attendance';
  const [hasRunResult, setHasRunResult] = useState(false);
  
  useEffect(() => {
    // Fetch user points on load
    api.get('/agentic/quota/')
      .then(res => setDailyPoints(res.data.daily_points))
      .catch(err => console.error('Failed to fetch quota:', err));
  }, []);
  const [logs, setLogs] = useState([]);
  const [selectedCount, setSelectedCount] = useState(0);
  const [showLogs, setShowLogs] = useState(true);
  const wsRef = useRef(null);

  // Assignment mode: build a pipeline, then submit it for AI evaluation.
  const [showProblem, setShowProblem] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);

  const handleSubmitEvaluation = async () => {
    const graph = { nodes: getNodes(), edges: getEdges() };
    if (!graph.nodes.length) {
      alert('Build your pipeline first — drag in some nodes and connect them, then submit.');
      return;
    }
    setIsEvaluating(true);
    try {
      const base = { content: JSON.stringify(graph) };
      const url = assignment.practice
        ? '/assignments/practice/submit/'
        : `/assignments/${assignment.placementId}/submit/`;
      const payload = assignment.practice ? { ...base, assignment: assignment.assignmentId } : base;
      const { data } = await api.post(url, payload);
      setEvalResult(data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Could not submit for evaluation. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  useOnSelectionChange({
    onChange: ({ nodes, edges }) => {
      setSelectedCount(nodes.length + edges.length);
    },
  });

  const handleDeleteSelected = () => {
    const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected && !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Make sure any Object-Detection node has run its detector before saving.
      const nodes = await ensureDetections(getNodes());
      setNodes(nodes);
      const flowData = {
        nodes,
        edges: getEdges(),
      };
      
      const payload = {
        name: workflowName,
        description: 'Saved from UI',
        flow_data: flowData,
        is_template: false
      };

      let res;
      if (workflowId) {
        res = await api.put(`/agentic/workflows/${workflowId}/`, payload);
      } else {
        res = await api.post('/agentic/workflows/', payload);
        setWorkflowId(res.data.id);
      }
      alert('Workflow saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving workflow.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateFlow = async () => {
    if (!presetFlow?.userPrompt) return;
    setIsGenerating(true);
    try {
      const res = await api.post('/agentic/workflows/generate_flow/', { prompt: presetFlow.userPrompt });
      setNodes(res.data.nodes || []);
      setEdges(pruneEdges(res.data.nodes, res.data.edges));
      setAiExplanation(res.data.explanation || 'Flow generated successfully!');
      // Re-fetch quota since 30 points were deducted
      api.get('/agentic/quota/').then(res => setDailyPoints(res.data.daily_points));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to generate flow.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRun = async () => {
    if (!workflowId) {
      alert('Please save the workflow first before running.');
      return;
    }
    setIsRunning(true);
    setShowLogs(true);
    setLogs([]); // Clear previous logs
    // Reset per-node execution visuals from any previous run
    setNodes((nds) => nds.map((node) => ({ ...node, style: { ...node.style, boxShadow: undefined, border: undefined }, data: { ...node.data, __result: undefined } })));

    try {
      // Connect to WebSocket using the Django Channels endpoint (env-derived origin)
      const wsUrl = `${WS_ORIGIN}/ws/agentic/${workflowId}/`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket Data:", data);
        
        // Update local logs state
        setLogs(prev => [...prev, data]);
        
        // VISUAL TRACING: Update node styles based on status
        if (data.status === 'processing') {
            setNodes((nds) => nds.map((node) => {
                if (data.message.includes(`[${node.data.label}]`) || data.message.includes(`node`)) {
                    return { ...node, style: { ...node.style, boxShadow: '0 0 15px #10b981', border: '2px solid #10b981' } };
                }
                return node;
            }));
        }

        // LIVE per-node result: light up the node green and show its output snippet
        if (data.status === 'node_done' && data.node_id) {
          const nid = data.node_id;
          const out = data.output && data.output[nid];
          const snippet = out == null ? '' : (typeof out === 'string' ? out : JSON.stringify(out));
          setNodes((nds) => nds.map((node) => node.id === nid ? {
            ...node,
            style: { ...node.style, boxShadow: '0 0 14px rgba(48,209,88,.65)', border: '2px solid #30D158' },
            data: {
              ...node.data,
              __result: snippet,
              ...((node.type === 'display' || node.type === 'chartGenerator') && snippet ? { output: snippet } : {}),
            },
          } : node));
        }

        // If execution is finished, re-enable the Run button and inject output into the Display Node
        if (data.status === 'completed' || data.status === 'failed') {
          setIsRunning(false);
          if (data.status === 'completed') setHasRunResult(true);

          // Re-fetch points
          api.get('/agentic/quota/').then(res => setDailyPoints(res.data.daily_points));

          if (data.status === 'completed' && data.output) {
            setNodes((nds) => nds.map((node) => {
              const updatedNode = { 
                ...node, 
                style: { ...node.style, boxShadow: 'none', border: '2px solid rgba(16, 185, 129, 0.5)' } 
              };
              
              if (data.output && data.output[node.id] && (node.type === 'display' || node.type === 'chartGenerator')) {
                const nodeOutput = data.output[node.id];
                return {
                  ...updatedNode,
                  data: {
                    ...node.data,
                    output: typeof nodeOutput === 'string' ? nodeOutput : JSON.stringify(nodeOutput)
                  }
                };
              }
              return updatedNode;
            }));
          }
          
          ws.close();
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket Disconnected");
        setIsRunning(false);
      };

      // Trigger the Celery task via the API AFTER opening the socket
      await api.post(`/agentic/workflows/${workflowId}/execute/`);
      
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Error starting execution.');
      setIsRunning(false);
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#8B949E', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      // ── Data Library drop: build a node already filled with the dataset ──
      const datasetRaw = event.dataTransfer.getData(DATASET_DRAG_TYPE);
      if (datasetRaw) {
        let payload;
        try {
          payload = JSON.parse(datasetRaw);
        } catch (err) {
          console.error('Malformed dataset drag payload:', err);
          return;
        }

        const nodeId = getId();
        // Text datasets land fully-formed; image datasets need a fetch, so the
        // node appears immediately in a loading state and fills in after.
        setNodes((nds) => nds.concat({
          id: nodeId,
          type: payload.nodeType,
          position,
          data: {
            label: payload.label,
            ...(payload.text ? { text: payload.text, content: payload.text } : {}),
            ...(payload.url ? { fileName: payload.fileName || 'Loading…', fromLibrary: true } : {}),
          },
        }));

        if (payload.url) {
          urlToDataUrl(payload.url)
            .then((dataUrl) => {
              const ext = (payload.fileName || '').split('.').pop().toLowerCase();
              const fileType = ext === 'png' ? 'image/png' : 'image/jpeg';
              setNodes((nds) => nds.map((n) => n.id === nodeId ? {
                ...n,
                data: { ...n.data, fileName: payload.fileName, fileType, fileBase64: dataUrl },
              } : n));
            })
            .catch((err) => {
              console.error('Could not load dataset image:', err);
              setNodes((nds) => nds.map((n) => n.id === nodeId ? {
                ...n, data: { ...n.data, fileName: 'Could not load — try again' },
              } : n));
            });
        }
        return;
      }

      // ── Sidebar drop: an empty node of the dragged type ──
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;
      const label = event.dataTransfer.getData('nodeLabel');
      setNodes((nds) => nds.concat({ id: getId(), type, position, data: { label } }));
    },
    [screenToFlowPosition, setNodes]
  );

  return (
    <GuideProvider
      steps={presetFlow?.guide?.length ? presetFlow.guide : AGENTIC_STEPS}
      autoStartKey={isExploreMode ? `agentic-${presetFlow?.id || 'default'}` : undefined}
      launcherStyle={{ top: 74, bottom: 'auto', right: 24 }}
    >
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div className="agentic-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', background: 'rgba(15, 17, 26, 0.95)', borderBottom: '1px solid var(--glass-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-secondary" onClick={onBackToDashboard} style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <input 
            type="text" 
            value={workflowName} 
            onChange={(e) => setWorkflowName(e.target.value)}
            style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: '600' }}
          />
          {dailyPoints !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fbbf24', fontWeight: 'bold', background: 'rgba(251, 191, 36, 0.1)', padding: '6px 12px', borderRadius: '20px' }}>
              ⚡ {dailyPoints} Points Left
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {assignment && (
            <button
              className="btn-primary"
              onClick={handleSubmitEvaluation}
              disabled={isEvaluating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #8b5cf6, #d946ef)', border: 'none' }}
            >
              <ClipboardCheck size={16} /> {isEvaluating ? 'Evaluating…' : 'Submit for evaluation'}
            </button>
          )}
          {!isExploreMode && (
            <button
              className="btn-secondary"
              onClick={() => { setNodes([]); setEdges([]); setLogs([]); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Trash2 size={16} /> Clear Canvas
            </button>
          )}
          {selectedCount > 0 && (
            <button className="btn-secondary" onClick={handleDeleteSelected} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' }}>
              <Trash2 size={16} /> Delete Selected
            </button>
          )}
          
          {!isExploreMode && presetFlow?.userPrompt && (
            <button 
              className="btn-secondary" 
              onClick={handleGenerateFlow} 
              disabled={isGenerating} 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6', color: '#3b82f6' }}
            >
              <Bot size={16} /> {isGenerating ? 'AI is building...' : 'Leave it to AI'}
            </button>
          )}

          <button data-guide="save" className="btn-secondary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          {!isExploreMode && (
            <button className="btn-secondary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#8b5cf6', color: '#8b5cf6' }}>
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save to Account'}
            </button>
          )}
        </div>
      </div>

      {/* Assignment brief */}
      {assignment && (
        <div style={{ background: 'linear-gradient(90deg, rgba(139,92,246,0.14), rgba(217,70,239,0.06))', borderBottom: '1px solid var(--glass-border)', padding: showProblem ? '12px 20px' : '6px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d946ef', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                <ClipboardCheck size={14} /> Assignment · {assignment.title}
              </div>
              {showProblem && (
                <p style={{ margin: '8px 0 0', color: '#e2e8f0', fontSize: '0.92rem', lineHeight: 1.55, maxWidth: 1000 }}>
                  {assignment.problem}
                </p>
              )}
            </div>
            <button onClick={() => setShowProblem(v => !v)} className="btn-secondary"
              style={{ flex: 'none', padding: '5px 12px', fontSize: '0.8rem' }}>
              {showProblem ? 'Hide brief' : 'Show brief'}
            </button>
          </div>
        </div>
      )}

      <div className="agentic-container" style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <div data-guide="canvas" className="agentic-canvas-wrapper" ref={reactFlowWrapper} style={{ flex: 1, height: '100%', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background color="#2a2e3d" gap={16} />
          <Controls style={{ background: '#191C29', border: '1px solid #333', marginBottom: '80px' }} />
        </ReactFlow>
        </div>
        
        {/* AI Tutor Popup */}
        {aiExplanation && (
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(15, 17, 26, 0.95)', border: '1px solid #3b82f6', borderRadius: '16px', padding: '30px', width: '500px', zIndex: 200, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#3b82f6', fontSize: '1.2rem', fontWeight: 'bold' }}>
                <Bot size={24} /> AI Tutor Explanation
              </div>
              <button onClick={() => setAiExplanation(null)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <p style={{ color: '#e2e8f0', lineHeight: '1.6', fontSize: '1rem' }}>{aiExplanation}</p>
            <button onClick={() => setAiExplanation(null)} className="btn-primary" style={{ marginTop: '20px', width: '100%', background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>Got it, let's test it!</button>
          </div>
        )}

        {/* Assignment evaluation result */}
        {evalResult && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(4,5,12,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '100%', maxWidth: 520, background: '#12131f', border: '1px solid rgba(139,92,246,0.4)', borderRadius: 18, padding: 30, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ width: 52, height: 52, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(135deg,#8b5cf6,#d946ef)' }}>
                  <Sparkles size={26} />
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Pipeline evaluated</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sutra AI reviewed your agent design</div>
                </div>
                {evalResult.status === 'graded' && (
                  <div style={{ marginLeft: 'auto', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.4rem', color: '#d946ef', background: 'rgba(217,70,239,0.14)', padding: '8px 14px', borderRadius: 12 }}>
                    {evalResult.score}/{evalResult.max_score}
                  </div>
                )}
              </div>
              <p style={{ color: '#e2e8f0', lineHeight: 1.6, fontSize: '0.98rem' }}>
                {evalResult.status === 'graded'
                  ? (evalResult.llm_feedback || 'Nice work building the pipeline!')
                  : 'Your pipeline is submitted — the evaluation is being prepared. Check the assignment shortly for your score and feedback.'}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <button className="btn-secondary" onClick={() => setEvalResult(null)} style={{ flex: 1 }}>Keep editing</button>
                <button className="btn-primary" onClick={onBackToDashboard} style={{ flex: 1, background: 'linear-gradient(135deg,#8b5cf6,#d946ef)', border: 'none' }}>Back to assignment</button>
              </div>
            </div>
          </div>
        )}

        {/* End-product demo — appears for vision/drone/review flows, but only becomes
            clickable AFTER a pipeline run has produced a result, so students see
            it as the visualised outcome of their own flow. */}
        {(() => {
          const hasVision = !isAttendance && nodes.some((n) => n.type === 'objectDetection' || n.type === 'visionScanner');
          const hasTextCheck = !hasVision && nodes.some((n) => n.type === 'webSearch');
          const hasReview = isReviewReply || (!hasVision && !hasTextCheck && nodes.some((n) => n.type === 'sentimentRadar'));
          const showDemo = isAttendance || hasVision || hasTextCheck || hasReview;

          return showDemo && (
          <button
            data-guide="demo"
            onClick={() => {
              if (!hasRunResult) return;
              if (isAttendance) setShowAttendance(true);
              else if (hasVision) setShowWildlife(true);
              else if (hasReview) setShowReviewReply(true);
              else setShowFakeNews(true);
            }}
            disabled={!hasRunResult}
            title={hasRunResult ? 'Watch the pipeline execute visually' : 'Save & run the pipeline first — then watch it in action'}
            style={{
              position: 'fixed', bottom: '130px', right: '450px', zIndex: 150,
              display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 22px',
              fontSize: '1rem', borderRadius: '30px', border: '1px solid rgba(100,210,255,.4)',
              cursor: hasRunResult ? 'pointer' : 'not-allowed', color: '#fff', fontFamily: 'inherit', fontWeight: 600,
              background: 'linear-gradient(135deg,#5e5ce6,#bf5af2)', boxShadow: '0 10px 25px rgba(94,92,230,.4)',
              opacity: hasRunResult ? 1 : 0.45,
            }}
          >
            🎬 See it in action
          </button>
          );
        })()}

        {showWildlife && (
          <WildlifeExecutionAnimation
            onClose={() => setShowWildlife(false)}
            initialImage={nodes.find((n) => (n.type === 'objectDetection' || n.type === 'visionScanner') && n.data?.fileBase64)?.data?.fileBase64}
          />
        )}

        {showFakeNews && (
          <FakeNewsExecutionAnimation onClose={() => setShowFakeNews(false)} nodes={nodes} />
        )}
        
        {showReviewReply && (
          <ReviewReplyExecutionAnimation onClose={() => setShowReviewReply(false)} nodes={nodes} />
        )}

        {showAttendance && (
          <AttendanceExecutionAnimation onClose={() => setShowAttendance(false)} nodes={nodes} />
        )}

        {/* Floating Run Button */}
        <button
          data-guide="run"
          className="btn-primary"
          onClick={handleRun}
          disabled={isRunning}
          style={{ 
            position: 'fixed', 
            bottom: '30px', 
            right: '30px', 
            zIndex: 150, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 24px',
            fontSize: '1.1rem',
            borderRadius: '30px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
            background: 'linear-gradient(135deg, var(--accent-green), #059669)' 
          }}
        >
          <Play size={20} /> {isRunning ? 'Testing Pipeline...' : 'Test Pipeline'}
        </button>

        {/* Live Logs Terminal */}
        {showLogs && (
          <div style={{ position: 'fixed', bottom: '90px', right: '30px', width: '400px', maxHeight: '300px', background: 'rgba(15, 17, 26, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <div style={{ padding: '10px 15px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                <Terminal size={14} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Execution Logs</span>
              </div>
              <button onClick={() => setShowLogs(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={14}/></button>
            </div>
            <div style={{ padding: '10px 15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic' }}>Waiting for execution...</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}>
                    <span style={{ color: log.status === 'completed' ? 'var(--accent-green)' : log.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-cyan)' }}>[{log.status?.toUpperCase() || 'INFO'}]</span> {log.message}
                    {log.output && (
                      <div style={{ marginTop: '4px', padding: '6px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                        {typeof log.output === 'string' ? log.output : JSON.stringify(log.output, null, 2)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </GuideProvider>
  );
}

export default function AgenticWorkspace({ onBackToDashboard, presetFlow, isExploreMode, userPrompt, assignment }) {
  // Merge userPrompt into presetFlow if needed
  const enhancedPreset = presetFlow ? { ...presetFlow, userPrompt } : { userPrompt };

  return (
    <ReactFlowProvider>
      <Canvas onBackToDashboard={onBackToDashboard} presetFlow={enhancedPreset} isExploreMode={isExploreMode} assignment={assignment} />
    </ReactFlowProvider>
  );
}
