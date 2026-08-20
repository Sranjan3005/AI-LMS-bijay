import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ScanSearch, Upload, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import api from '../../../api';
import NodeInfo from "./NodeInfo.jsx";

/**
 * ObjectDetectionNode — upgraded to use Azure OpenAI Vision via the backend.
 * This ensures it can detect a vast array of objects and endangered animals
 * properly during pipeline building, matching the final scenario capabilities.
 */
export default function ObjectDetectionNode({ id, data }) {
  const { updateNodeData, getNodes, setNodes } = useReactFlow();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | detecting | done | error

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      
      // Clear execution results from all nodes since input changed
      setNodes((nds) => nds.map(n => ({
        ...n,
        style: { ...n.style, boxShadow: undefined, border: undefined },
        data: { ...n.data, __result: undefined, output: undefined }
      })));
      updateNodeData(id, { fileName: file.name, fileType: file.type, fileBase64: dataUrl, detections: null });

      try {
        setStatus('detecting');
        
        // Resize the image using a canvas to prevent sending massive payloads to the backend
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = dataUrl;
        });
        
        const MAX_SIZE = 800;
        let w = img.width;
        let h = img.height;
        if (w > MAX_SIZE || h > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        
        // Convert back to a much smaller base64 string
        const smallDataUrl = canvas.toDataURL(file.type || 'image/jpeg', 0.8);
        
        const res = await api.post('/agentic/workflows/object_detect/', { image: smallDataUrl });
        const preds = res.data.detections || [];
        const detections = preds.map((p) => ({ label: p.class || p.label, score: Math.round(p.score * 100) }));
        updateNodeData(id, { detections });
        setStatus('done');
      } catch (err) {
        console.error('object detection failed', err);
        const errormsg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
        setStatus(`error: ${errormsg}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const dets = data.detections;

  return (
    <div className="custom-node" style={{ borderTop: '4px solid #30D158', minWidth: 220 }}>
      <Handle type="target" position={Position.Left} />
      <div className="custom-node-header" style={{ color: '#30D158' }}>
        <ScanSearch size={16} /> <span>Object Detection</span>
        <NodeInfo type="objectDetection" />
      </div>

      <div className="custom-node-box" style={{ cursor: 'pointer', padding: '14px' }} onClick={() => fileInputRef.current?.click()}>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
        {data.fileBase64 ? (
          <img src={data.fileBase64} alt={data.fileName} style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Upload size={20} />
            <span style={{ fontSize: '0.8rem' }}>Upload an image</span>
          </div>
        )}
      </div>

      {/* live detection feedback (runs via backend LLM now) */}
      <div style={{ padding: '2px 10px 8px', minHeight: 22 }}>
        {status === 'detecting' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#30D158', fontSize: '0.75rem' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            Detecting objects…
          </div>
        )}
        {status.startsWith('error') && <span style={{ color: '#ff6b6b', fontSize: '0.75rem' }}>{status === 'error' ? 'Detection failed — try another image.' : status}</span>}
        {dets && dets.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {dets.map((d, i) => (
              <span key={i} style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 999, background: 'rgba(48,209,88,.14)', border: '1px solid rgba(48,209,88,.4)', color: '#4ade80', textTransform: 'capitalize' }}>
                {d.label} {d.score}%
              </span>
            ))}
          </div>
        )}
        {dets && dets.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>No objects detected.</span>}
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
