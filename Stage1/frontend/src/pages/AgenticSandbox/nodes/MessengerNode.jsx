import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Send } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";
import NodeResultFooter from './NodeResultFooter';

/**
 * MessengerNode — an "action" node that dispatches a message/alert with whatever
 * it receives (e.g. alert rangers, escalate to management). Simulated send.
 */
export default function MessengerNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  return (
    <div className="custom-node" style={{ borderTop: '4px solid #FF9F0A' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: '#FF9F0A' }}>
        <Send size={16} /> <span>Send Message</span>
        <NodeInfo type="messenger" />
      </div>
      <input
        className="custom-node-input"
        placeholder="Send to… e.g. Forest Rangers"
        value={data.recipient || ''}
        onChange={(e) => updateNodeData(id, { recipient: e.target.value })}
      />
      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
