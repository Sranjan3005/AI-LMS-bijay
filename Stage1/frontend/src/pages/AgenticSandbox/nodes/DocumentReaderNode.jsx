import { Handle, Position, useReactFlow } from '@xyflow/react';
import { FileText, Upload } from 'lucide-react';
import { useRef } from 'react';
import NodeInfo from "./NodeInfo.jsx";

/**
 * DocumentReaderNode — upload a PDF / Word / CSV / text file; the backend
 * extracts its text (see make_node_document_reader in compiler.py) and passes it
 * on. Stores the file on the node as a base64 data URL, like the Vision Scanner.
 */
export default function DocumentReaderNode({ id, data }) {
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
        <FileText size={16} /> <span>Document Reader</span>
        <NodeInfo type="documentReader" />
      </div>
      <div className="custom-node-box" style={{ cursor: 'pointer', padding: '15px' }} onClick={() => fileInputRef.current?.click()}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.csv,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv"
          onChange={handleFileChange}
        />
        {data.fileName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} color="var(--accent-cyan)" />
            <span style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {data.fileName}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Upload size={20} />
            <span style={{ fontSize: '0.8rem' }}>Upload PDF, Word, CSV or text</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
