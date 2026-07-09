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
import { Play, Save, ArrowLeft, Trash2, Terminal, X, Bot } from 'lucide-react';
import api, { API_BASE_URL } from '../../api';
import './AgenticFlow.css';

// Derive the WebSocket origin from the API base URL so it works on Azure
// (https -> wss) and locally (http -> ws) without code changes.
const WS_ORIGIN = API_BASE_URL
  .replace(/^http/, 'ws')      // http->ws, https->wss
  .replace(/\/api\/v1\/?$/, ''); // strip the REST path, keep scheme+host

import Sidebar from './Sidebar';

// Input
import TextInputNode from './nodes/TextInputNode';
import DocumentReaderNode from './nodes/DocumentReaderNode';
import VisionScannerNode from './nodes/VisionScannerNode';
// Processing
import CustomizerNode from './nodes/CustomizerNode';
import SummarizerNode from './nodes/SummarizerNode';
import SentimentRadarNode from './nodes/SentimentRadarNode';
import WebSearchNode from './nodes/WebSearchNode';
// Routing
import DeciderNode from './nodes/DeciderNode';
import MergerNode from './nodes/MergerNode';
// Output
import DisplayNode from './nodes/DisplayNode';
import ChartGeneratorNode from './nodes/ChartGeneratorNode';

// Register all custom nodes
const nodeTypes = {
  textInput: TextInputNode,
  documentReader: DocumentReaderNode,
  visionScanner: VisionScannerNode,
  customizer: CustomizerNode,
  summarizer: SummarizerNode,
  sentimentRadar: SentimentRadarNode,
  webSearch: WebSearchNode,
  decider: DeciderNode,
  merger: MergerNode,
  display: DisplayNode,
  chartGenerator: ChartGeneratorNode,
};

const initialNodes = [];
let id = 0;
const getId = () => `node_${id++}`;

function Canvas({ onBackToDashboard, presetFlow, isExploreMode }) {
  const reactFlowWrapper = useRef(null);
  const { getNodes, getEdges, screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState(presetFlow?.nodes || initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(presetFlow?.edges || []);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [workflowName, setWorkflowName] = useState(presetFlow?.name || 'My Awesome Flow');
  const [workflowId, setWorkflowId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [dailyPoints, setDailyPoints] = useState(null);
  
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
      const flowData = {
        nodes: getNodes(),
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
      setEdges(res.data.edges || []);
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

        // If execution is finished, re-enable the Run button and inject output into the Display Node
        if (data.status === 'completed' || data.status === 'failed') {
          setIsRunning(false);
          
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
      try {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        const label = event.dataTransfer.getData('nodeLabel');
        
        if (typeof type === 'undefined' || !type) return;

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode = {
          id: getId(),
          type,
          position,
          data: { label: label },
        };

        setNodes((nds) => nds.concat(newNode));
      } catch (err) {
        console.error("Error on drop:", err);
        alert("Drop Error: " + err.message);
      }
    },
    [screenToFlowPosition, setNodes]
  );

  return (
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

          <button className="btn-secondary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
          
          {!isExploreMode && (
            <button className="btn-secondary" onClick={handleSave} disabled={isSaving} style={{ display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#8b5cf6', color: '#8b5cf6' }}>
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save to Account'}
            </button>
          )}
        </div>
      </div>

      <div className="agentic-container" style={{ flex: 1, minHeight: 0, width: '100%', position: 'relative', display: 'flex', overflow: 'hidden' }}>
        <Sidebar />
        <div className="agentic-canvas-wrapper" ref={reactFlowWrapper} style={{ flex: 1, height: '100%', position: 'relative' }}>
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

        {/* Floating Run Button */}
        <button 
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
  );
}

export default function AgenticWorkspace({ onBackToDashboard, presetFlow, isExploreMode, userPrompt }) {
  // Merge userPrompt into presetFlow if needed
  const enhancedPreset = presetFlow ? { ...presetFlow, userPrompt } : { userPrompt };

  return (
    <ReactFlowProvider>
      <Canvas onBackToDashboard={onBackToDashboard} presetFlow={enhancedPreset} isExploreMode={isExploreMode} />
    </ReactFlowProvider>
  );
}
