import { useState } from 'react';
import { Info } from 'lucide-react';
import { nodeInfoFor } from './nodeInfo';

/**
 * NodeInfo — the ⓘ button that sits at the right of a node's header and reveals
 * what the node does on hover. `nodrag` so hovering/clicking never drags the
 * node around the canvas.
 */
export default function NodeInfo({ type }) {
  const [open, setOpen] = useState(false);
  const text = nodeInfoFor(type);
  if (!text) return null;

  return (
    <span
      className="nodrag"
      style={{ position: 'relative', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <Info size={14} style={{ color: 'var(--text-secondary)', cursor: 'help', opacity: 0.8 }} />
      {open && (
        <div
          style={{
            position: 'absolute', top: '150%', right: 0, zIndex: 50, width: 220,
            background: 'rgba(10,12,20,.98)', border: '1px solid var(--glass-border)',
            borderRadius: 8, padding: '10px 12px', fontSize: '0.72rem', lineHeight: 1.5,
            color: 'var(--text-secondary)', fontWeight: 400, whiteSpace: 'normal',
            boxShadow: '0 8px 24px rgba(0,0,0,.55)', textAlign: 'left',
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
}
