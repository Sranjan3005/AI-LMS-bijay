import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Trash2, RotateCcw, Sparkles, Loader2, CameraOff } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import s from '../../components/sutra/DemoFlow.module.css';
import { loadModels, addExample, predict, reset as resetModel, imageFromUrl, seedFromUrls } from '../../lib/ml/transferLearning';

/**
 * Teach the Machine — few-shot image training that runs entirely in the browser.
 * Students give ~6 photos per class (webcam or upload), a pretrained MobileNet
 * turns each into a fingerprint, and a tiny KNN head learns the classes live.
 * Nothing is uploaded — the webcam never leaves the device.
 */

const COLORS = ['#64D2FF', '#BF5AF2', '#30D158'];

// "Merge your uploads with our dataset" — bundled starter examples.
const STARTER_PACKS = [
  { label: '🗑️ Clean vs Messy trash', classes: [
    { name: 'Clean photo', dir: 'trash/good' },
    { name: 'Messy photo', dir: 'trash/bad' },
  ] },
  { label: '🍄 Safe vs Poisonous', classes: [
    { name: 'Safe', dir: 'mushroom/brown_safe' },
    { name: 'Poisonous', dir: 'mushroom/red_poison' },
  ] },
];

export default function TeachTheMachine({ onBack }) {
  const [classes, setClasses] = useState([
    { name: 'Class A', samples: [] },
    { name: 'Class B', samples: [] },
  ]);
  const [status, setStatus] = useState('idle');   // idle | loading | ready
  const [loadMsg, setLoadMsg] = useState('');
  const [camOn, setCamOn] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [testImg, setTestImg] = useState(null);
  const [busy, setBusy] = useState('');
  const [liveOn, setLiveOn] = useState(false);

  const videoRef = useRef(null);
  const uploadRefs = useRef({});
  const testUploadRef = useRef(null);
  const liveTimer = useRef(null);

  const totalSamples = classes.reduce((n, c) => n + c.samples.length, 0);
  const trained = classes.filter((c) => c.samples.length > 0).length >= 2;

  /* ── model ── */
  const ensureModel = useCallback(async () => {
    if (status === 'ready') return;
    setStatus('loading');
    await loadModels(setLoadMsg);
    setStatus('ready');
  }, [status]);

  useEffect(() => () => { // cleanup on unmount
    if (liveTimer.current) clearInterval(liveTimer.current);
    videoRef.current?.srcObject?.getTracks?.().forEach((t) => t.stop());
  }, []);

  /* ── webcam ── */
  const startCam = async () => {
    setCamErr('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
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

  const frameToDataUrl = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = 224; c.height = 224;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.85);
  };

  /* ── teaching ── */
  const addSample = async (idx, dataUrl) => {
    await ensureModel();
    const img = await imageFromUrl(dataUrl);
    await addExample(img, classes[idx].name);
    setClasses((cs) => cs.map((c, i) => (i === idx ? { ...c, samples: [...c.samples, dataUrl] } : c)));
  };

  const captureTo = async (idx) => {
    if (!camOn) { await startCam(); return; }
    const url = frameToDataUrl();
    if (url) { setBusy(`cap-${idx}`); await addSample(idx, url); setBusy(''); }
  };

  const uploadTo = async (idx, files) => {
    setBusy(`up-${idx}`);
    for (const f of Array.from(files).slice(0, 10)) {
      const url = await new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(f); });
      await addSample(idx, url);
    }
    setBusy('');
  };

  const loadStarter = async (pack) => {
    setBusy('starter');
    await ensureModel();
    try {
      const manifest = await fetch('/datasets/manifest.json').then((r) => r.json());
      const next = [];
      for (const c of pack.classes) {
        const files = (manifest[c.dir] || []).map((f) => `/datasets/${f}`);
        await seedFromUrls(files, c.name);
        next.push({ name: c.name, samples: files });
      }
      setClasses(next);
    } catch (e) { console.error('starter pack failed', e); }
    setBusy('');
  };

  const renameClass = (idx, name) => {
    // renaming after teaching would orphan the learned label — reset to stay honest
    setClasses((cs) => cs.map((c, i) => (i === idx ? { ...c, name, samples: [] } : c)));
    resetModel();
    setPrediction(null);
  };

  const addClass = () => setClasses((cs) => [...cs, { name: `Class ${String.fromCharCode(65 + cs.length)}`, samples: [] }]);

  const clearAll = () => { resetModel(); setClasses((cs) => cs.map((c) => ({ ...c, samples: [] }))); setPrediction(null); setTestImg(null); };

  /* ── testing ── */
  const runPredict = useCallback(async (el) => {
    const p = await predict(el);
    setPrediction(p);
  }, []);

  const predictUpload = async (file) => {
    const url = await new Promise((res) => { const r = new FileReader(); r.onload = (e) => res(e.target.result); r.readAsDataURL(file); });
    setTestImg(url);
    const img = await imageFromUrl(url);
    await runPredict(img);
  };

  const toggleLive = () => {
    if (liveTimer.current) {
      clearInterval(liveTimer.current); liveTimer.current = null;
      setLiveOn(false); setPrediction(null);
      return;
    }
    setLiveOn(true);
    liveTimer.current = setInterval(() => {
      if (videoRef.current?.videoWidth) runPredict(videoRef.current);
    }, 600);
  };

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="AI Foundations · Hands-on"
      accent="#30D158"
      title="Teach the machine — with just 6 photos"
      lede="Real AI needs millions of images. You have six. So we cheat — the honest way: a model that already learned to see does the hard part, and you only teach it the last little bit. That's transfer learning."
      realLife={[
        { icon: '🧠', title: 'Why it works', text: 'MobileNet already learned edges, shapes and textures from a million photos. It turns your photo into a “fingerprint” — you only teach the final sorting step.' },
        { icon: '🔒', title: 'Stays on your device', text: 'Everything runs in this browser tab. Your webcam frames are never uploaded, never stored, never sent anywhere.' },
        { icon: '🏭', title: 'The real thing', text: 'This is exactly how companies build custom vision AI — nobody trains from scratch. They start from a pretrained model, like you just did.' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* LEFT — teach */}
        <div className={s.card} style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>1 · Teach it</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.82rem' }} onClick={camOn ? stopCam : startCam}>
                {camOn ? <><CameraOff size={13} /> Stop cam</> : <><Camera size={13} /> Use webcam</>}
              </button>
              <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.82rem' }} onClick={clearAll}><RotateCcw size={13} /> Reset</button>
            </div>
          </div>

          {/* webcam preview (shared by every class) */}
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#05060f', aspectRatio: '4/3', marginBottom: 12, display: camOn ? 'block' : 'none' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
          </div>
          {camErr && <div className={`${s.banner} ${s.bannerWarn}`} style={{ marginTop: 0, marginBottom: 10 }}>⚠️ {camErr}</div>}

          {/* starter packs */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <span className={s.muted} style={{ fontSize: '.8rem', alignSelf: 'center' }}>Or start from our data:</span>
            {STARTER_PACKS.map((p) => (
              <button key={p.label} className={s.pillBtn} style={{ padding: '5px 11px', fontSize: '.78rem' }}
                disabled={busy === 'starter'} onClick={() => loadStarter(p)}>{p.label}</button>
            ))}
          </div>

          {/* class cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {classes.map((c, i) => (
              <div key={i} style={{ border: `1px solid ${COLORS[i % COLORS.length]}44`, background: `${COLORS[i % COLORS.length]}0d`, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <input value={c.name} onChange={(e) => renameClass(i, e.target.value)}
                    style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.12)', color: COLORS[i % COLORS.length], fontWeight: 700, borderRadius: 6, padding: '4px 8px', fontFamily: 'inherit', minWidth: 0, flex: 1 }} />
                  <span className={s.muted} style={{ fontSize: '.78rem', whiteSpace: 'nowrap' }}>{c.samples.length} photo{c.samples.length === 1 ? '' : 's'}</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {c.samples.slice(-8).map((sUrl, k) => (
                    <img key={k} src={sUrl} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: `1px solid ${COLORS[i % COLORS.length]}55` }} />
                  ))}
                  {c.samples.length === 0 && <span className={s.muted} style={{ fontSize: '.78rem' }}>Add ~6 photos of this thing…</span>}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.8rem' }} disabled={busy.startsWith('cap')} onClick={() => captureTo(i)}>
                    {busy === `cap-${i}` ? <Loader2 size={13} /> : <Camera size={13} />} {camOn ? 'Capture' : 'Webcam'}
                  </button>
                  <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.8rem' }} disabled={busy.startsWith('up')} onClick={() => uploadRefs.current[i]?.click()}>
                    {busy === `up-${i}` ? <Loader2 size={13} /> : <Upload size={13} />} Upload
                  </button>
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                    ref={(el) => { uploadRefs.current[i] = el; }}
                    onChange={(e) => { if (e.target.files?.length) uploadTo(i, e.target.files); e.target.value = ''; }} />
                  {classes.length > 2 && (
                    <button className={s.pillBtn} style={{ padding: '6px 10px', fontSize: '.8rem', marginLeft: 'auto' }}
                      onClick={() => { setClasses((cs) => cs.filter((_, k) => k !== i)); resetModel(); }}><Trash2 size={13} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className={s.pillBtn} style={{ marginTop: 10, padding: '6px 12px', fontSize: '.8rem' }} onClick={addClass}>+ Add another class</button>

          {status === 'loading' && (
            <div className={s.banner} style={{ marginTop: 12 }}>⏳ {loadMsg || 'Loading the model…'} (first time only)</div>
          )}
        </div>

        {/* RIGHT — test */}
        <div className={s.card} style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 10px' }}>2 · Test it</h3>
          {!trained ? (
            <div className={`${s.banner} ${s.bannerWarn}`} style={{ marginTop: 0 }}>
              🤔 Teach it <b>at least 2 classes</b> first — a sorter needs something to compare against. ~6 photos each works surprisingly well.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.82rem' }} disabled={!camOn} onClick={toggleLive}>
                  <Sparkles size={13} /> {liveOn ? 'Stop live' : 'Live webcam guess'}
                </button>
                <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.82rem' }} onClick={() => testUploadRef.current?.click()}>
                  <Upload size={13} /> Test an image
                </button>
                <input type="file" accept="image/*" style={{ display: 'none' }} ref={testUploadRef}
                  onChange={(e) => { if (e.target.files?.[0]) predictUpload(e.target.files[0]); e.target.value = ''; }} />
              </div>
              {!camOn && <p className={s.muted} style={{ fontSize: '.8rem', marginTop: 0 }}>Turn the webcam on (left) for live guessing, or upload a photo to test.</p>}

              {testImg && <img src={testImg} alt="test" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 10, marginBottom: 12, background: '#05060f' }} />}

              {prediction ? (
                <>
                  <div style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: '#9aa0b5', marginBottom: 6 }}>It thinks this is</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#30D158', marginBottom: 12 }}>
                    {prediction.label} <span style={{ fontSize: '1rem', color: '#9aa0b5' }}>· {prediction.confidence}% sure</span>
                  </div>
                  {Object.entries(prediction.all).map(([label, pct], i) => (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem', marginBottom: 3 }}>
                        <span>{label}</span><span className={s.muted}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: 'rgba(255,255,255,.07)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], transition: 'width .3s' }} />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className={s.muted} style={{ fontSize: '.9rem' }}>No guess yet — start the live webcam or test an image.</p>
              )}

              <div className={s.banner} style={{ marginTop: 16 }}>
                🔬 Try to <b>break it</b>: show it something from a weird angle, or in bad light. When it fails, that&apos;s your data telling you it needs more variety — the single most important lesson in ML.
              </div>
            </>
          )}
          <p className={s.muted} style={{ fontSize: '.75rem', marginTop: 12 }}>
            Total examples taught: {totalSamples}. Everything stays in this browser tab.
          </p>
        </div>
      </div>
    </DemoFlow>
  );
}
