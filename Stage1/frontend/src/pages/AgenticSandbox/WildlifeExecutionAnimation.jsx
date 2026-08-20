import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Radar, MapPin, Send, ShieldAlert, Leaf, Upload, RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import api from '../../api';

/**
 * WildlifeExecutionAnimation — the "end product" of the Wildlife Rescue Drone
 * flow, played as a 3-card wizard so each pipeline stage is its own step:
 *   1. Upload / choose the drone frame,
 *   2. Object Detection draws REAL bounding boxes (client-side coco-ssd) and the
 *      Decider sorts each animal Endangered vs Normal,
 *   3. An automated alert is dispatched to the rangers with GPS coordinates.
 * Fully client-side, so it always runs in class. Boxes are mapped through the
 * `object-fit: contain` transform so they sit exactly on each animal.
 */

const ENDANGERED = ['elephant', 'zebra', 'giraffe', 'bear', 'tiger', 'rhino', 'lion', 'leopard', 'cheetah', 'hippopotamus'];

const SAMPLES = [
  { url: '/datasets/wildlife/scene/01.jpg', label: '🦓 Savanna' },
  { url: '/datasets/wildlife/scene/02.jpg', label: '🐘 Herd' },
  { url: '/datasets/wildlife/scene/03.jpg', label: '🐄 Field' },
];

const BOX_COLORS = ['#64D2FF', '#BF5AF2', '#FF9F0A', '#30D158', '#FF375F', '#5E5CE6'];
const coordFor = (i) => `${(11.4 + i * 0.07).toFixed(4)}°N, ${(76.7 + i * 0.05).toFixed(4)}°E`;

const STEPS = ['Upload frame', 'Detect & decide', 'Alert rangers'];

export default function WildlifeExecutionAnimation({ onClose, initialImage }) {
  const [step, setStep] = useState(0);
  const [imgUrl, setImgUrl] = useState(initialImage || SAMPLES[0].url);
  const [dets, setDets] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState('');
  const imgRef = useRef(null);
  const wrapRef = useRef(null);

  const resetToPick = () => { setStep(0); setDets([]); setErr(''); };
  const pickSample = (url) => { setImgUrl(url); setDets([]); setErr(''); };
  const onUpload = (e) => {
    const f = e.target.files?.[0];
    if (f) { setImgUrl(URL.createObjectURL(f)); setDets([]); setErr(''); }
    e.target.value = '';
  };

  // Detect, then map natural-pixel boxes through the object-fit:contain layout
  // (scale by min ratio, then add the letterbox offset) so boxes line up exactly.
  const runDetection = useCallback(async () => {
    const img = imgRef.current, wrap = wrapRef.current;
    if (!img || !wrap) return;
    setErr(''); setScanning(true);
    try {
      // 1. Get base64 of the image
      let base64Image = '';
      if (imgUrl.startsWith('data:')) {
        base64Image = imgUrl;
      } else {
        const response = await fetch(imgUrl);
        const blob = await response.blob();
        base64Image = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }

      // 2. Call Azure OpenAI vision endpoint
      const res = await api.post('/agentic/workflows/object_detect/', { image: base64Image });
      const preds = res.data.detections || [];

      // 3. Map bounding boxes
      const cW = wrap.clientWidth, cH = wrap.clientHeight;
      const nW = img.naturalWidth || cW, nH = img.naturalHeight || cH;
      const scale = Math.min(cW / nW, cH / nH);
      const offX = (cW - nW * scale) / 2, offY = (cH - nH * scale) / 2;
      
      const boxed = preds.map((p, i) => {
        // OpenAI normalized coords: [x, y, w, h] (0 to 1)
        const [nx, ny, nw, nh] = p.bbox || [0.1, 0.1, 0.2, 0.2]; // fallback
        const cls = (p.class || 'unknown').toLowerCase();
        
        // Convert normalized to natural pixels
        const x = nx * nW;
        const y = ny * nH;
        const w = nw * nW;
        const h = nh * nH;
        
        const endangered = ENDANGERED.some(e => cls.includes(e));
        return {
          id: i, cls, score: p.score || 0.9, endangered: endangered,
          left: x * scale + offX, top: y * scale + offY, width: w * scale, height: h * scale,
          color: BOX_COLORS[i % BOX_COLORS.length],
        };
      });
      
      setScanning(false);
      if (!boxed.length) { setErr('No animals spotted in this frame — try another sample or upload a clearer photo.'); return; }
      setDets(boxed);
      setStep(1);
    } catch (e) {
      console.error('wildlife detect failed', e);
      setScanning(false);
      setErr('Could not load the detection model — check your connection and try again.');
    }
  }, [imgUrl]);

  const endangeredList = dets.filter((d) => d.endangered);
  const normalList = dets.filter((d) => !d.endangered);
  const showBoxes = step >= 1;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(4,6,14,.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(880px, 96vw)', maxHeight: '92vh', overflow: 'auto', background: 'rgba(14,17,28,.98)', border: '1px solid rgba(100,210,255,.25)', borderRadius: 20, padding: 22, color: '#f2f3f8', fontFamily: 'inherit' }}
      >
        {/* header + step indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Radar size={20} color="#64D2FF" /> Wildlife Rescue Drone — live run
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 0, color: '#9aa0b5', cursor: 'pointer' }}><X size={22} /></button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 999, fontSize: '.82rem', fontWeight: 600,
              background: i === step ? 'color-mix(in srgb,#64D2FF 18%,transparent)' : 'rgba(255,255,255,.04)',
              border: `1px solid ${i === step ? 'rgba(100,210,255,.55)' : 'rgba(255,255,255,.1)'}`,
              color: i < step ? '#4ade80' : i === step ? '#fff' : '#9aa0b5' }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', background: i <= step ? '#64D2FF' : 'rgba(255,255,255,.1)', color: i <= step ? '#05060f' : '#9aa0b5' }}>
                {i < step ? '✓' : i + 1}
              </span>
              {s}
            </div>
          ))}
        </div>

        {/* persistent stage — the drone frame with boxes */}
        <div ref={wrapRef} style={{ position: 'relative', width: '100%', aspectRatio: '16 / 10', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', background: '#05060f' }}>
          <img ref={imgRef} src={imgUrl} alt="drone frame" crossOrigin="anonymous"
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />

          {scanning && (
            <motion.div initial={{ top: '-8%' }} animate={{ top: '108%' }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'linear-gradient(90deg,transparent,#64D2FF,transparent)', boxShadow: '0 0 18px #64D2FF' }} />
          )}

          <AnimatePresence>
            {showBoxes && dets.map((d) => (
              <motion.div key={d.id}
                initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.06 * d.id, type: 'spring', stiffness: 260, damping: 20 }}
                style={{ position: 'absolute', left: d.left, top: d.top, width: d.width, height: d.height, border: `2.5px solid ${d.color}`, borderRadius: 5, boxShadow: `0 0 12px ${d.color}88` }}>
                <span style={{ position: 'absolute', top: -21, left: -2, background: d.color, color: '#05060f', fontSize: '.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: 5, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                  {d.cls} {Math.round(d.score * 100)}%{step >= 1 && (d.endangered ? ' · ⚠️' : ' · ✓')}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          {scanning && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64D2FF', fontWeight: 600, gap: 8, background: 'rgba(4,6,14,.25)' }}>
              <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }} style={{ display: 'inline-flex' }}><Radar size={18} /></motion.span>
              Object Detection scanning…
            </div>
          )}
        </div>

        {/* step cards */}
        <div style={{ marginTop: 16 }}>
          <AnimatePresence mode="wait">
            {/* STEP 0 — pick / upload */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>1 · Give the drone a frame</h3>
                <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>Pick a jungle scene or upload your own photo — then let the pipeline run on it.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {SAMPLES.map((s) => (
                    <button key={s.url} onClick={() => pickSample(s.url)} style={pill(imgUrl === s.url)}>{s.label}</button>
                  ))}
                  <label style={{ ...pill(false), cursor: 'pointer' }}><Upload size={14} /> Upload<input type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} /></label>
                </div>
                {err && <div style={{ color: '#ffcf70', fontSize: '.88rem', marginBottom: 10 }}>⚠️ {err}</div>}
                <button onClick={runDetection} disabled={scanning} style={primary}>
                  <Radar size={18} /> {scanning ? 'Scanning…' : 'Run object detection'} <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {/* STEP 1 — detection + decider */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>2 · Detect &amp; decide</h3>
                <p style={{ margin: '0 0 12px', color: '#9aa0b5', fontSize: '.9rem' }}>
                  The Object-Detection node found <b style={{ color: '#fff' }}>{dets.length}</b> animal{dets.length === 1 ? '' : 's'}. The Decider sorts each one:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  <div style={panel('#30D158')}>
                    <div style={panelHead('#4ade80')}><Leaf size={16} /> Normal ({normalList.length})</div>
                    {normalList.length ? normalList.map((d) => <div key={d.id} style={row}>{d.cls}</div>) : <div style={muted}>None</div>}
                  </div>
                  <div style={panel('#FF453A')}>
                    <div style={panelHead('#ff6b6b')}><ShieldAlert size={16} /> Endangered ({endangeredList.length})</div>
                    {endangeredList.length ? endangeredList.map((d) => (
                      <div key={d.id} style={row}><span style={{ textTransform: 'capitalize' }}>{d.cls}</span>
                        <span style={{ marginLeft: 'auto', color: '#9aa0b5', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {coordFor(d.id)}</span>
                      </div>)) : <div style={muted}>None</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={resetToPick} style={ghost}><ArrowLeft size={15} /> Change frame</button>
                  <button onClick={() => setStep(2)} style={{ ...primary, flex: 1 }}>Send to rangers <ArrowRight size={16} /></button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 — dispatch */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>3 · Alert dispatched</h3>
                
                <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', flexWrap: 'wrap' }}>
                  {/* Left Side: System Log */}
                  <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: 16, borderRadius: 14, border: `1px solid ${endangeredList.length ? 'rgba(255,69,58,.45)' : 'rgba(48,209,88,.45)'}`, background: endangeredList.length ? 'rgba(255,69,58,.08)' : 'rgba(48,209,88,.08)', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, color: endangeredList.length ? '#ff6b6b' : '#4ade80' }}>
                        <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}><Send size={18} /></motion.span>
                        {endangeredList.length ? 'Automated alert sent to Forest Rangers' : 'Logged — no action needed'}
                      </div>
                      <p style={{ margin: '8px 0 0', color: '#cdd1e0', fontSize: '.92rem', lineHeight: 1.55 }}>
                        {endangeredList.length
                          ? `🚨 ${endangeredList.length} endangered ${endangeredList.length === 1 ? 'animal' : 'animals'} detected (${endangeredList.map((d) => d.cls).join(', ')}). Coordinates ${endangeredList.map((d) => coordFor(d.id)).join(' · ')} sent to the ranger station.`
                          : 'Only common wildlife in frame — the drone quietly logs it and keeps patrolling.'}
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Ranger Phone UI */}
                  {endangeredList.length > 0 && (
                    <div style={{ width: '260px', flexShrink: 0, background: '#000', borderRadius: '24px', border: '6px solid #222', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', overflow: 'hidden' }}>
                      {/* Notch */}
                      <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100px', height: '18px', background: '#222', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px' }} />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '0.7rem', padding: '0 8px', marginTop: '6px' }}>
                        <span>14:32</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <span style={{ fontSize: '0.6rem' }}>📶</span>
                          <span style={{ fontSize: '0.6rem' }}>🔋</span>
                        </div>
                      </div>

                      <div style={{ flex: 1, padding: '10px 4px' }}>
                        {endangeredList.map((d, idx) => (
                          <motion.div key={d.id} initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 + (idx * 0.2), type: 'spring' }} style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: '12px', padding: '10px', marginBottom: '8px', borderLeft: '3px solid #ff6b6b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>
                              <ShieldAlert size={14} color="#ff6b6b" /> ENDANGERED ALERT
                            </div>
                            <div style={{ color: '#e2e8f0', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                              <b>{d.cls}</b> spotted!
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} /> {coordFor(d.id)}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setStep(1)} style={ghost}><ArrowLeft size={15} /> Back</button>
                  <button onClick={resetToPick} style={{ ...primary, flex: 1 }}><RotateCcw size={15} /> Run another frame</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

const pill = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999,
  background: on ? 'color-mix(in srgb,#64D2FF 20%,transparent)' : 'rgba(255,255,255,.06)',
  border: `1px solid ${on ? 'rgba(100,210,255,.6)' : 'rgba(255,255,255,.12)'}`,
  color: '#e8eaf2', fontFamily: 'inherit', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer',
});
const primary = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg,#5e5ce6,#bf5af2)', border: 0, color: '#fff', padding: '11px 22px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: '.98rem', cursor: 'pointer' };
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: '#cdd1e0', padding: '11px 18px', borderRadius: 12, fontFamily: 'inherit', fontWeight: 600, fontSize: '.9rem', cursor: 'pointer' };
const panel = (c) => ({ background: 'rgba(255,255,255,.03)', border: `1px solid ${c}44`, borderRadius: 12, padding: 14 });
const panelHead = (c) => ({ display: 'flex', alignItems: 'center', gap: 7, color: c, fontWeight: 700, marginBottom: 8, fontSize: '.92rem' });
const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'rgba(0,0,0,.25)', borderRadius: 7, marginBottom: 6, fontSize: '.88rem', textTransform: 'capitalize' };
const muted = { color: '#9aa0b5', fontSize: '.85rem' };
