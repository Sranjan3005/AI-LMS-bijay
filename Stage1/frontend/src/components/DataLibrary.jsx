import { useState, useEffect, useMemo, useContext } from 'react';
import { createPortal } from 'react-dom';
import { Database, X, Search, GripVertical, Copy, Check, ChevronLeft, FileText, Image as ImageIcon } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import {
  DATASETS, CATEGORIES, DATASET_DRAG_TYPE,
  assetUrl, imagesFor, dragPayload,
} from '../lib/dataLibrary';

/**
 * DataLibrary — a floating, always-available drawer of ready-made datasets.
 *
 * Mounted once at the top of the app (App.jsx) so it is reachable from the
 * homepage, any lesson, and the agentic canvas alike. On the canvas the items
 * are draggable and become pre-filled nodes; everywhere else the detail view
 * still lets a student read and copy the data.
 */

const CAT_ICON = {
  'Classroom & school': '🏫',
  'Business records': '🧾',
  'News & text': '📰',
  'Computer vision': '👁️',
};

function DragHint() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', marginBottom: 12,
      borderRadius: 10, background: 'rgba(94,92,230,.12)', border: '1px solid rgba(94,92,230,.35)',
      color: '#c7c5ff', fontSize: '.8rem', lineHeight: 1.5,
    }}>
      <GripVertical size={15} style={{ flexShrink: 0 }} />
      Drag any dataset onto the Agentic canvas — it drops in as a ready-filled node.
    </div>
  );
}

function Thumb({ rel, onDragStart, draggable }) {
  return (
    <img
      src={assetUrl(rel)}
      alt=""
      loading="lazy"
      draggable={draggable}
      onDragStart={onDragStart}
      style={{
        width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block',
        borderRadius: 8, border: '1px solid rgba(255,255,255,.12)', background: '#0a0e1a',
        cursor: draggable ? 'grab' : 'default',
      }}
    />
  );
}

/* ── Detail view: preview the actual data + its facts ─────────────────────── */

function DatasetDetail({ dataset, onBack, onClose }) {
  const [images, setImages] = useState([]);
  const [copied, setCopied] = useState(false);
  const isText = dataset.kind === 'text';

  useEffect(() => {
    let alive = true;
    imagesFor(dataset).then((list) => { if (alive) setImages(list); });
    return () => { alive = false; };
  }, [dataset]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(dataset.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — the text is on screen anyway */ }
  };

  const startDrag = (e, imageRel = null) => {
    e.dataTransfer.setData(DATASET_DRAG_TYPE, dragPayload(dataset, imageRel));
    e.dataTransfer.effectAllowed = 'copyMove';
    // Close the panel so the backdrop is removed and the canvas can receive the drop
    if (onClose) setTimeout(() => onClose(), 0);
  };

  return (
    <>
      <button onClick={onBack} style={{
        display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 0,
        color: 'var(--accent-cyan, #64D2FF)', cursor: 'pointer', fontSize: '.85rem',
        fontFamily: 'inherit', padding: 0, marginBottom: 12,
      }}>
        <ChevronLeft size={16} /> All datasets
      </button>

      <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', color: '#f2f3f8' }}>{dataset.name}</h3>
      <p style={{ margin: '0 0 12px', color: '#94a3b8', fontSize: '.86rem', lineHeight: 1.6 }}>{dataset.blurb}</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {dataset.facts?.map((f) => (
          <span key={f} style={{
            fontSize: '.7rem', padding: '3px 9px', borderRadius: 999,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.12)', color: '#cbd5e1',
          }}>{f}</span>
        ))}
      </div>

      <DragHint />

      {isText ? (
        <>
          <div
            draggable
            onDragStart={(e) => startDrag(e)}
            style={{
              position: 'relative', cursor: 'grab',
              background: '#05070f', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10,
              padding: 14, maxHeight: 320, overflow: 'auto',
            }}
          >
            <pre style={{
              margin: 0, fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              fontSize: '.76rem', lineHeight: 1.65, color: '#d7dbe8', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>{dataset.text}</pre>
          </div>
          <button onClick={copy} style={{
            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.14)',
            color: copied ? '#4ade80' : '#cbd5e1', borderRadius: 9, padding: '8px 14px',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '.82rem', fontWeight: 600,
          }}>
            {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy text</>}
          </button>
        </>
      ) : images.length ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(88px,1fr))', gap: 8 }}>
            {images.map((rel) => (
              <Thumb key={rel} rel={rel} draggable onDragStart={(e) => startDrag(e, rel)} />
            ))}
          </div>
          <p style={{ color: '#64748b', fontSize: '.76rem', marginTop: 10, lineHeight: 1.5 }}>
            {images.length} image{images.length === 1 ? '' : 's'} · drag one onto the canvas to load it into a Vision Scanner.
          </p>
        </>
      ) : (
        <div style={{
          padding: '18px 16px', borderRadius: 10, background: 'rgba(255,159,10,.08)',
          border: '1px solid rgba(255,159,10,.35)', color: '#ffcf70', fontSize: '.84rem', lineHeight: 1.6,
        }}>
          This image set isn’t installed yet. See <code>public/datasets/DATASETS_TO_ADD.md</code> for
          where to download it — it appears here automatically once the files are in place.
        </div>
      )}
    </>
  );
}

/* ── List view ───────────────────────────────────────────────────────────── */

function DatasetList({ query, setQuery, onOpen, onClose }) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATASETS;
    return DATASETS.filter((d) =>
      `${d.name} ${d.blurb} ${d.category} ${(d.facts || []).join(' ')}`.toLowerCase().includes(q));
  }, [query]);

  const startDrag = (e, dataset) => {
    e.dataTransfer.setData(DATASET_DRAG_TYPE, dragPayload(dataset));
    e.dataTransfer.effectAllowed = 'copyMove';
    // Close the panel so the backdrop is removed and the canvas can receive the drop
    if (onClose) setTimeout(() => onClose(), 0);
  };

  return (
    <>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search datasets…"
          style={{
            width: '100%', boxSizing: 'border-box', padding: '9px 12px 9px 34px', borderRadius: 10,
            background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.14)',
            color: '#e8eaf2', fontFamily: 'inherit', fontSize: '.86rem', outline: 'none',
          }}
        />
      </div>

      <DragHint />

      {CATEGORIES.map((cat) => {
        const items = filtered.filter((d) => d.category === cat);
        if (!items.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: '.7rem', textTransform: 'uppercase', letterSpacing: '.1em',
              color: '#64748b', fontWeight: 700, marginBottom: 9,
            }}>
              {CAT_ICON[cat]} {cat}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((d) => (
                <div
                  key={d.id}
                  draggable
                  onDragStart={(e) => startDrag(e, d)}
                  onClick={() => onOpen(d)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px',
                    borderRadius: 11, background: 'rgba(255,255,255,.035)',
                    border: '1px solid rgba(255,255,255,.09)', cursor: 'grab',
                    transition: 'background .15s, border-color .15s',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.07)';
                    e.currentTarget.style.borderColor = 'rgba(100,210,255,.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,.035)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)';
                  }}
                >
                  <div style={{ color: '#64748b', marginTop: 2, flexShrink: 0 }}>
                    {d.kind === 'text' ? <FileText size={15} /> : <ImageIcon size={15} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#e8eaf2', fontSize: '.88rem', fontWeight: 600 }}>{d.name}</div>
                    <div style={{
                      color: '#94a3b8', fontSize: '.77rem', lineHeight: 1.5, marginTop: 2,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{d.blurb}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {!filtered.length && (
        <p style={{ color: '#64748b', fontSize: '.85rem', textAlign: 'center', padding: '30px 0' }}>
          No dataset matches “{query}”.
        </p>
      )}
    </>
  );
}

/* ── Shell ───────────────────────────────────────────────────────────────── */

export default function DataLibrary() {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Student-facing only: no point offering practice datasets on the login
  // screen or inside the admin/school panels.
  if (!user || user.is_staff || user.role === 'school_admin') return null;

  // Rendered into <body> so no ancestor's transform/overflow can clip or
  // reposition it — this panel has to work on top of the React Flow canvas too.
  return createPortal(
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Data Library — ready-made datasets"
        aria-label="Open the Data Library"
        style={{
          position: 'fixed', left: 22, bottom: 22, zIndex: 3000,
          display: 'flex', alignItems: 'center', gap: 9, padding: '12px 18px',
          borderRadius: 999, border: '1px solid rgba(100,210,255,.4)', cursor: 'pointer',
          background: 'linear-gradient(135deg,#0a84ff,#5e5ce6)', color: '#fff',
          fontFamily: 'inherit', fontWeight: 700, fontSize: '.9rem',
          boxShadow: '0 10px 28px rgba(10,132,255,.38)',
        }}
      >
        <Database size={17} /> Data Library
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 2990, background: 'rgba(4,6,14,.55)', backdropFilter: 'blur(3px)' }}
        />
      )}

      <aside
        aria-hidden={!open}
        style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, width: 'min(400px, 92vw)', zIndex: 3001,
          background: 'rgba(13,16,27,.98)', borderRight: '1px solid rgba(255,255,255,.1)',
          boxShadow: '18px 0 50px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(-102%)',
          transition: 'transform .28s cubic-bezier(.4,0,.2,1)',
          visibility: open ? 'visible' : 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,.09)', flexShrink: 0,
        }}>
          <Database size={19} color="#64D2FF" />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#f2f3f8', fontWeight: 700, fontSize: '1.02rem' }}>Data Library</div>
            <div style={{ color: '#64748b', fontSize: '.75rem' }}>{DATASETS.length} ready-made datasets</div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close"
            style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', padding: 4 }}>
            <X size={19} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 28px' }}>
          {selected
            ? <DatasetDetail dataset={selected} onBack={() => setSelected(null)} onClose={() => setOpen(false)} />
            : <DatasetList query={query} setQuery={setQuery} onOpen={setSelected} onClose={() => setOpen(false)} />}
        </div>
      </aside>
    </>,
    document.body
  );
}
