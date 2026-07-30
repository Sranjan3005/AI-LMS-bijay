import { Handle, Position, useReactFlow } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import NodeResultFooter from './NodeResultFooter';
import AutoGrowTextarea from './AutoGrowTextarea';
import NodeInfo from "./NodeInfo.jsx";

export default function DeciderNode({ id, data }) {
  const { updateNodeData } = useReactFlow();

  return (
    <div className="custom-node" style={{ borderTop: '4px solid #F59E0B' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: '#F59E0B' }}>
        <GitBranch size={16} /> <span>The Decider</span>
        <NodeInfo type="decider" />
      </div>

      <AutoGrowTextarea
        className="custom-node-input"
        placeholder="Condition to check… e.g. “the animal is endangered”"
        value={data.condition || ''}
        onChange={(e) => updateNodeData(id, { condition: e.target.value })}
      />
      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '4px 2px 2px' }}>
        TRUE if this holds, else FALSE
      </div>

      <div style={{ position: 'relative', marginTop: '10px' }}>
        <div style={{ fontSize: '10px', textAlign: 'right', color: 'var(--accent-green)', paddingRight: '15px' }}>True</div>
        <Handle type="source" position={Position.Right} id="true" style={{ top: 8, borderColor: 'var(--accent-green)' }} />

        <div style={{ fontSize: '10px', textAlign: 'right', color: 'var(--accent-red)', marginTop: '8px', paddingRight: '15px' }}>False</div>
        <Handle type="source" position={Position.Right} id="false" style={{ top: 28, borderColor: 'var(--accent-red)' }} />
      </div>

      <NodeResultFooter result={data.__result} />
    </div>
  );
}
