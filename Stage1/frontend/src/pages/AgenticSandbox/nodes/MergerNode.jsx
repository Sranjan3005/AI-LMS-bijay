import { Handle, Position } from '@xyflow/react';
import { Merge } from 'lucide-react';
import NodeResultFooter from './NodeResultFooter';

export default function MergerNode({ data }) {
  return (
    <div className="custom-node" style={{ borderTop: '4px solid #F59E0B' }}>
      <div style={{ position: 'relative' }}>
        <Handle type="target" position={Position.Left} id="in1" style={{ top: 8 }} />
        <Handle type="target" position={Position.Left} id="in2" style={{ top: 28 }} />
      </div>

      <div className="custom-node-header" style={{ color: '#F59E0B' }}>
        <Merge size={16} /> <span>The Merger</span>
      </div>
      <div className="custom-node-box" style={{ padding: '5px' }}>
        Combines flows
      </div>
      <NodeResultFooter result={data.__result} />

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
