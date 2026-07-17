import React, { useEffect, useState } from 'react';
import { previewImages } from '../../lib/datasets';

/**
 * ScenarioPreviewStrip — a small row of REAL dataset thumbnails shown on a
 * scenario card, so students see the actual images a module works with before
 * they open it. Renders nothing for scenarios without bundled images.
 */
export default function ScenarioPreviewStrip({ title, max = 4, accent = '#64D2FF' }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    let alive = true;
    previewImages(title, max).then((u) => { if (alive) setUrls(u); });
    return () => { alive = false; };
  }, [title, max]);

  if (!urls.length) return null;

  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 14 }} aria-hidden="true">
      {urls.map((u) => (
        <div key={u} style={{ flex: 1, aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accent}40`, background: '#0a0e1a' }}>
          <img src={`/datasets/${u}`} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ))}
    </div>
  );
}
