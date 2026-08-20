import React, { useState, useEffect } from 'react';
import { previewTiles } from '../../lib/cv/digitData';
import { loadManifest } from '../../lib/datasets';

const SOURCES = {
  'The Digit Detective': {
    clean: { kind: 'sprite', variant: 'clean' },
    messy: { kind: 'sprite', variant: 'messy' },
    noisy: { kind: 'sprite', variant: 'noisy' },
  },
  'The Handwriting Decoder': {
    normal: { kind: 'folder', folder: 'handwriting/clean' },
    cursive: { kind: 'folder', folder: 'handwriting/messy' },
  },
  'The Edge Explorer': {
    shapes: { kind: 'folder', folder: 'edge/shapes' },
    complex: { kind: 'folder', folder: 'edge/complex' },
    gradient: { kind: 'folder', folder: 'edge/gradient' },
  },
};

export default function CVPresetTests({ scenario, selectedVariant, onTestPreset, disabled }) {
  const [presets, setPresets] = useState({});

  useEffect(() => {
    let alive = true;
    const title = scenario?.title;
    if (!title) return;

    const loadPresets = async () => {
      const newPresets = {};
      for (const variant of scenario.variants || []) {
        const source = SOURCES[title]?.[variant.name];
        if (!source) continue;

        try {
          if (source.kind === 'sprite') {
            const [tile] = await previewTiles(source.variant, 1, 8);
            if (tile && alive) newPresets[variant.name] = tile.url;
          } else {
            const manifest = await loadManifest();
            const files = manifest[source.folder] || [];
            if (files.length > 0 && alive) {
              newPresets[variant.name] = `/datasets/${files[0]}`;
            }
          }
        } catch (e) {
          console.error("Failed to load preset for", variant.name, e);
        }
      }
      if (alive) setPresets(newPresets);
    };

    loadPresets();
    return () => { alive = false; };
  }, [scenario]);

  if (!scenario?.variants || scenario.variants.length < 2) return null;

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', marginTop: 'auto' }}>
      <p style={{ margin: '0 0 8px', color: '#fff', fontSize: '0.8rem', textAlign: 'center', fontWeight: 600 }}>
        Test Model on Other Datasets:
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scenario.variants.length}, 1fr)`, gap: '8px' }}>
        {scenario.variants.map(v => {
          const imgUrl = presets[v.name];
          const isTrained = v.name === selectedVariant;
          
          return (
            <button
              key={v.name}
              onClick={() => imgUrl && onTestPreset(v.name, imgUrl)}
              disabled={disabled || !imgUrl}
              title={`Test a sample from ${v.label}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: '6px', borderRadius: '8px', cursor: (disabled || !imgUrl) ? 'not-allowed' : 'pointer',
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                transition: 'all 0.2s', opacity: (disabled || !imgUrl) ? 0.5 : 1,
              }}
            >
              {imgUrl ? (
                <img 
                  src={imgUrl} 
                  alt={v.label} 
                  style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#000', borderRadius: '4px', imageRendering: 'pixelated' }} 
                />
              ) : (
                <div style={{ width: '40px', height: '40px', background: '#222', borderRadius: '4px' }} />
              )}
              <span style={{ fontSize: '0.65rem', color: isTrained ? 'var(--accent-green)' : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.1 }}>
                {v.label} {isTrained ? '(Trained)' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
