import { useEffect, useRef, useState } from 'react';
import { FolderOpen, Library, AlertTriangle } from 'lucide-react';
import { datasetFromFiles, labelCountsOf, checkUsable } from '../lib/ml/datasets.js';
import { installedCatalogue, datasetFromPack } from '../lib/ml/heads.js';
import { useFlow } from '../lib/flowState.jsx';
import { Progress } from './ui.jsx';

/**
 * DatasetPicker -- the Data Library, plus the student's own folder.
 *
 * Rejections always carry a reason. A greyed-out card teaches nothing; "this is
 * a text dataset and the model needs labelled images" teaches the actual skill,
 * which is knowing what a model can learn from before you spend an afternoon
 * on it.
 *
 * When nothing is installed this says so plainly and points at the sourcing
 * doc, rather than falling back to a demo dataset. A placeholder dataset would
 * produce placeholder accuracy, and every lesson downstream depends on the
 * numbers being trustworthy.
 */
export default function DatasetPicker({ onPicked, selectedId, title = 'Data Library' }) {
  const { datasets, addDataset } = useFlow();
  const [catalogue, setCatalogue] = useState(null);
  const [loading, setLoading] = useState(null); // {id, done, total}
  const [problem, setProblem] = useState(null);
  const folderRef = useRef(null);

  useEffect(() => { installedCatalogue().then(setCatalogue); }, []);

  const pick = async (record) => {
    if (datasets[record.dataset_id]) { onPicked(datasets[record.dataset_id]); return; }
    setProblem(null);
    setLoading({ id: record.dataset_id, done: 0, total: record.files?.length || 0 });
    try {
      // Installed sets ship as embeddings, not images -- so "loading" is a few
      // MB of vectors rather than hundreds of JPEGs.
      const ds = await datasetFromPack(record.dataset_id, (frac) => setLoading({
        id: record.dataset_id, done: Math.round(frac * 100), total: 100,
      }));
      const check = checkUsable(ds);
      if (!check.ok) { setProblem(check.reason); return; }
      addDataset(ds);
      onPicked(ds);
    } catch (e) {
      setProblem(`Could not load that set: ${e.message}`);
    } finally {
      setLoading(null);
    }
  };

  const pickFolder = async (files) => {
    setProblem(null);
    const name = files[0]?.webkitRelativePath?.split('/')[0] || 'Your photos';
    setLoading({ id: 'yours', done: 0, total: files.length });
    try {
      const { dataset, skipped, reason } = await datasetFromFiles(files, name);
      if (!dataset) { setProblem(reason); return; }
      const check = checkUsable(dataset);
      if (!check.ok) { setProblem(check.reason); return; }
      addDataset(dataset);
      onPicked(dataset);
      if (skipped) {
        setProblem(`${skipped} file${skipped === 1 ? '' : 's'} skipped — not in a class folder, or not readable.`);
      }
    } finally {
      setLoading(null);
    }
  };

  const loaded = Object.values(datasets);

  return (
    <div className="card">
      <div className="btn-row" style={{ marginBottom: 12 }}>
        <Library size={18} color="var(--info)" />
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>

      {/* -- installed sets -- */}
      {catalogue === null && <p className="muted small">Checking what is installed…</p>}

      {catalogue?.length > 0 && (
        <div className="grid3" style={{ marginBottom: 14 }}>
          {catalogue.map((r) => {
            const isLoading = loading?.id === r.dataset_id;
            const isSelected = selectedId === r.dataset_id;
            return (
              <button
                key={r.dataset_id}
                type="button"
                className="toggle"
                style={{
                  flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  borderColor: isSelected ? 'var(--accent)' : undefined,
                  background: isSelected ? 'rgba(255,159,10,.08)' : undefined,
                  textAlign: 'left',
                }}
                onClick={() => pick(r)}
                disabled={!!loading}
              >
                <b>{r.name}</b>
                <span className="small muted">
                  {r.count} images · {r.labels.length} classes
                </span>
                {/* Deliberately no accuracy here. The student is about to watch
                    this train; printing the answer on the card first throws the
                    whole point of the next screen away. */}
                {isLoading && <Progress value={loading.total ? loading.done / loading.total : 0} label={`${loading.done}/${loading.total}`} />}
              </button>
            );
          })}
        </div>
      )}

      {catalogue?.length === 0 && (
        <div className="banner warn">
          <b>No datasets installed yet.</b> This build ships without image data
          on purpose — the sets the module is designed around are licence-bound
          and large. See <code>public/datasets/README.md</code> for how to add
          them. Meanwhile, the option below works right now and is arguably the
          better lesson.
        </div>
      )}

      {/* -- the student's own -- */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <h4>Or use your own photos</h4>
        <p className="small muted">
          Pick a folder that contains <b>one sub-folder per class</b> — that is
          how every real image dataset is organised, and the folder name becomes
          the label. Your images never leave this browser.
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => folderRef.current?.click()} disabled={!!loading}>
            <FolderOpen size={15} /> Choose a folder
          </button>
          {loading?.id === 'yours' && <span className="spinner" />}
        </div>
        <input
          ref={folderRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.length) pickFolder(e.target.files); e.target.value = ''; }}
        />
      </div>

      {problem && (
        <div className="banner warn">
          <AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {problem}
        </div>
      )}

      {/* -- what is already in memory -- */}
      {loaded.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <h4>Loaded</h4>
          <div className="grid3">
            {loaded.map((ds) => {
              const counts = labelCountsOf(ds);
              return (
                <button
                  key={ds.dataset_id}
                  type="button"
                  className={`toggle${selectedId === ds.dataset_id ? ' on' : ''}`}
                  style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4, textAlign: 'left' }}
                  onClick={() => onPicked(ds)}
                >
                  <b>{ds.name}</b>
                  <span className="small muted">
                    {ds.count} images · {ds.labels.join(', ')}
                  </span>
                  <span className="small muted">
                    {Object.entries(counts).map(([l, n]) => `${l} ${n}`).join(' · ')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
