import React, { useState, useEffect } from 'react';
import { UploadCloud, Save, Plus, Trash2, CheckCircle, AlertTriangle, Table2, ArrowRight } from 'lucide-react';
import api from '../../api';
import { TabularInsights } from './DataInsights';
import ScenarioImageShowcase, { hasImageShowcase } from './ScenarioImageShowcase';
import PhotoTrainingLab, { hasPhotoTraining } from './PhotoTrainingLab';

/**
 * TabularDataLab — "collect your own data" for any regression/classification
 * scenario. The columns are the scenario's REAL columns (pulled from the preview
 * endpoint), so every scenario gets a tailored editable table + CSV upload —
 * the Social-Media flow generalised to any dataset. Live inference on the side.
 */
const emptyRow = (cols) => Object.fromEntries(cols.map(c => [c, '']));

const TabularDataLab = ({ scenario, onOpenDemonstration }) => {
  // Photo-teachable scenarios default to the real (client-side) photo trainer;
  // the numeric table stays available as the "measured features" view.
  const canPhoto = hasPhotoTraining(scenario.title);
  const [mode, setMode] = useState(canPhoto ? 'photos' : 'numbers');
  const [columns, setColumns] = useState(null);
  const [loadErr, setLoadErr] = useState(null);
  const [rows, setRows] = useState([]);
  const [variantName, setVariantName] = useState(`My ${scenario.title} data`);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const isClf = scenario.model_type === 'CLASSIFICATION';

  useEffect(() => {
    const load = async () => {
      try {
        const builtIn = (scenario.variants || []).find(v => !v.is_custom) || scenario.variants?.[0];
        if (!builtIn) throw new Error('no variant');
        const res = await api.get(`/${scenario.model_type.toLowerCase()}/preview/`, {
          params: { scenario_id: scenario.id, variant_name: builtIn.name },
        });
        const cols = res.data.columns || [];
        setColumns(cols);
        setRows([emptyRow(cols), emptyRow(cols), emptyRow(cols), emptyRow(cols)]);
      } catch (err) {
        console.error('Failed to load columns', err);
        setLoadErr('Could not load this scenario’s data format. Please try again.');
      }
    };
    load();
  }, [scenario]);

  const featureCols = columns ? columns.slice(0, -1) : [];
  const target = columns ? columns[columns.length - 1] : '';

  const setCell = (i, col, val) => {
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, [col]: val } : r)));
    setSuccess(false);
  };
  const addRow = () => setRows(rs => [...rs, emptyRow(columns)]);
  const removeRow = (i) => setRows(rs => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs));

  const validRows = rows.filter(r => columns?.every(c => String(r[c]).trim() !== ''));

  const handleCsv = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = String(ev.target.result).split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { setError('That CSV has no data rows.'); return; }
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const idxFor = columns.map(c => {
        const hit = header.indexOf(c.toLowerCase());
        return hit; // -1 → fall back to positional
      });
      const parsed = lines.slice(1).map(line => {
        const cells = line.split(',').map(c => c.trim());
        const obj = {};
        columns.forEach((c, ci) => {
          const src = idxFor[ci] >= 0 ? idxFor[ci] : ci;
          obj[c] = cells[src] ?? '';
        });
        return obj;
      }).filter(o => columns.some(c => o[c] !== ''));
      if (!parsed.length) { setError('Could not read rows from that CSV.'); return; }
      setRows(parsed);
      setError(null);
      setSuccess(false);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const save = async () => {
    if (validRows.length < 3) { setError('Fill at least 3 complete rows before saving.'); return; }
    setSaving(true); setError(null); setSuccess(false);
    const data = validRows.map(r => {
      const o = {};
      featureCols.forEach(c => { o[c] = Number(r[c]); });
      o[target] = isClf ? String(r[target]) : Number(r[target]);
      return o;
    });
    try {
      await api.post('/scenarios/upload-json/', {
        scenario_id: scenario.id,
        name: `custom_${Date.now()}`,
        label: variantName || `My ${scenario.title} data`,
        data,
      });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  if (loadErr) {
    return <div style={{ color: 'var(--accent-red)', textAlign: 'center', padding: 40 }}>{loadErr}</div>;
  }
  if (!columns) {
    return <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: 40 }}>Loading the data format…</div>;
  }

  const gridCols = `44px ${columns.map(() => '1fr').join(' ')} 40px`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
      {/* Real sample images for image-flavoured scenarios (renders nothing otherwise) */}
      <ScenarioImageShowcase scenario={scenario} />

      {/* Photo-teachable scenarios: choose how you want to teach it */}
      {canPhoto && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '.85rem' }}>How do you want to teach it?</span>
          <button onClick={() => setMode('photos')} style={modeBtn(mode === 'photos')}>📷 Teach with real photos</button>
          <button onClick={() => setMode('numbers')} style={modeBtn(mode === 'numbers')}>🔢 Enter measured features</button>
        </div>
      )}

      {canPhoto && mode === 'photos' && (
        <div style={{ gridColumn: '1 / -1' }}>
          <PhotoTrainingLab key={scenario.title} scenario={scenario} />
        </div>
      )}

      {mode === 'numbers' && (
      <>
      {/* LEFT — the table */}
      <div style={{ background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Table2 size={20} color="var(--accent-cyan)" /> Enter your data
        </h3>
        <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.5 }}>
          One row per example. The last column, <b style={{ color: '#FFCC00' }}>{target}</b>, is what the AI will learn to predict.
        </p>

        {hasImageShowcase(scenario.title) && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'rgba(0,240,255,0.06)', border: '1px solid rgba(0,240,255,0.28)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🔬</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.55 }}>
              This view trains on the <b style={{ color: '#fff' }}>features measured from each photo</b> ({columns.slice(0, -1).join(', ')}) — enter the numbers below, or upload a CSV.
              {canPhoto && <> Want to skip the numbers? <b style={{ color: '#4ade80' }}>Switch to “📷 Teach with real photos”</b> above and train it on actual pictures instead.</>}
            </span>
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 120 * columns.length + 84 }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, marginBottom: 8, padding: '0 4px' }}>
              <div />
              {columns.map((c, ci) => (
                <div key={c} style={{ fontSize: '.8rem', fontWeight: 700, color: ci === columns.length - 1 ? '#FFCC00' : 'var(--accent-cyan)', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c}{ci === columns.length - 1 ? ' 🎯' : ''}
                </div>
              ))}
              <div />
            </div>
            {/* rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: 8 }}>
                  <div style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '.85rem' }}>{i + 1}</div>
                  {columns.map((c, ci) => (
                    <input
                      key={c}
                      type={ci === columns.length - 1 && isClf ? 'text' : 'number'}
                      value={row[c]}
                      onChange={(e) => setCell(i, c, e.target.value)}
                      placeholder={ci === columns.length - 1 && isClf ? 'label' : '0'}
                      style={{ width: '100%', minWidth: 0, padding: '8px 10px', borderRadius: 6, border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '.9rem' }}
                    />
                  ))}
                  <button onClick={() => removeRow(i)} disabled={rows.length <= 1}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: rows.length > 1 ? 'pointer' : 'default', opacity: rows.length > 1 ? 1 : 0.3, display: 'flex', justifyContent: 'center' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={addRow} style={{ flex: '1 1 160px', padding: '10px', background: 'rgba(255,255,255,0.06)', color: 'white', border: '1px solid var(--glass-border)', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={16} /> Add row
          </button>
          <label style={{ flex: '1 1 160px', padding: '10px', background: 'rgba(0,240,255,0.1)', color: 'var(--accent-cyan)', border: '1px solid rgba(0,240,255,0.3)', borderRadius: 8, cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <UploadCloud size={16} /> Upload CSV
            <input type="file" accept=".csv" onChange={handleCsv} style={{ display: 'none' }} />
          </label>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '.78rem', marginTop: 8 }}>
          CSV columns: <code style={{ color: '#fff' }}>{columns.join(', ')}</code>
        </p>

        {/* save */}
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="Name this dataset…"
            style={{ flex: '1 1 200px', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
          <button className="btn-primary" onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {saving ? 'Saving…' : <><Save size={16} /> Save dataset</>}
          </button>
        </div>

        {error && <div style={{ color: 'var(--accent-red)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, fontSize: '.9rem' }}><AlertTriangle size={16} /> {error}</div>}
        {success && (
          <div style={{ marginTop: 16, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', padding: 16, borderRadius: 10, color: 'var(--accent-green)' }}>
            <h4 style={{ margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={18} /> Dataset saved!</h4>
            <p style={{ margin: '0 0 14px', color: 'var(--text-secondary)', fontSize: '.9rem', lineHeight: 1.5 }}>
              Your dataset <b>&ldquo;{variantName}&rdquo;</b> is ready. Jump straight into the {scenario.title} demonstration and train a model on it.
            </p>
            <button className="btn-primary" onClick={() => onOpenDemonstration?.(scenario)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              Train on it in the Demonstration <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* RIGHT — live inference */}
      <TabularInsights rows={rows} columns={columns} modelType={scenario.model_type} scenarioTitle={scenario.title} />
      </>
      )}
    </div>
  );
};

const modeBtn = (on) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 999,
  background: on ? 'rgba(48,209,88,.16)' : 'rgba(255,255,255,.05)',
  border: `1px solid ${on ? 'rgba(48,209,88,.55)' : 'var(--glass-border)'}`,
  color: on ? '#4ade80' : 'var(--text-secondary)',
  fontFamily: 'inherit', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer',
});

export default TabularDataLab;
