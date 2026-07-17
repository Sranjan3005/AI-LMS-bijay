import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Upload, RotateCcw, Sparkles, Loader2 } from 'lucide-react';
import { loadModels, addExample, predict, reset as resetModel, imageFromUrl, seedFromUrls } from '../../lib/ml/transferLearning';

/**
 * PhotoTrainingLab — train THIS scenario's classifier from real photos, in the
 * browser. A pretrained MobileNet does the seeing; a tiny KNN head learns the
 * scenario's classes from the handful of photos the student takes. No backend,
 * no upload — the webcam never leaves the device.
 *
 * This is the real thing the numeric feature table only simulates.
 */

const COLORS = ['#30D158', '#64D2FF', '#FF9F0A', '#BF5AF2'];

// Which scenarios can be taught from photos, and with what classes.
export const PHOTO_TRAINING = {
  'The Smart Trash Can': {
    classes: ['Recycle', 'Compost', 'Trash'],
    blurb: 'Photograph real rubbish — a bottle, a banana peel, a crisp packet — and teach the bin which of the three it belongs in. Aim for ~6 photos per bin, from different angles.',
  },
  'The Forest Forager': {
    classes: ['Safe to eat', 'Poisonous'],
    seed: {
      'Safe to eat': ['mushroom/brown_safe', 'mushroom/red_safe'],
      'Poisonous': ['mushroom/red_poison', 'mushroom/brown_poison'],
    },
    blurb: 'Teach it from real mushroom photos. Start from our labelled set, then add your own — and see whether it learned the real warning signs or just “red = danger”.',
  },
};

export const hasPhotoTraining = (title) => Boolean(PHOTO_TRAINING[title]);

export default function PhotoTrainingLab({ scenario }) {
  const cfg = PHOTO_TRAINING[scenario?.title];
  const [samples, setSamples] = useState({});      // label -> [dataUrl]
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [busy, setBusy] = useState('');
  const [loadMsg, setLoadMsg] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [testImg, setTestImg] = useState(null);
  const [liveOn, setLiveOn] = useState(false);

  const videoRef = useRef(null);
  const uploadRefs = useRef({});
  const testRef = useRef(null);
  const liveTimer = useRef(null);

  // Start this scenario with an empty classifier head, and always release the
  // camera/timer on unmount. (The parent remounts us per scenario via `key`,
  // so component state resets naturally — no setState-in-effect needed.)
  useEffect(() => {
    resetModel();
    const video = videoRef.current;
    const timer = liveTimer;
    return () => {
      if (timer.current) clearInterval(timer.current);
      video?.srcObject?.getTracks?.().forEach((t) => t.stop());
    };
  }, []);

  const taughtClasses = Object.values(samples).filter((a) => a?.length).length;
  const ready = taughtClasses >= 2;

  const startCam = async () => {
    setCamErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCamOn(true);
    } catch (e) {
      console.error(e);
      setCamErr('Could not open the camera — check the browser permission.');
    }
  };
  const stopCam = () => {
    videoRef.current?.srcObject?.getTracks?.().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
    if (liveTimer.current) { clearInterval(liveTimer.current); liveTimer.current = null; }
    setLiveOn(false);
  };

  const frameUrl = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = 224; c.height = 224;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  };

  const teach = async (label, dataUrl) => {
    setLoadMsg('Loading the vision model…');
    await loadModels(setLoadMsg);
    setLoadMsg('');
    const img = await imageFromUrl(dataUrl);
    await addExample(img, label);
    setSamples((s) => ({ ...s, [label]: [...(s[label] || []), dataUrl] }));
  };

  const capture = async (label) => {
    if (!camOn) { await startCam(); return; }
    const url = frameUrl();
    if (url) { setBusy(`c-${label}`); await teach(label, url); setBusy(''); }
  };

  const upload = async (label, files) => {
    setBusy(`u-${label}`);
    for (const f of Array.from(files).slice(0, 10)) {
      const url = await new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(f); });
      await teach(label, url);
    }
    setBusy('');
  };

  // "Merge your photos with our dataset" — seed from the bundled labelled images.
  const seedFromOurData = async () => {
    if (!cfg.seed) return;
    setBusy('seed');
    setLoadMsg('Loading the vision model…');
    await loadModels(setLoadMsg);
    setLoadMsg('');
    try {
      const manifest = await fetch('/datasets/manifest.json').then((r) => r.json());
      const next = {};
      for (const [label, dirs] of Object.entries(cfg.seed)) {
        const urls = dirs.flatMap((d) => (manifest[d] || []).map((f) => `/datasets/${f}`));
        await seedFromUrls(urls, label);
        next[label] = urls;
      }
      setSamples((s) => {
        const merged = { ...s };
        for (const [k, v] of Object.entries(next)) merged[k] = [...(merged[k] || []), ...v];
        return merged;
      });
    } catch (e) { console.error('seed failed', e); }
    setBusy('');
  };

  const clearAll = () => { resetModel(); setSamples({}); setPrediction(null); setTestImg(null); };

  const runPredict = useCallback(async (el) => setPrediction(await predict(el)), []);

  const testUpload = async (file) => {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(file); });
    setTestImg(url);
    await runPredict(await imageFromUrl(url));
  };

  const toggleLive = () => {
    if (liveTimer.current) { clearInterval(liveTimer.current); liveTimer.current = null; setLiveOn(false); setPrediction(null); return; }
    setLiveOn(true);
    liveTimer.current = setInterval(() => { if (videoRef.current?.videoWidth) runPredict(videoRef.current); }, 600);
  };

  if (!cfg) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, alignItems: 'start' }}>
      {/* TEACH */}
      <div style={{ background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>📷 Teach it with real photos</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={camOn ? stopCam : startCam} style={pill}>
              {camOn ? <><CameraOff size={13} /> Stop</> : <><Camera size={13} /> Webcam</>}
            </button>
            <button onClick={clearAll} style={pill}><RotateCcw size={13} /> Reset</button>
          </div>
        </div>
        <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.55 }}>{cfg.blurb}</p>

        <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#05060f', aspectRatio: '4/3', marginBottom: 12, display: camOn ? 'block' : 'none' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {camErr && <div style={{ color: '#ffcf70', fontSize: '.85rem', marginBottom: 10 }}>⚠️ {camErr}</div>}
        {loadMsg && <div style={{ color: '#67e8f9', fontSize: '.85rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={13} /> {loadMsg} (first time only)</div>}

        {cfg.seed && (
          <button onClick={seedFromOurData} disabled={busy === 'seed'} style={{ ...pill, marginBottom: 12 }}>
            {busy === 'seed' ? <Loader2 size={13} /> : '📚'} Start from our labelled photos
          </button>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cfg.classes.map((label, i) => {
            const mine = samples[label] || [];
            const c = COLORS[i % COLORS.length];
            return (
              <div key={label} style={{ border: `1px solid ${c}44`, background: `${c}0d`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <b style={{ color: c }}>{label}</b>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '.75rem' }}>{mine.length} photo{mine.length === 1 ? '' : 's'}</span>
                </div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {mine.slice(-8).map((u, k) => (
                    <img key={k} src={u} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 5, border: `1px solid ${c}55` }} />
                  ))}
                  {!mine.length && <span style={{ color: 'var(--text-secondary)', fontSize: '.75rem' }}>Add ~6 photos…</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => capture(label)} disabled={busy.startsWith('c-')} style={pill}>
                    {busy === `c-${label}` ? <Loader2 size={13} /> : <Camera size={13} />} {camOn ? 'Capture' : 'Webcam'}
                  </button>
                  <button onClick={() => uploadRefs.current[label]?.click()} disabled={busy.startsWith('u-')} style={pill}>
                    {busy === `u-${label}` ? <Loader2 size={13} /> : <Upload size={13} />} Upload
                  </button>
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    ref={(el) => { uploadRefs.current[label] = el; }}
                    onChange={(e) => { if (e.target.files?.length) upload(label, e.target.files); e.target.value = ''; }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TEST */}
      <div style={{ background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '1.15rem' }}>🤖 Try your model</h3>
        {!ready ? (
          <div style={{ background: 'rgba(255,159,10,.1)', border: '1px solid rgba(255,159,10,.4)', borderRadius: 12, padding: '12px 14px', color: '#ffe9c7', lineHeight: 1.55, fontSize: '.92rem' }}>
            🤔 Teach it at least <b>2</b> of the {cfg.classes.length} groups first — a sorter needs something to compare against.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <button onClick={toggleLive} disabled={!camOn} style={pill}><Sparkles size={13} /> {liveOn ? 'Stop live' : 'Live webcam guess'}</button>
              <button onClick={() => testRef.current?.click()} style={pill}><Upload size={13} /> Test a photo</button>
              <input type="file" accept="image/*" style={{ display: 'none' }} ref={testRef}
                onChange={(e) => { if (e.target.files?.[0]) testUpload(e.target.files[0]); e.target.value = ''; }} />
            </div>
            {testImg && <img src={testImg} alt="test" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 10, marginBottom: 12, background: '#05060f' }} />}

            {prediction ? (
              <>
                <div style={{ fontSize: '.75rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)' }}>It says</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#30D158', margin: '2px 0 12px' }}>
                  {prediction.label} <span style={{ fontSize: '.95rem', color: 'var(--text-secondary)' }}>· {prediction.confidence}%</span>
                </div>
                {Object.entries(prediction.all).map(([label, pct], i) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: 3 }}>
                      <span>{label}</span><span style={{ color: 'var(--text-secondary)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 7, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], transition: 'width .3s' }} />
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '.9rem' }}>Turn on the webcam for live guessing, or test a photo.</p>
            )}

            <div style={{ marginTop: 16, background: 'rgba(0,240,255,.06)', border: '1px solid rgba(0,240,255,.28)', borderRadius: 12, padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.55 }}>
              🔬 Now try to <b style={{ color: '#fff' }}>break it</b>: odd angle, bad light, something it never saw. When it fails, that&apos;s your data asking for more variety — the most important lesson in ML.
            </div>
          </>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '.72rem', marginTop: 12 }}>
          🔒 Runs entirely in this browser tab — your photos are never uploaded or stored.
        </p>
      </div>
    </div>
  );
}

const pill = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999,
  background: 'rgba(255,255,255,.06)', border: '1px solid var(--glass-border)', color: '#e8eaf2',
  fontFamily: 'inherit', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer',
};
