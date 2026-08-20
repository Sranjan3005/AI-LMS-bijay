import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Camera, Upload, File as FileIcon, Image as ImageIcon } from 'lucide-react';
import { useRef } from 'react';
import NodeInfo from "./NodeInfo.jsx";
import AutoGrowTextarea from './AutoGrowTextarea';

export default function VisionScannerNode({ id, data }) {
  const { setNodes, updateNodeData } = useReactFlow();
  const fileInputRef = useRef(null);
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                fileName: file.name,
                fileType: file.type,
                fileBase64: base64,
              },
            };
          }
          return n;
        })
      );
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="custom-node" style={{ borderTop: '4px solid var(--accent-cyan)' }}>
      <div className="custom-node-header" style={{ color: 'var(--accent-cyan)' }}>
        <Camera size={16} /> <span>{data.label || 'Vision Scanner'}</span>
        <NodeInfo type="visionScanner" />
      </div>
      <div className="custom-node-box" style={{ cursor: 'pointer', padding: '15px' }} onClick={handleUploadClick}>
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
          onChange={handleFileChange}
        />
        {data.fileName ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {data.fileType?.startsWith('image/') ? <ImageIcon size={24} color="var(--accent-cyan)" /> : <FileIcon size={24} color="var(--accent-cyan)" />}
            <span style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {data.fileName}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Upload size={20} />
            <span style={{ fontSize: '0.8rem' }}>Click to Upload</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>…or drag one in from the Data Library</span>
          </div>
        )}
      </div>

      {/* What to look for. Left blank the scanner just describes the picture;
          filled in, it can pull out a specific thing (e.g. read a register). */}
      <AutoGrowTextarea
        className="custom-node-input"
        minHeight={38}
        placeholder="What should it look for? (optional)"
        value={data.prompt || ''}
        onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
        style={{ marginTop: 8, fontSize: '0.78rem' }}
      />

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
