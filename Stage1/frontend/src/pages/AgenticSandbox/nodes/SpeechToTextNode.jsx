import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Mic, Upload } from 'lucide-react';
import { useRef } from 'react';
import NodeInfo from "./NodeInfo.jsx";

/**
 * SpeechToTextNode — upload an audio file; the backend
 * extracts its text via Azure Speech-to-Text and passes it
 * on. Stores the file on the node as a base64 data URL.
 */
export default function SpeechToTextNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      updateNodeData(id, {
        fileName: file.name,
        fileType: file.type,
        fileBase64: event.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-cyan)' }}>
      <div className="custom-node-header" style={{ color: 'var(--accent-cyan)' }}>
        <Mic size={16} /> <span>Speech to Text</span>
        <NodeInfo type="speechToText" />
      </div>
      <div className="custom-node-box" style={{ cursor: 'pointer', padding: '15px' }} onClick={() => fileInputRef.current?.click()}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="audio/*"
          onChange={handleFileChange}
        />
        {data.fileName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Mic size={24} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {data.fileName}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Upload size={20} />
            <span style={{ fontSize: '0.8rem' }}>Upload Audio file</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
