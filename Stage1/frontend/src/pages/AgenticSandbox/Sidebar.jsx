import { 
  Type, FileText, Camera, Mic,
  Bot, Minimize2, Smile, Globe,
  GitBranch, Merge,
  MonitorPlay, BarChart3, ScanSearch, Send, Info
} from 'lucide-react';
import { nodeInfoFor } from './nodes/nodeInfo';
import './AgenticFlow.css';

const DraggableItem = ({ type, label, icon: Icon, colorClass, points, onDragStart }) => (
  <div
    className={`agentic-draggable-node ${colorClass}`}
    onDragStart={(event) => onDragStart(event, type, label)}
    draggable
    title={nodeInfoFor(type)}
    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon size={18} /> <span>{label}</span>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {points !== undefined && (
        <span style={{ fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '4px', color: '#fbbf24' }}>
          {points} pts
        </span>
      )}
      <Info size={14} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
    </div>
  </div>
);

export default function Sidebar() {
  const onDragStart = (event, nodeType, label) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('nodeLabel', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="agentic-sidebar">
      <h3 className="agentic-sidebar-header">Walled Garden</h3>
      
      <div>
        <h4 className="agentic-sidebar-category">Input (Senses)</h4>
        <DraggableItem type="textInput" label="Text Input" icon={Type} colorClass="node-input" points={0} onDragStart={onDragStart} />
        <DraggableItem type="documentReader" label="Document Reader" icon={FileText} colorClass="node-input" points={0} onDragStart={onDragStart} />
        <DraggableItem type="visionScanner" label="Vision Scanner" icon={Camera} colorClass="node-input" points={0} onDragStart={onDragStart} />
        <DraggableItem type="speechToText" label="Speech to Text" icon={Mic} colorClass="node-input" points={0} onDragStart={onDragStart} />
        <DraggableItem type="webScraper" label="Web Scraper" icon={Globe} colorClass="node-input" points={0} onDragStart={onDragStart} />
      </div>

      <div>
        <h4 className="agentic-sidebar-category">Processing (Brains)</h4>
        <DraggableItem type="customizer" label="The Customizer" icon={Bot} colorClass="node-process" points={5} onDragStart={onDragStart} />
        <DraggableItem type="objectDetection" label="Object Detection" icon={ScanSearch} colorClass="node-process" points={5} onDragStart={onDragStart} />
        <DraggableItem type="summarizer" label="Summarizer" icon={Minimize2} colorClass="node-process" points={5} onDragStart={onDragStart} />
        <DraggableItem type="sentimentRadar" label="Sentiment Radar" icon={Smile} colorClass="node-process" points={5} onDragStart={onDragStart} />
        <DraggableItem type="webSearch" label="Safe Web Search" icon={Globe} colorClass="node-process" points={2} onDragStart={onDragStart} />
      </div>

      <div>
        <h4 className="agentic-sidebar-category">Routing (Logic)</h4>
        <DraggableItem type="decider" label="The Decider" icon={GitBranch} colorClass="node-route" onDragStart={onDragStart} />
        <DraggableItem type="merger" label="The Merger" icon={Merge} colorClass="node-route" onDragStart={onDragStart} />
      </div>

      <div>
        <h4 className="agentic-sidebar-category">Output (Actions)</h4>
        <DraggableItem type="display" label="Screen Display" icon={MonitorPlay} colorClass="node-output" onDragStart={onDragStart} />
        <DraggableItem type="chartGenerator" label="Chart Generator" icon={BarChart3} colorClass="node-output" onDragStart={onDragStart} />
        <DraggableItem type="messenger" label="Send Message" icon={Send} colorClass="node-output" onDragStart={onDragStart} />
      </div>
    </aside>
  );
}
