import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Library, X, ArrowLeft, FolderOpen, ImageIcon, Check,
} from 'lucide-react';
import { installedCatalogue, datasetFromPack } from '../lib/ml/heads.js';
import { datasetFromFiles, checkUsable } from '../lib/ml/datasets.js';
import { useFlow } from '../lib/flowState.jsx';
import { RECOMMENDED } from '../lib/chiti/lesson.js';
import { Progress, LIBRARY_IMAGE_TYPE } from './ui.jsx';

/**
 * DataLibraryDock -- the always-available drawer, matching Stage1's pattern.
 *
 * A floating button pinned bottom-left, a slide-in panel, and everything
 * portalled to <body> so it sits above whatever the current step is doing.
 * Same shape as `Stage1/frontend/src/components/DataLibrary.jsx`, so porting
 * this back is a merge rather than a redesign.
 *
 * Two views: the list, and a per-dataset preview. The preview exists because
 * "choose a dataset" is a real decision and a row of names gives a student
 * nothing to decide with -- they need to see what is actually in it.
 *
 * **No accuracy is shown here.** The whole point of the next screen is that the
 * student watches the model learn and then finds out how it did; printing
 * "best 98%" on the card beforehand throws that away.
 */

export const DATASET_DRAG_TYPE = 'application/finetune-dataset';
export const IMAGE_DRAG_TYPE = 'application/finetune-image';

const prettyName = (id) => id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const BLURBS = {
  flowers: 'Twelve flowering plants, most of them common in Indian gardens. The '
    + 'generalist knows barely three flower names in total, so this is where it '
    + 'runs out of vocabulary fastest.',
  butterflies: 'Twelve butterflies photographed in the wild by naturalists. '
    + 'Small differences, awkward angles, cluttered backgrounds — the hardest '
    + 'set here, and the one where extra data helps most.',
  mushrooms: 'Twelve fungi and lichens. Almost nothing in the base model covers '
    + 'these, so it has to learn nearly everything from your examples.',
  pets: 'Twelve cat and dog breeds. Worth knowing: the base model already knows '
    + 'most dog breeds well, and almost no cats. Watch what that does.',
  food: 'Twelve dishes. Photographed in restaurants by ordinary people, so the '
    + 'lighting and framing are all over the place.',
};

export default function DataLibraryDock({ onUse }) {
  const { datasets, addDataset, primaryId, step, setPickedImage } = useFlow();
  // What this particular step teaches best with. A suggestion, never a
  // restriction -- every dataset stays pickable, and choosing a "wrong"
  // one and seeing a flat curve is itself a result worth having.
  const pick_for = RECOMMENDED[step] || null;
  const [open, setOpen] = useState(false);
  const [catalogue, setCatalogue] = useState(null);
  const [viewing, setViewing] = useState(null);   // a catalogue record
  const [loading, setLoading] = useState(null);
  const [problem, setProblem] = useState(null);
  // A drag out of the drawer has to cross the drawer itself and the scrim, both
  // of which sit above the page. Closing the drawer on dragstart would unmount
  // the source node and abort the drag in most browsers, so instead both get
  // faded and made click-through for the duration.
  const [dragging, setDragging] = useState(false);

  useEffect(() => { installedCatalogue().then(setCatalogue); }, []);

  // Escape closes, which people expect from anything that dims the page.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const use = useCallback(async (record) => {
    setProblem(null);
    const cached = datasets[record.dataset_id];
    if (cached) { onUse?.(cached); setOpen(false); return; }
    setLoading({ id: record.dataset_id, frac: 0 });
    try {
      const ds = await datasetFromPack(record.dataset_id,
        (frac) => setLoading({ id: record.dataset_id, frac }));
      const check = checkUsable(ds);
      if (!check.ok) { setProblem(check.reason); return; }
      addDataset(ds);
      onUse?.(ds);
      setOpen(false);
    } catch (e) {
      setProblem(`Could not load that set: ${e.message}`);
    } finally {
      setLoading(null);
    }
  }, [datasets, addDataset, onUse]);

  const pickFolder = async (files) => {
    setProblem(null);
    const name = files[0]?.webkitRelativePath?.split('/')[0] || 'Your photos';
    setLoading({ id: 'yours', frac: 0 });
    try {
      const { dataset, reason } = await datasetFromFiles(files, name);
      if (!dataset) { setProblem(reason); return; }
      const check = checkUsable(dataset);
      if (!check.ok) { setProblem(check.reason); return; }
      addDataset(dataset);
      onUse?.(dataset);
      setOpen(false);
    } finally {
      setLoading(null);
    }
  };

  /** Load a library photo and hand it to whichever step is asking for one. */
  const useImage = (url, label) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { setPickedImage({ img, name: label }); setOpen(false); };
    img.onerror = () => setProblem(`Could not load ${label}.`);
    img.src = url;
  };

  const startImageDrag = (e, url) => {
    e.dataTransfer.setData(LIBRARY_IMAGE_TYPE, url);
    e.dataTransfer.effectAllowed = 'copy';
    setDragging(true);
  };

  const startDrag = (e, record) => {
    e.dataTransfer.setData(DATASET_DRAG_TYPE, record.dataset_id);
    // Some targets only ever see `text/plain`; harmless, and it makes the drag
    // work in browsers that are fussy about custom MIME types.
    e.dataTransfer.setData('text/plain', record.dataset_id);
    e.dataTransfer.effectAllowed = 'copy';
    setDragging(true);
  };
  const endDrag = () => setDragging(false);

  const count = catalogue?.length ?? 0;

  return createPortal(
    <>
      <button
        type="button"
        className={`dl-fab${!primaryId ? ' pulse' : ''}`}
        onClick={() => { setOpen((o) => !o); setViewing(null); }}
        aria-label="Open the Data Library"
      >
        <Library size={17} />
        Data Library
        {count > 0 && <span className="dl-count">{count}</span>}
      </button>

      {open && (
        <>
          <div
            className="dl-scrim"
            onClick={() => setOpen(false)}
            aria-hidden="true"
            style={dragging ? { opacity: 0, pointerEvents: 'none' } : undefined}
          />
          <aside
            className="dl-drawer"
            role="dialog"
            aria-label="Data Library"
            onDragEnd={endDrag}
            onDrop={endDrag}
            style={dragging ? { opacity: 0.22, pointerEvents: 'none' } : undefined}
          >
            <div className="dl-head">
              {viewing ? (
                <button type="button" className="icon-btn" onClick={() => setViewing(null)} aria-label="Back">
                  <ArrowLeft size={16} />
                </button>
              ) : <Library size={18} color="var(--info)" />}
              <h3>{viewing ? prettyName(viewing.dataset_id) : 'Data Library'}</h3>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="dl-body">
              {viewing
                ? (
                  <DatasetPreview
                    record={viewing}
                    onUse={use}
                    onDragStart={startDrag}
                    onDragEnd={endDrag}
                    busy={loading}
                    suggested={pick_for?.id === viewing.dataset_id ? pick_for : null}
                    onUseImage={useImage}
                    onImageDragStart={startImageDrag}
                    onDragEndImage={endDrag}
                  />
                )
                : (
                  <DatasetList
                    catalogue={catalogue}
                    datasets={datasets}
                    loading={loading}
                    onOpen={setViewing}
                    onDragStart={startDrag}
                    onDragEnd={endDrag}
                    onPickFolder={pickFolder}
                    suggested={pick_for}
                  />
                )}

              {problem && <div className="banner warn">{problem}</div>}
            </div>
          </aside>
        </>
      )}
    </>,
    document.body,
  );
}

/* ---------------------------------------------------------------- the list */

function DatasetList({
  catalogue, datasets, loading, onOpen, onDragStart, onDragEnd, onPickFolder, suggested,
}) {
  if (catalogue === null) return <p className="muted small">Looking for installed datasets…</p>;

  return (
    <>
      {catalogue.length === 0 && (
        <div className="banner warn">
          <b>Nothing installed yet.</b> The datasets are built by the Python
          pipeline — see <code>WORKFLOW.md</code>. Your own photo folder works
          right now, though.
        </div>
      )}

      {[...catalogue]
        // Float the suggested one to the top. Scrolling past the thing you were
        // just told to pick is a small insult.
        .sort((a, b) => (b.dataset_id === suggested?.id) - (a.dataset_id === suggested?.id))
        .map((r) => {
        const loaded = !!datasets[r.dataset_id];
        const isPick = suggested?.id === r.dataset_id;
        const thumbs = previewUrls(r).slice(0, 3);
        return (
          <button
            key={r.dataset_id}
            type="button"
            className={`dl-item${loaded ? ' on' : ''}`}
            onClick={() => onOpen(r)}
            draggable
            onDragStart={(e) => onDragStart(e, r)}
            onDragEnd={onDragEnd}
            title="Click to preview, or drag onto the training bench"
          >
            <span className="dl-thumbs">
              {thumbs.length
                ? thumbs.map((src) => <img key={src} src={src} alt="" loading="lazy" />)
                : <ImageIcon size={22} color="var(--muted)" />}
            </span>
            <span className="dl-item-meta">
              <b>{prettyName(r.dataset_id)}</b>
              <span>{r.count} images · {r.labels.length} classes</span>
              {isPick && <span className="dl-pick">Chiti suggests — {suggested.why}</span>}
            </span>
            {loaded && <Check size={16} color="var(--good)" />}
          </button>
        );
      })}

      <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 14 }}>
        <h4>Or bring your own</h4>
        <p className="small muted">
          A folder with <b>one sub-folder per class</b>. The folder names become
          the labels. Nothing is uploaded.
        </p>
        <label className="btn" style={{ cursor: 'pointer' }}>
          <FolderOpen size={15} /> Choose a folder
          <input
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files?.length) onPickFolder(e.target.files); e.target.value = ''; }}
          />
        </label>
        {loading?.id === 'yours' && <Progress value={0.5} label="Reading your photos…" />}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- the preview */

function previewUrls(record) {
  const assets = record.assets?.previews;
  if (!assets) return [];
  return Object.entries(assets).flatMap(([, files]) =>
    files.map((f) => `/embeddings/${record.dataset_id}/previews/${f}`));
}

function DatasetPreview({
  record, onUse, onDragStart, onDragEnd, busy, suggested,
  onUseImage, onImageDragStart, onDragEndImage,
}) {
  const byClass = record.assets?.previews || {};
  const classes = useMemo(() => Object.keys(byClass), [byClass]);
  const loadingThis = busy?.id === record.dataset_id;

  return (
    <>
      <p className="muted">{BLURBS[record.dataset_id] || 'A labelled image set.'}</p>

      {suggested && (
        <div className="banner good">
          <b>Chiti suggests this one.</b> {suggested.why}.
        </div>
      )}

      <div className="stat-row">
        <div className="stat"><div className="k">Images</div><div className="v">{record.count}</div></div>
        <div className="stat"><div className="k">Classes</div><div className="v">{record.labels.length}</div></div>
      </div>

      <h4>What is in it</h4>
      {classes.length === 0 ? (
        <p className="small muted">
          No preview images shipped with this pack. Re-run{' '}
          <code>embed_datasets.py</code> to generate them.
        </p>
      ) : (
        classes.map((cls) => (
          <div key={cls} style={{ marginBottom: 14 }}>
            <div className="small" style={{ marginBottom: 5, color: 'var(--ink)' }}>{cls.replace(/_/g, ' ')}</div>
            <div className="dl-preview-grid">
              {byClass[cls].map((f) => (
                <figure key={f}>
                  <img
                    src={`/embeddings/${record.dataset_id}/previews/${f}`}
                    alt={cls}
                    loading="lazy"
                    draggable
                    onDragStart={(e) => onDragStart(e, record)}
                    onDragEnd={onDragEnd}
                  />
                </figure>
              ))}
            </div>
          </div>
        ))
      )}

      <TestImages
        record={record}
        onUse={onUseImage}
        onDragStart={onImageDragStart}
        onDragEnd={onDragEndImage}
      />

      <div
        style={{
          position: 'sticky', bottom: 0, paddingTop: 12,
          background: 'linear-gradient(180deg, transparent, var(--bg) 30%)',
        }}
      >
        <button
          type="button"
          className="btn primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => onUse(record)}
          disabled={loadingThis}
        >
          {loadingThis ? <span className="spinner" /> : null}
          {loadingThis ? 'Loading…' : 'Use this dataset'}
        </button>
        {loadingThis && <Progress value={busy.frac || 0} />}
        <p className="small muted" style={{ textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
          or drag any image above onto the training bench
        </p>
      </div>
    </>
  );
}

/* -------------------------------------------------------- test photographs */

/**
 * The images held back from training, offered for testing.
 *
 * These are the last image of each class, written by `write_previews()` in
 * embed_datasets.py -- deliberately *not* the same ones shown in the preview
 * grid above, so a student testing on them is not testing on pictures they have
 * already been shown as examples of the class.
 *
 * They are still part of the dataset, so this is a demonstration, not an
 * evaluation. The measured accuracy comes from the held-out split, and the UI
 * says so rather than letting a lucky hit read as proof.
 */
function TestImages({ record, onUse, onDragStart, onDragEnd }) {
  const tests = record.assets?.test || [];
  if (!tests.length) return null;

  return (
    <div style={{ borderTop: '1px solid var(--line)', marginTop: 16, paddingTop: 14 }}>
      <h4>Photos to test with</h4>
      <p className="small muted">
        Click one to send it to whatever the current step is asking for, or drag
        it across. These were held back from the previews above.
      </p>
      <div className="dl-preview-grid">
        {tests.map((t) => {
          const url = `/embeddings/${record.dataset_id}/test/${t.file}`;
          return (
            <figure key={t.file}>
              <img
                src={url}
                alt={t.label}
                loading="lazy"
                draggable
                onDragStart={(e) => onDragStart?.(e, url)}
                onDragEnd={onDragEnd}
                onClick={() => onUse?.(url, t.label)}
                title={`Use this ${t.label.replace(/_/g, ' ')}`}
                style={{ cursor: 'pointer' }}
              />
              <figcaption>{t.label.replace(/_/g, ' ')}</figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
