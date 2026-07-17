import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Image as ImageIcon, Play, Square, Upload, Loader2, ScanEye, Sparkles, AlertTriangle } from 'lucide-react';
import { loadDetector, detect, HOUSEHOLD_CLASSES } from '../../lib/cv/detector';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const colorFor = (cls) => {
  let h = 0;
  for (let i = 0; i < cls.length; i++) h = (h + cls.charCodeAt(i) * 37) % 360;
  return `hsl(${h}, 90%, 60%)`;
};

const drawBoxes = (ctx, preds) => {
  const W = ctx.canvas.width;
  ctx.lineWidth = Math.max(2, W / 320);
  ctx.font = `${Math.max(14, W / 45)}px Outfit, sans-serif`;
  ctx.textBaseline = 'top';
  preds.forEach((p) => {
    const [x, y, w, h] = p.bbox;
    const c = colorFor(p.class);
    ctx.strokeStyle = c;
    ctx.strokeRect(x, y, w, h);
    const label = `${p.class} ${Math.round(p.score * 100)}%`;
    const pad = 4;
    const tw = ctx.measureText(label).width;
    const th = Math.max(16, W / 40);
    ctx.fillStyle = c;
    ctx.fillRect(x - ctx.lineWidth / 2, Math.max(0, y - th - pad), tw + pad * 2, th + pad);
    ctx.fillStyle = '#000';
    ctx.fillText(label, x + pad - ctx.lineWidth / 2, Math.max(0, y - th));
  });
};

const ObjectDetectionLab = () => {
  const [mode, setMode] = useState('webcam');
  const [modelState, setModelState] = useState('idle');
  const [loadMsg, setLoadMsg] = useState('');
  const [running, setRunning] = useState(false);
  const [camError, setCamError] = useState('');
  const [detections, setDetections] = useState([]);
  const [fps, setFps] = useState(0);
  const [hasImage, setHasImage] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);
  const lastPreds = useRef([]);
  const fpsRef = useRef({ last: 0, n: 0 });

  useEffect(() => {
    setModelState('loading');
    loadDetector(setLoadMsg)
      .then(() => setModelState('ready'))
      .catch((e) => { console.error('detector load failed', e); setModelState('error'); });
  }, []);

  const stopWebcam = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    lastPreds.current = [];
  }, []);

  useEffect(() => () => stopWebcam(), [stopWebcam]);
  // Reset when switching modes.
  useEffect(() => { stopWebcam(); setDetections([]); setHasImage(false); setCamError(''); }, [mode, stopWebcam]);

  // Boxes-only overlay on top of the live <video>. Cheap; video renders natively.
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current, video = videoRef.current;
    if (runningRef.current && canvas && video && video.videoWidth > 0) {
      if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBoxes(ctx, lastPreds.current);
    }
    if (runningRef.current) rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  // Detection loop — ALWAYS yields (>=16ms) each iteration so a failing/slow frame
  // can never busy-spin and freeze the tab. Capped to ~14 detections/sec.
  const detectLoop = useCallback(async () => {
    const MIN_MS = 70;
    while (runningRef.current) {
      const start = performance.now();
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const preds = await detect(video, 20);
          if (!runningRef.current) break;
          lastPreds.current = preds;
          setDetections(preds);
          const f = fpsRef.current; f.n++;
          const now = performance.now();
          if (now - f.last > 500) { setFps(Math.round((f.n * 1000) / (now - f.last))); f.n = 0; f.last = now; }
        } catch (e) { /* skip this frame */ }
      }
      const elapsed = performance.now() - start;
      await sleep(Math.max(MIN_MS - elapsed, 16));
    }
  }, []);

  const startWebcam = async () => {
    setCamError('');
    if (modelState !== 'ready') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await new Promise((res) => {
        if (video.readyState >= 1) return res();
        video.onloadedmetadata = () => res();
      });
      await video.play();
      runningRef.current = true;
      setRunning(true);
      fpsRef.current = { last: performance.now(), n: 0 };
      rafRef.current = requestAnimationFrame(renderLoop);
      detectLoop();
    } catch (e) {
      console.error('webcam start failed', e);
      stopWebcam();
      setCamError(
        e.name === 'NotAllowedError' ? 'Camera permission was blocked. Click the camera icon in your browser\'s address bar to allow it, then try again.'
        : e.name === 'NotFoundError' ? 'No camera was found on this device.'
        : e.name === 'NotReadableError' ? 'Your camera is being used by another app. Close it and try again.'
        : `Could not start the camera (${e.name || 'unknown error'}).`
      );
    }
  };

  const handleImage = (file) => {
    if (!file) return;
    const img = new Image();
    img.onload = async () => {
      const canvas = canvasRef.current;
      const maxW = 900;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHasImage(true);
      try {
        const preds = await detect(canvas, 20);
        drawBoxes(ctx, preds);
        setDetections(preds);
      } catch (e) { console.error('image detect failed', e); }
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const detectedClasses = new Set(detections.map((d) => d.class));
  const showEmpty = (mode === 'webcam' && !running) || (mode === 'image' && !hasImage);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#00F0FF,#B200FF)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ScanEye size={28} color="#000" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>The Object Detective</h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Live object detection — the same idea that powers YOLO. Point your camera and watch the AI find things!</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, margin: '20px 0' }}>
        {[['webcam', 'Live Webcam', Camera], ['image', 'Detect in a Photo', ImageIcon]].map(([m, label, Icon]) => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${mode === m ? 'rgba(0,240,255,0.6)' : 'var(--glass-border)'}`,
              background: mode === m ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.03)',
              color: mode === m ? '#00F0FF' : 'var(--text-secondary)', fontWeight: 600, fontFamily: 'Outfit, sans-serif',
            }}>
            <Icon size={18} /> {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, alignItems: 'start' }}>
        <div className="glass-panel" style={{ padding: 16, background: 'rgba(10,15,30,0.7)', borderRadius: 16 }}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Live video (native render) */}
            <video ref={videoRef} playsInline muted
              style={{ width: '100%', display: mode === 'webcam' && running ? 'block' : 'none' }} />
            {/* Canvas: boxes overlay in webcam mode; full image in image mode */}
            <canvas ref={canvasRef}
              style={mode === 'webcam'
                ? { position: 'absolute', inset: 0, width: '100%', height: '100%', display: running ? 'block' : 'none', pointerEvents: 'none' }
                : { width: '100%', display: hasImage ? 'block' : 'none' }} />

            {showEmpty && (
              <div style={{ padding: 50, textAlign: 'center', color: 'var(--text-secondary)' }}>
                {modelState === 'loading' && (<><Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} /><p style={{ marginTop: 12 }}>{loadMsg || 'Loading the detector…'}</p></>)}
                {modelState === 'error' && (<><AlertTriangle size={40} color="#FF3366" /><p style={{ marginTop: 12 }}>Couldn't load the detection model. Check your internet and reload.</p></>)}
                {modelState === 'ready' && mode === 'webcam' && (<><Camera size={40} color="#00F0FF" /><p style={{ marginTop: 12 }}>Press Start to turn on your camera.</p></>)}
                {modelState === 'ready' && mode === 'image' && (<><ImageIcon size={40} color="#00F0FF" /><p style={{ marginTop: 12 }}>Upload a photo to find objects in it.</p></>)}
              </div>
            )}

            {running && (
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.55)', padding: '6px 12px', borderRadius: 20, fontSize: '0.8rem', display: 'flex', gap: 14, zIndex: 3 }}>
                <span style={{ color: '#00FF88' }}>● LIVE</span>
                <span>{fps} detections/s</span>
                <span>{detections.length} object{detections.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {mode === 'webcam' ? (
              running ? (
                <button className="btn-secondary" onClick={stopWebcam} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Square size={16} /> Stop</button>
              ) : (
                <button className="btn-primary" onClick={startWebcam} disabled={modelState !== 'ready'} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: modelState !== 'ready' ? 0.5 : 1 }}>
                  <Play size={16} /> {modelState === 'ready' ? 'Start Camera' : 'Loading model…'}
                </button>
              )
            ) : (
              <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: modelState === 'ready' ? 'pointer' : 'not-allowed', opacity: modelState !== 'ready' ? 0.5 : 1 }}>
                <Upload size={16} /> {hasImage ? 'Choose another photo' : 'Upload a photo'}
                <input type="file" accept="image/*" hidden disabled={modelState !== 'ready'} onChange={(e) => handleImage(e.target.files[0])} />
              </label>
            )}
          </div>

          {camError && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(255,51,102,0.1)', border: '1px solid rgba(255,51,102,0.3)', color: '#FF6B8A', fontSize: '0.9rem', display: 'flex', gap: 8 }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} /> {camError}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-panel" style={{ padding: 18, background: 'rgba(15,23,42,0.7)', borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={18} color="#00F0FF" /> What the AI sees</h3>
            {detections.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>No objects yet — start the camera or upload a photo. Try a person, phone, cup, book, or chair!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                {detections.map((d, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 12, height: 12, borderRadius: 3, background: colorFor(d.class) }} />
                      <span style={{ textTransform: 'capitalize' }}>{d.class}</span>
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{Math.round(d.score * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: 18, background: 'rgba(15,23,42,0.7)', borderRadius: 16 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>How does it work? 🧠</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 12px' }}>
              A YOLO-style model looks at the <strong>whole picture just once</strong>, splits it into a grid, and for every part guesses
              <em> "is there an object here, and what is it?"</em> — all in a single pass. That's why it's fast enough for live video.
            </p>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Everyday things it can spot around you:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
              {HOUSEHOLD_CLASSES.map((c) => {
                const on = detectedClasses.has(c);
                return (
                  <span key={c} style={{
                    fontSize: '0.72rem', padding: '3px 8px', borderRadius: 20, textTransform: 'capitalize',
                    background: on ? 'rgba(0,255,136,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${on ? 'rgba(0,255,136,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: on ? '#00FF88' : 'var(--text-secondary)',
                  }}>{c}</span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectDetectionLab;
