import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Type } from 'lucide-react';
import AutoGrowTextarea from './AutoGrowTextarea';
import NodeInfo from "./NodeInfo.jsx";

export default function TextInputNode({ id, data }) {
  const { updateNodeData } = useReactFlow();

  const handleChange = (e) => {
    updateNodeData(id, { text: e.target.value });
  };

  const text = data.text || '';
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isOverLimit = wordCount > 100;

  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-cyan)', borderColor: isOverLimit ? 'var(--accent-red)' : '' }}>
      <div className="custom-node-header" style={{ color: 'var(--accent-cyan)' }}>
        <Type size={16} /> <span>Text Input</span>
        <NodeInfo type="textInput" />
      </div>
      <AutoGrowTextarea
        className="custom-node-input"
        minHeight={60}
        placeholder="Type starting prompt here..."
        value={text}
        onChange={handleChange}
        style={{ borderColor: isOverLimit ? 'var(--accent-red)' : '' }}
      />
      <div style={{ fontSize: '0.75rem', marginTop: '5px', color: isOverLimit ? 'var(--accent-red)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
        <span>{isOverLimit ? 'Limit exceeded!' : 'Free node'}</span>
        <span>{wordCount}/100 words</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
