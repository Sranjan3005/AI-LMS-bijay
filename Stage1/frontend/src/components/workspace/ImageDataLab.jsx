import React, { useState } from 'react';
import { ImagePlus, Save, CheckCircle, AlertTriangle, ArrowRight, X } from 'lucide-react';
import api from '../../api';
import { ImageInsights } from './DataInsights';

/**
 * ImageDataLab — "collect your own data" for computer-vision / neural scenarios.
 * Instead of one upload button, students fill 5 labelled cards that each ask for
 * a DIFFERENT-looking sample — teaching that vision models need variety.
 */
const SLOT_DEFS = [
  { key: 'clean',  label: 'A clear, clean one',  hint: 'Neat and easy to read — the obvious case.' },
  { key: 'messy',  label: 'A messy / rushed one', hint: 'Sloppy and quick, like real handwriting.' },
  { key: 'small',  label: 'A tiny one',           hint: 'Small or cramped in the frame.' },
  { key: 'tilted', label: 'A tilted / rotated one', hint: 'Turned at an angle, not upright.' },
  { key: 'other',  label: 'A different style',    hint: 'Someone else’s hand, or a whole new look.' },
];

const ImageDataLab = ({ scenario, onOpenDemonstration }) => {
  const [slots, setSlots] = useState(SLOT_DEFS.map(d => ({ ...d, file: null, url: null })));
  const [variantName, setVariantName] = useState(`My ${scenario.title} images`);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const pick = (key, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file (PNG or JPG).'); return; }
    if (file.size > 5 * 1024 * 1024) { setError(`${file.name} is over 5MB — pick a smaller image.`); return; }
    setError(null); setSuccess(false);
    setSlots(sl => sl.map(s => (s.key === key ? { ...s, file, url: URL.createObjectURL(file) } : s)));
  };
  const clearSlot = (key) => setSlots(sl => sl.map(s => (s.key === key ? { ...s, file: null, url: null } : s)));

  const filled = slots.filter(s => s.file);

  const save = async () => {
    if (filled.length < 2) { setError('Add at least 2 different samples before saving.'); return; }
    setSaving(true); setError(null); setSuccess(false);
    const fd = new FormData();
    filled.forEach(s => fd.append('file', s.file));
    fd.append('scenario_id', scenario.id);
    fd.append('label', variantName || `My ${scenario.title} images`);
    try {
      await api.post('/scenarios/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
      {/* LEFT — the sample cards */}
      <div style={{ background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <ImagePlus size={20} color="var(--accent-cyan)" /> Collect varied samples
        </h3>
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.5 }}>
          Fill each card with a <b>different-looking</b> version of the same thing. Variety is the secret to a vision model that doesn&apos;t get fooled.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
          {slots.map(s => (
            <label key={s.key} style={{ position: 'relative', display: 'flex', flexDirection: 'column', cursor: 'pointer', background: 'rgba(0,0,0,0.25)', border: `1px dashed ${s.file ? 'rgba(48,209,88,.5)' : 'var(--glass-border)'}`, borderRadius: 12, overflow: 'hidden', minHeight: 170 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 110, background: s.url ? '#000' : 'transparent' }}>
                {s.url
                  ? <img src={s.url} alt={s.label} style={{ maxWidth: '100%', maxHeight: 110, objectFit: 'contain' }} />
                  : <ImagePlus size={30} color="var(--text-secondary)" />}
              </div>
              <div style={{ padding: '8px 10px', borderTop: '1px solid var(--glass-border)' }}>
                <div style={{ fontSize: '.82rem', fontWeight: 700, color: s.file ? '#4ade80' : '#fff' }}>{s.label}</div>
                <div style={{ fontSize: '.7rem', color: 'var(--text-secondary)', lineHeight: 1.35, marginTop: 2 }}>{s.hint}</div>
              </div>
              <input type="file" accept="image/*" onChange={(e) => pick(s.key, e.target.files?.[0])} style={{ display: 'none' }} />
              {s.file && (
                <button onClick={(e) => { e.preventDefault(); clearSlot(s.key); }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: 4, display: 'flex' }}>
                  <X size={14} />
                </button>
              )}
            </label>
          ))}
        </div>

        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Name this dataset…"
            style={{ flex: '1 1 200px', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
          <button className="btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? 'Saving…' : <><Save size={16} /> Save {filled.length} sample{filled.length === 1 ? '' : 's'}</>}
          </button>
        </div>

        {error && <div style={{ color: 'var(--accent-red)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem' }}><AlertTriangle size={16} /> {error}</div>}
        {success && (
          <div style={{ marginTop: 16, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', padding: 16, borderRadius: 10, color: 'var(--accent-green)' }}>
            <h4 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} /> Samples saved!</h4>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.5 }}>
              Your samples are saved. Jump straight into the {scenario.title} demonstration and see how the AI handles them.
            </p>
            <button className="btn-primary" onClick={() => onOpenDemonstration?.(scenario)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Try it in the Demonstration <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — live inference */}
      <ImageInsights slots={slots} scenarioTitle={scenario.title} />
    </div>
  );
};

export default ImageDataLab;
