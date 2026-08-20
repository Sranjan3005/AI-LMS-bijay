import { Handle, Position } from '@xyflow/react';
import { Minimize2 } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";
import NodeResultFooter from './NodeResultFooter';

export default function SummarizerNode({ data }) {
  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-purple)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-purple)' }}>
        <Minimize2 size={16} /> <span>Summarizer</span>
        <NodeInfo type="summarizer" />
      </div>
      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
