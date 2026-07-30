import { Handle, Position } from '@xyflow/react';
import { MonitorPlay } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";

export default function DisplayNode({ data }) {
  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-green)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-green)' }}>
        <MonitorPlay size={16} /> <span>Screen Display</span>
        <NodeInfo type="display" />
      </div>
      <div className="custom-node-box" style={{ fontFamily: 'monospace', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
        {data.output || "> Output..."}
      </div>
    </div>
  );
}
