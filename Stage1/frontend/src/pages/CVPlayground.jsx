import React, { useEffect, useRef, useState } from 'react';
import { Eraser, ScanEye, Wand2, Upload } from 'lucide-react';
import DemoFlow from '../components/sutra/DemoFlow';
import ObjectDetectionLab from '../components/workspace/ObjectDetectionLab';
import { runEdgePipeline } from '../lib/cv/edge';
import { runDigitPipeline } from '../lib/cv/digit';
import { canvasFromDataURL } from '../lib/cv/imageOps';
import s from '../components/sutra/DemoFlow.module.css';

/**
 * Vision Playground — the Computer Vision demonstration.
 * Three real, in-browser vision models (no backend, models lazy-load on demand):
 *   • Object Detector — COCO-SSD over webcam or an uploaded photo
 *   • Edge Explorer   — Sobel edge detection on your drawing or photo
 *   • Digit Reader    — an MNIST-trained MLP reads digits you draw
 */

// video slot — drop the AI-generated clip here when ready (plan Appendix A3)
const VIDEO = '';

/* white-ink-on-black drawing canvas (matches what the CV pipelines expect) */
function DrawCanvas({ canvasRef, size = 300 }) {
  const drawing = useRef(false);
  const last = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, c.width, c.height);
  }, [canvasRef]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * canvasRef.current.width,
      y: ((e.clientY - r.top) / r.height) * canvasRef.current.height,
    };
  };
  const start = (e) => { drawing.current = true; last.current = pos(e); e.target.setPointerCapture(e.pointerId); };
  const move = (e) => {
    if (!drawing.current) return;
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 18; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const end = () => { drawing.current = false; };

  return (
    <canvas ref={canvasRef} width={size} height={size}
      style={{ width: '100%', maxWidth: size, aspectRatio: '1', borderRadius: 14, touchAction: 'none', cursor: 'crosshair', border: '1px solid rgba(255,255,255,.15)', background: '#000', display: 'block', margin: '0 auto' }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} />
  );
}

function Stages({ stages, highlight }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
      {stages.map((st, i) => (
        <div key={i} className={s.rlCard}>
          <h4 style={{ color: '#64d2ff' }}>{i + 1} · {st.title}</h4>
          {st.image && <img src={st.image} alt={st.title} style={{ width: '100%', borderRadius: 8, margin: '8px 0', imageRendering: 'pixelated' }} />}
          {st.bars && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 90, margin: '10px 0' }}>
              {st.bars.map((b, j) => (
                <div key={j} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', borderRadius: 3, height: `${Math.max(3, b.value * 82)}px`, background: j === highlight ? 'linear-gradient(180deg,#30d158,#0a84ff)' : 'rgba(255,255,255,.2)' }} />
                  <span style={{ fontSize: '.68rem', color: j === highlight ? '#30d158' : '#9aa0b5', fontWeight: j === highlight ? 700 : 400 }}>{b.label}</span>
                </div>
              ))}
            </div>
          )}
          <p>{st.description}</p>
        </div>
      ))}
    </div>
  );
}

function EdgeTab() {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setResult(null);
  };
  const run = async () => {
    setBusy(true);
    setResult(await runEdgePipeline(canvasRef.current));
    setBusy(false);
  };
  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const src = await canvasFromDataURL(url);
    URL.revokeObjectURL(url);
    const c = canvasRef.current, ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
    const scale = Math.min(c.width / src.width, c.height / src.height);
    const w = src.width * scale, h = src.height * scale;
    ctx.drawImage(src, (c.width - w) / 2, (c.height - h) / 2, w, h);
    setResult(null);
    e.target.value = '';
  };

  return (
    <div>
      <p className={s.muted} style={{ lineHeight: 1.55 }}>
        Edges are the <b>first thing</b> any vision model learns to see. Draw a shape (or upload a photo),
        then run the Sobel filter — the same maths inside real CNNs.
      </p>
      <DrawCanvas canvasRef={canvasRef} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button className={s.navBtn} onClick={run} disabled={busy}><ScanEye size={15} /> Find the edges</button>
        <button className={s.pillBtn} onClick={() => fileRef.current?.click()}><Upload size={14} /> Use a photo</button>
        <button className={s.pillBtn} onClick={clear}><Eraser size={14} /> Clear</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
      </div>
      {result && !result.ok && <div className={`${s.banner} ${s.bannerWarn}`}>✏️ {result.message}</div>}
      {result?.ok && (
        <>
          <div className={s.banner}>🔍 {result.prediction}</div>
          <Stages stages={result.stages} />
        </>
      )}
    </div>
  );
}

function DigitTab() {
  const canvasRef = useRef(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setResult(null);
  };
  const run = async () => {
    setBusy(true);
    try { setResult(await runDigitPipeline(canvasRef.current)); }
    catch { setResult({ ok: false, reason: 'model' }); }
    setBusy(false);
  };

  return (
    <div>
      <p className={s.muted} style={{ lineHeight: 1.55 }}>
        This is a real neural network (784→128→10) trained on 60,000 handwritten digits —
        running entirely in your browser. Draw one big digit (0–9) and let it read.
      </p>
      <DrawCanvas canvasRef={canvasRef} />
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
        <button className={s.navBtn} onClick={run} disabled={busy}><Wand2 size={15} /> Read my digit</button>
        <button className={s.pillBtn} onClick={clear}><Eraser size={14} /> Clear</button>
      </div>
      {result && !result.ok && (
        <div className={`${s.banner} ${s.bannerWarn}`}>
          {result.reason === 'blank' ? '✏️ Draw a digit first — big and bold works best!' : '⚠️ The digit model could not load. Check your connection and try again.'}
        </div>
      )}
      {result?.ok && (
        <>
          <div className={s.banner}>
            🎯 It reads: <b style={{ fontSize: '1.3rem' }}>{result.digit}</b> — {result.confidence}% confident.
            {result.confidence < 60 && ' (Low confidence — try writing it bigger and clearer, like the model’s training data.)'}
          </div>
          <Stages stages={result.stages} highlight={result.digit} />
        </>
      )}
    </div>
  );
}

const TABS = [
  { id: 'detect', label: '🔭 Object Detector' },
  { id: 'edges', label: '⚡ Edge Explorer' },
  { id: 'digit', label: '✍️ Digit Reader' },
];

const CVPlayground = ({ onBack }) => {
  const [tab, setTab] = useState('detect');

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Computer Vision · Demonstration"
      accent="#FF9F0A"
      title="Vision Playground."
      lede="Three real vision models running live in your browser — detect objects with your webcam, trace edges like a CNN, and have a neural network read your handwriting."
      video={VIDEO}
      realLife={[
        { icon: '🔓', title: 'Face unlock', text: 'Your phone finds facial edges and landmarks the same way the Edge Explorer does — then matches the pattern.' },
        { icon: '🛣️', title: 'FASTag & traffic cameras', text: 'Number-plate readers detect the plate (object detection) then read characters (like the digit reader).' },
        { icon: '🌾', title: 'Crop-disease apps', text: 'Farmers photograph a leaf; a vision model spots disease patterns — the same detect-then-classify pipeline.' },
        { icon: '🏥', title: 'X-ray screening', text: 'Hospital AIs highlight suspicious regions in scans with bounding boxes, exactly like the boxes you saw here.' },
      ]}
      check={{
        q: 'Quick check: what does a vision model actually receive as input?',
        options: ['A picture, like our eyes see it', 'A grid of numbers — one per pixel', 'A text description of the image', 'The photo’s file name'],
        answer: 1,
        explain: 'To a computer, an image IS numbers — brightness values in a grid. Every trick you saw (edges, detection, digit reading) is maths on that grid.',
      }}
    >
      <div className={s.card}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, justifyContent: 'center' }}>
          {TABS.map(t => (
            <button key={t.id} className={`${s.pillBtn} ${tab === t.id ? s.pillOn : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'detect' && (
          <div>
            <p className={s.muted} style={{ lineHeight: 1.55 }}>
              A COCO-SSD model (trained on 3,30,000 photos, knows 80 everyday things) runs on your machine.
              Point your webcam around the room or upload a photo — bottle, chair, dog, person…
            </p>
            <ObjectDetectionLab />
          </div>
        )}
        {tab === 'edges' && <EdgeTab />}
        {tab === 'digit' && <DigitTab />}
      </div>
    </DemoFlow>
  );
};

export default CVPlayground;
