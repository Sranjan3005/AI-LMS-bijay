import { Handle, Position } from '@xyflow/react';
import { Smile } from 'lucide-react';
import NodeInfo from "./NodeInfo.jsx";
import NodeResultFooter from './NodeResultFooter';

export default function SentimentRadarNode({ data }) {
  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-purple)' }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: 'var(--accent-purple)' }}>
        <Smile size={16} /> <span>Sentiment Radar</span>
        <NodeInfo type="sentimentRadar" />
      </div>
      <NodeResultFooter result={data.__result} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
