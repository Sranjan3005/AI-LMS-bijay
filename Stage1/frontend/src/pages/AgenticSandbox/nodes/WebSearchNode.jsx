import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Globe, Search } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";
import NodeResultFooter from './NodeResultFooter';

export default function WebSearchNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  
  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-purple)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-purple)' }}>
        <Globe size={16} /> <span>Safe Web Search</span>
        <NodeInfo type="webSearch" />
      </div>
      
      <div style={{ position: 'relative', marginTop: '10px' }}>
        <div style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-secondary)' }}>
          <Search size={14} />
        </div>
        <input
          className="custom-node-input"
          style={{ paddingLeft: '32px' }}
          placeholder="Search query or Maps link..."
          value={data.query || ''}
          onChange={(e) => updateNodeData(id, { query: e.target.value })}
        />
      </div>

      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
