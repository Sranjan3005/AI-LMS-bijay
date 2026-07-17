import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ScanSearch, Upload, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { loadDetector, detect } from '../../../lib/cv/detector';

/**
 * ObjectDetectionNode — runs a REAL object-detection model (TensorFlow.js
 * coco-ssd) right in the browser when you upload an image. The detections are
 * stored on the node, so the backend pipeline just forwards them — no LLM is
 * used for detection (unlike the Vision Scanner, which asks an LLM to describe).
 */
export default function ObjectDetectionNode({ id, data }) {
  const { updateNodeData } = useReactFlow();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | detecting | done | error

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target.result;
      updateNodeData(id, { fileName: file.name, fileType: file.type, fileBase64: dataUrl, detections: null });
      try {
        setStatus('loading');
        await loadDetector();
        setStatus('detecting');
        const img = new Image();
        img.src = dataUrl;
        await img.decode();
        const preds = await detect(img, 20, null); // null = detect ALL coco classes (incl. animals)
        const detections = preds.map((p) => ({ label: p.class, score: Math.round(p.score * 100) }));
        updateNodeData(id, { detections });
        setStatus('done');
      } catch (err) {
        console.error('object detection failed', err);
        setStatus('error');
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

      {/* live detection feedback (runs client-side, no LLM) */}
      <div style={{ padding: '2px 10px 8px', minHeight: 22 }}>
        {(status === 'loading' || status === 'detecting') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#30D158', fontSize: '0.75rem' }}>
            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
            {status === 'loading' ? 'Loading detector…' : 'Detecting objects…'}
          </div>
        )}
        {status === 'error' && <span style={{ color: '#ff6b6b', fontSize: '0.75rem' }}>Detection failed — try another image.</span>}
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
