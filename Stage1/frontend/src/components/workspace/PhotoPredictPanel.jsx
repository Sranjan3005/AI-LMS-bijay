import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraOff, Upload, Loader2, Sparkles } from 'lucide-react';
import { loadModels, predict, imageFromUrl, seedFromUrls, getNumClasses } from '../../lib/ml/transferLearning';
import { PHOTO_TRAINING } from './PhotoTrainingLab';

/**
 * PhotoPredictPanel — test the scenario with a real PHOTO at the prediction step.
 *
 * Important: the model trained in the lab learned from *measurements* and cannot
 * see pictures. This panel uses the browser-side VISION model (MobileNet + KNN)
 * instead, and says so — the contrast is the lesson: one model measures, the
 * other sees.
 */
const COLORS = ['#30D158', '#64D2FF', '#FF9F0A', '#BF5AF2'];

export default function PhotoPredictPanel({ scenario }) {
  const cfg = PHOTO_TRAINING[scenario?.title];
  // The vision model is a module singleton — it may already be taught from the
  // photo trainer earlier in this session, so read that once at mount.
  const [taught, setTaught] = useState(() => getNumClasses() >= 2);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [img, setImg] = useState(null);
  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const fileRef = useRef(null);

  // Always release the camera when this panel goes away.
  useEffect(() => {
    const video = videoRef.current;
    return () => video?.srcObject?.getTracks?.().forEach((t) => t.stop());
  }, []);

  if (!cfg) return null;

  const startCam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
    } catch { setMsg('Could not open the camera — check the browser permission.'); }
  };
  const stopCam = () => {
    videoRef.current?.srcObject?.getTracks?.().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  };

  const loadOurPhotos = async () => {
    setBusy('seed'); setMsg('Loading the vision model…');
    await loadModels(setMsg);
    try {
      const manifest = await fetch('/datasets/manifest.json').then((r) => r.json());
      for (const [label, dirs] of Object.entries(cfg.seed)) {
        const urls = dirs.flatMap((d) => (manifest[d] || []).map((f) => `/datasets/${f}`));
        await seedFromUrls(urls, label);
      }
      setTaught(true); setMsg('');
    } catch { setMsg('Could not load our sample photos.'); }
    setBusy('');
  };

  const runOn = async (el) => { setResult(await predict(el)); };

  const onFile = async (f) => {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(f); });
    setImg(url); setBusy('p'); setMsg('Loading the vision model…');
    await loadModels(setMsg); setMsg('');
    await runOn(await imageFromUrl(url));
    setBusy('');
  };

  const shoot = async () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return;
    const c = document.createElement('canvas');
    c.width = 224; c.height = 224;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const url = c.toDataURL('image/jpeg', 0.85);
    setImg(url); setBusy('p');
    await runOn(await imageFromUrl(url));
    setBusy('');
  };

  return (
    <div style={{ background: 'rgba(48,209,88,.06)', border: '1px solid rgba(48,209,88,.3)', borderRadius: 14, padding: 16, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Camera size={17} color="#30D158" />
        <b style={{ color: '#4ade80' }}>Or test it with a real photo</b>
      </div>
      <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '.85rem', lineHeight: 1.55 }}>
        Heads up: the model you just trained learned from <b style={{ color: '#fff' }}>numbers</b>, so it can&apos;t see pictures.
        This uses your <b style={{ color: '#4ade80' }}>vision model</b> — the one taught from photos. Same problem, two very different models.
      </p>

      {!taught ? (
        <div style={{ color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.6 }}>
          {cfg.seed ? (
            <>
              The vision model hasn&apos;t been taught yet.{' '}
              <button onClick={loadOurPhotos} disabled={busy === 'seed'} style={btn}>
                {busy === 'seed' ? <Loader2 size={13} /> : '📚'} Teach it from our labelled photos
              </button>
              {msg && <div style={{ color: '#67e8f9', marginTop: 8 }}>{msg}</div>}
            </>
          ) : (
            <>🎓 Teach it photos first: go to <b style={{ color: '#fff' }}>“collect your own data”</b> → <b style={{ color: '#4ade80' }}>📷 Teach with real photos</b>, show it ~6 pictures per group, then come back here.</>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button onClick={camOn ? stopCam : startCam} style={btn}>
              {camOn ? <><CameraOff size={13} /> Stop</> : <><Camera size={13} /> Webcam</>}
            </button>
            {camOn && <button onClick={shoot} disabled={busy === 'p'} style={btn}><Sparkles size={13} /> Snap &amp; predict</button>}
            <button onClick={() => fileRef.current?.click()} style={btn}><Upload size={13} /> Upload a photo</button>
            <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileRef}
              onChange={(e) => { if (e.target.files?.[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
          </div>

          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#05060f', aspectRatio: '4/3', marginBottom: 10, display: camOn ? 'block' : 'none', maxWidth: 320 }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {img && !camOn && <img src={img} alt="test" style={{ maxWidth: 220, maxHeight: 160, objectFit: 'contain', borderRadius: 10, marginBottom: 10, background: '#05060f', display: 'block' }} />}
          {msg && <div style={{ color: '#67e8f9', fontSize: '.82rem', marginBottom: 8 }}>{msg}</div>}

          {result && (
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#30D158', marginBottom: 10 }}>
                🎯 {result.label} <span style={{ fontSize: '.9rem', color: 'var(--text-secondary)' }}>· {result.confidence}% sure</span>
              </div>
              {Object.entries(result.all).map(([label, pct], i) => (
                <div key={label} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 2 }}>
                    <span>{label}</span><span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], transition: 'width .3s' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      <p style={{ color: 'var(--text-secondary)', fontSize: '.72rem', marginTop: 10, marginBottom: 0 }}>
        🔒 Runs in this browser tab — photos are never uploaded.
      </p>
    </div>
  );
}

const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
  background: 'rgba(255,255,255,.06)', border: '1px solid var(--glass-border)', color: '#e8eaf2',
  fontFamily: 'inherit', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer',
};
