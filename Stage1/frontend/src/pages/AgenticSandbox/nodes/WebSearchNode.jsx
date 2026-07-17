import { Handle, Position } from '@xyflow/react';
import { Globe } from 'lucide-react';
import NodeResultFooter from './NodeResultFooter';

export default function WebSearchNode({ data }) {
  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-purple)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-purple)' }}>
        <Globe size={16} /> <span>Safe Web Search</span>
      </div>
      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
