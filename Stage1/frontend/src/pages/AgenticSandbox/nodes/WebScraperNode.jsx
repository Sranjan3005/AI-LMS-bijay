import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Globe, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import NodeInfo from "./NodeInfo.jsx";

export default function WebScraperNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const [url, setUrl] = useState(data.url || '');

  const handleChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    updateNodeData(id, { url: val });
  };

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.95)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '20px',
      minWidth: '280px',
      color: 'white',
      fontFamily: 'inherit',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
      position: 'relative'
    }}>
      <NodeInfo text="Extracts readable text content from a given website URL so the AI can analyze it." />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '8px', borderRadius: '10px' }}>
          <Globe size={20} color="#3b82f6" />
        </div>
        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>Web Scraper</div>
      </div>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10px', left: '12px', opacity: 0.5 }}>
          <LinkIcon size={16} />
        </div>
        <input
          type="text"
          placeholder="https://maps.app.goo.gl/... or example.com"
          value={url}
          onChange={handleChange}
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '10px 10px 10px 36px',
            color: 'white',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
      </div>

      <Handle type="source" position={Position.Right} style={{ width: '12px', height: '12px', background: '#3b82f6', border: '2px solid rgba(30, 41, 59, 0.95)' }} />
    </div>
  );
}
