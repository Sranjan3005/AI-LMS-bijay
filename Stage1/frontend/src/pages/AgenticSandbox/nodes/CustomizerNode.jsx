import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Bot } from 'lucide-react';
import NodeResultFooter from './NodeResultFooter';
import AutoGrowTextarea from './AutoGrowTextarea';
import NodeInfo from "./NodeInfo.jsx";

export default function CustomizerNode({ id, data }) {
  const { updateNodeData } = useReactFlow();

  const handleChange = (e) => {
    updateNodeData(id, { prompt: e.target.value });
  };

  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-purple)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-purple)' }}>
        <Bot size={16} /> <span>The Customizer</span>
        <NodeInfo type="customizer" />
      </div>
      <AutoGrowTextarea
        className="custom-node-input"
        placeholder="System prompt..."
        value={data.prompt || ''}
        onChange={handleChange}
      />
      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
