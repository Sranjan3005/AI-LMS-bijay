import { useRef, useState } from 'react';

/** Shared presentational pieces. No ML, no flow state -- safe to port as-is. */

export const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

export function PredictionBars({ predictions = [], max = 5 }) {
  if (!predictions.length) return null;
  const top = predictions[0];
  return (
    <div className="pred">
      {predictions.slice(0, max).map((p, i) => (
        <div className={`pred-row${p === top ? ' top' : ''}`} key={`${p.label}-${i}`}>
          <div className="pred-label">{p.label}</div>
          <div className="pred-track">
            <div className="pred-fill" style={{ width: `${Math.max(1, p.score * 100)}%` }} />
          </div>
          <div className="pred-pct">{pct(p.score)}</div>
        </div>
      ))}
    </div>
  );
}

export function Stat({ k, v, tone = '' }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

export const StatRow = ({ children }) => <div className="stat-row">{children}</div>;

export function Progress({ value, label }) {
  return (
    <>
      {label && <div className="small muted">{label}</div>}
      <div className="progress"><div style={{ width: `${Math.round(value * 100)}%` }} /></div>
    </>
  );
}

/**
 * Drop or pick one image.
 * Everything stays in the tab -- there is no upload anywhere in this module,
 * and the copy says so because that is a real property worth pointing at.
 */
// Set by DataLibraryDock when a test photo is dragged out of the drawer.
export const LIBRARY_IMAGE_TYPE = 'application/finetune-image';

export function ImageDrop({ image, onImage, hint = 'Drop a photo here, or click to pick one' }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);

  const handleFile = (file) => {
    if (!file || !/^image\//.test(file.type)) return;
    const img = new Image();
    img.onload = () => onImage(img, file.name);
    img.src = URL.createObjectURL(file);
  };

  return (
    <div
      className={`drop${over ? ' over' : ''}${image ? ' filled' : ''}`}
      onClick={() => !image && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        // Two kinds of drop land here: a file from the desktop, and a test photo
        // dragged out of the Data Library (which arrives as a URL, not a File).
        const url = e.dataTransfer.getData(LIBRARY_IMAGE_TYPE);
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => onImage(img, url.split('/').pop());
          img.src = url;
          return;
        }
        handleFile(e.dataTransfer.files?.[0]);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' && !image) inputRef.current?.click(); }}
    >
      {image ? (
        <>
          <img src={image.src} alt="the photo being tested" />
          <div className="btn-row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <button type="button" className="btn ghost" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
              Use a different photo
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>🖼</div>
          <div>{hint}</div>
          <div className="small muted" style={{ marginTop: 6 }}>
            It stays on your machine. Nothing here is uploaded.
          </div>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}

/** Measured loss curve as an inline SVG. Points come from the trainer. */
export function LossCurve({ curve = [], total }) {
  if (!curve.length) {
    return <div className="curve" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '.85rem' }}>Waiting for the first epoch…</div>;
  }
  const W = 600;
  const H = 150;
  const pad = 24;
  const maxLoss = Math.max(...curve.map((p) => p.loss), 0.0001);
  const n = Math.max(total || curve.length, 2);

  const pointsFor = (get, scale) => curve
    .map((p, i) => {
      const x = pad + (i / (n - 1)) * (W - pad * 2);
      const y = H - pad - get(p) * scale * (H - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg className="curve" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="training loss curve">
      <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(255,255,255,.15)" />
      <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(255,255,255,.15)" />
      <polyline fill="none" stroke="#30d158" strokeWidth="2" points={pointsFor((p) => p.accuracy, 1)} />
      <polyline fill="none" stroke="#ff9f0a" strokeWidth="2" points={pointsFor((p) => p.loss / maxLoss, 1)} />
      <text x={W - pad} y={pad - 8} fill="#ff9f0a" fontSize="11" textAnchor="end">loss</text>
      <text x={W - pad - 40} y={pad - 8} fill="#30d158" fontSize="11" textAnchor="end">accuracy</text>
    </svg>
  );
}

/** N x M table of accuracies, with a spread column. Generalised from TrainingReport. */
export function MatrixTable({ rows, columns, valueAt, rowLabel, showSpread = true }) {
  return (
    <div className="scroll-x">
      <table className="matrix">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Trained on ↓ · Tested on →</th>
            {columns.map((c) => <th key={c}>{c}</th>)}
            {showSpread && <th>Spread</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const values = columns.map((c) => valueAt(r, c)).filter((v) => v != null);
            const spread = values.length > 1 ? Math.max(...values) - Math.min(...values) : null;
            return (
              <tr key={rowLabel(r)}>
                <td className="rowhead">{rowLabel(r)}</td>
                {columns.map((c) => {
                  const v = valueAt(r, c);
                  return (
                    <td key={c} style={{ color: v == null ? 'var(--muted)' : tone(v) }}>
                      {v == null ? '—' : pct(v)}
                    </td>
                  );
                })}
                {showSpread && (
                  <td style={{ color: spread == null ? 'var(--muted)' : tone(1 - spread) }}>
                    {spread == null ? '—' : `${Math.round(spread * 100)} pts`}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function tone(v) {
  if (v >= 0.8) return 'var(--good)';
  if (v >= 0.5) return 'var(--warn)';
  return 'var(--bad)';
}

/** The bottom of a step: what unlocks the next one, and the button. */
export function Gate({ hint, ready, onNext, label = 'Next' }) {
  return (
    <div className="gate">
      <div className="gate-hint">{ready ? 'Done — you can move on.' : hint}</div>
      <button type="button" className="btn primary" disabled={!ready} onClick={onNext}>
        {label} →
      </button>
    </div>
  );
}
