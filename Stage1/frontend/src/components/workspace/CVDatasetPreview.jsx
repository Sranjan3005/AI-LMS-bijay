import { useState, useEffect } from 'react';
import { AlertTriangle, Images, Sparkles } from 'lucide-react';
import { previewTiles, loadMeta } from '../../lib/cv/digitData';
import { loadManifest } from '../../lib/datasets';

/**
 * CVDatasetPreview — shows the ACTUAL images in the selected dataset.
 *
 * This replaces the old CVSampleGallery, which drew the same six font glyphs
 * with the same generic caption no matter which of clean/messy/noisy you picked.
 * Now:
 *   • Digit Detective previews tiles sliced straight out of the sprite the model
 *     is about to train on — so what you see IS the training data.
 *   • Handwriting Decoder previews the real photographed samples for that style.
 *   • Edge Explorer previews the real photos, and says plainly that edge
 *     detection has no training data at all.
 */

/* Scenario + variant → where its real images live. */
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

/* Per-variant caption. The whole point is that these differ. */
const CAPTIONS = {
  'The Digit Detective': {
    clean: 'Carefully written digits: solid strokes, upright, no specks. A model trained here becomes a specialist in tidy handwriting — brilliant on a form filled in slowly, lost on a scribbled one.',
    messy: 'The same digits written in a hurry — tilted, sheared, strokes too thick or too thin. Harder to learn from, but a model that survives this generalises far better.',
    noisy: 'Digits from a bad scan: blurred, washed out, speckled with sensor grain. Watch how much of the work has to happen in preprocessing before the model ever sees a stroke.',
  },
  'The Handwriting Decoder': {
    normal: 'Separated normal handwriting. OCR reads letters, not words, so it first has to CUT the writing into pieces — and normal writing gives it clean places to cut.',
    cursive: 'Joined-up cursive. Now there is nowhere to cut: letters flow into each other and segmentation has to guess. This is exactly why forms say "PLEASE WRITE IN BLOCK LETTERS".',
  },
  'The Edge Explorer': {
    shapes: 'Strong, simple outlines. Edge detection is pure arithmetic — a Sobel filter measuring how fast brightness changes — so it needs no training data whatsoever.',
    complex: 'Busy scenes with many overlapping boundaries. The same filter runs, but now it fires everywhere, and telling a useful edge from clutter becomes the hard part.',
    gradient: 'Smooth, gradual transitions. Because a Sobel filter responds to sudden brightness change, gentle gradients barely register — the filter is nearly blind to them.',
  },
};

function Panel({ children }) {
  return (
    <div style={{ width: '100%' }}>{children}</div>
  );
}

function Missing({ scenarioTitle }) {
  return (
    <div style={{
      padding: '20px 22px', borderRadius: 14, background: 'rgba(255,159,10,.07)',
      border: '1px solid rgba(255,159,10,.35)', color: '#ffcf70',
      fontSize: '.95rem', lineHeight: 1.65,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 700, marginBottom: 6 }}>
        <AlertTriangle size={18} /> This dataset isn’t installed yet
      </div>
      <span style={{ color: '#e8d3ae' }}>
        {scenarioTitle} needs its image files under <code>public/datasets/</code>. See{' '}
        <code>public/datasets/DATASETS_TO_ADD.md</code> for exactly where to download them —
        the real previews and real training turn on automatically once the files are there.
      </span>
    </div>
  );
}

export default function CVDatasetPreview({ scenario, variant, mini = false }) {
  const title = scenario?.title;
  const source = SOURCES[title]?.[variant];
  const caption = CAPTIONS[title]?.[variant];
  const key = `${title}::${variant}`;

  // Loaded results are stored WITH the key they belong to, so switching dataset
  // shows the loader immediately without a synchronous setState in the effect
  // (which would cost an extra render pass on every switch).
  const [loaded, setLoaded] = useState({ key: null, tiles: [], derived: false });

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!source) {
        if (alive) setLoaded({ key, tiles: [], derived: false });
        return;
      }
      if (source.kind === 'sprite') {
        const [preview, meta] = await Promise.all([
          previewTiles(source.variant, mini ? 4 : 8),
          loadMeta(),
        ]);
        if (!alive) return;
        setLoaded({ key, tiles: preview, derived: meta?.[source.variant]?.source === 'derived' });
      } else {
        const manifest = await loadManifest();
        if (!alive) return;
        setLoaded({
          key,
          tiles: (manifest[source.folder] || []).slice(0, mini ? 4 : undefined).map((rel) => ({ url: `/datasets/${rel}` })),
          derived: false,
        });
      }
    })();

    return () => { alive = false; };
  }, [key, source, mini]);

  const tiles = loaded.key === key ? loaded.tiles : null;
  const derived = loaded.key === key && loaded.derived;

  if (tiles === null) {
    if (mini) return <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>;
    return (
      <Panel>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
          Loading the dataset…
        </p>
      </Panel>
    );
  }

  if (!tiles.length) {
    if (mini) return <div style={{ color: 'var(--text-secondary)' }}>No preview available</div>;
    return <Panel><Missing scenarioTitle={title} /></Panel>;
  }

  const isSprite = source.kind === 'sprite';

  if (mini) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', width: '100%', height: '100%' }}>
        {tiles.map((t, i) => (
          <div key={t.url + i} style={{ overflow: 'hidden', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: '#000', aspectRatio: '1/1' }}>
            <img src={t.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: isSprite ? 'contain' : 'cover', imageRendering: isSprite ? 'pixelated' : 'auto' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Panel>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
        color: 'var(--accent-cyan)', fontWeight: 700, fontSize: '.95rem',
      }}>
        <Images size={17} />
        {tiles.length} real samples from this dataset
        {isSprite && (
          <span style={{
            marginLeft: 'auto', fontSize: '.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999,
            background: 'rgba(48,209,88,.12)', border: '1px solid rgba(48,209,88,.4)', color: '#4ade80',
          }}>
            <Sparkles size={11} style={{ verticalAlign: -1 }} /> the exact images the model trains on
          </span>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${isSprite ? 96 : 150}px, 1fr))`,
        gap: 12,
      }}>
        {tiles.map((t, i) => (
          <div key={t.url + i} style={{ textAlign: 'center' }}>
            <img
              src={t.url}
              alt=""
              loading="lazy"
              style={{
                width: '100%', aspectRatio: '1 / 1', objectFit: isSprite ? 'contain' : 'cover',
                display: 'block', borderRadius: 10, background: '#000',
                border: '1px solid rgba(255,255,255,.12)',
                imageRendering: isSprite ? 'pixelated' : 'auto',
              }}
            />
            {t.label !== undefined && (
              <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)', marginTop: 5 }}>
                labelled “{t.label}”
              </div>
            )}
          </div>
        ))}
      </div>

      {caption && (
        <p style={{
          color: 'var(--text-secondary)', fontSize: '.98rem', lineHeight: 1.65,
          textAlign: 'center', maxWidth: 680, margin: '18px auto 0',
        }}>
          {caption}
        </p>
      )}

      {derived && (
        <p style={{
          color: '#ffcf70', fontSize: '.82rem', lineHeight: 1.6, textAlign: 'center',
          maxWidth: 680, margin: '10px auto 0',
        }}>
          These were produced by applying real augmentation (rotation, shear, stroke weight, noise)
          to the clean set, rather than collected separately — so they are honestly labelled as derived.
        </p>
      )}
    </Panel>
  );
}
