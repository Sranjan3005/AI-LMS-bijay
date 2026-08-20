import React, { useMemo } from 'react';
import { CheckCircle, AlertTriangle, Info, TrendingUp, Scale, Layers } from 'lucide-react';

/**
 * DataInsights — client-side "what your data says" feedback.
 * After a student collects data we analyse it right in the browser (no backend)
 * and teach them: is this the kind of data we need? how good is it? how to improve?
 * Exports TabularInsights (tables) and ImageInsights (image collections).
 */

const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const isNum = (v) => v !== '' && v !== null && v !== undefined && !Number.isNaN(Number(v));

function pearson(xs, ys) {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) { const a = xs[i] - mx, b = ys[i] - my; num += a * b; dx += a * a; dy += b * b; }
  if (dx === 0 || dy === 0) return 0;
  return num / Math.sqrt(dx * dy);
}

const Verdict = ({ tone, icon, children }) => {
  const c = tone === 'good' ? { bg: 'rgba(48,209,88,.08)', bd: 'rgba(48,209,88,.35)', fg: '#4ade80' }
    : tone === 'warn' ? { bg: 'rgba(255,159,10,.08)', bd: 'rgba(255,159,10,.4)', fg: '#ffcf70' }
      : { bg: 'rgba(0,240,255,.06)', bd: 'rgba(0,240,255,.28)', fg: '#67e8f9' };
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 12, padding: '12px 14px' }}>
      <span style={{ color: c.fg, flexShrink: 0, marginTop: 2 }}>{icon}</span>
      <span style={{ color: 'var(--text-secondary)', lineHeight: 1.55, fontSize: '.95rem' }}>{children}</span>
    </div>
  );
};

const Stat = ({ label, value, sub }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px 14px' }}>
    <div style={{ fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{value}</div>
    {sub && <div style={{ fontSize: '.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</div>}
  </div>
);

const Panel = ({ children }) => (
  <div style={{ background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20 }}>
    <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
      🔬 What your data says
    </h3>
    <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '.9rem' }}>
      A quick check — right here in your browser — of the data you just collected.
    </p>
    {children}
  </div>
);

/* ── Tabular (regression / classification) ── */
export function TabularInsights({ rows, columns, modelType, scenarioTitle }) {
  const analysis = useMemo(() => {
    if (!columns?.length) return null;
    const featureCols = columns.slice(0, -1);
    const target = columns[columns.length - 1];
    const valid = rows.filter(r => columns.every(c => r[c] !== '' && r[c] !== null && r[c] !== undefined));
    const n = valid.length;

    // duplicates (identical across all columns)
    const seen = new Set();
    let dupes = 0;
    valid.forEach(r => { const k = columns.map(c => r[c]).join('|'); if (seen.has(k)) dupes++; else seen.add(k); });

    // per-feature numeric ranges
    const featureStats = featureCols.map(c => {
      const nums = valid.map(r => Number(r[c])).filter(v => !Number.isNaN(v));
      if (!nums.length) return { col: c, numeric: false };
      return { col: c, numeric: true, min: Math.min(...nums), max: Math.max(...nums), avg: mean(nums) };
    });

    const isClf = modelType === 'CLASSIFICATION';
    let correlations = [], classBalance = null;
    if (isClf) {
      const counts = {};
      valid.forEach(r => { const k = String(r[target]); counts[k] = (counts[k] || 0) + 1; });
      classBalance = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    } else {
      const ys = valid.map(r => Number(r[target]));
      correlations = featureCols.map(c => {
        const xs = valid.map(r => Number(r[c]));
        return { col: c, r: pearson(xs, ys) };
      }).filter(x => x.r !== null);
    }

    return { n, dupes, featureStats, isClf, correlations, classBalance, target };
  }, [rows, columns, modelType]);

  if (!analysis) return null;
  const { n, dupes, featureStats, isClf, correlations, classBalance, target } = analysis;

  return (
    <Panel>
      {n === 0 ? (
        <Verdict tone="info" icon={<Info size={18} />}>
          Add a few rows (or upload a CSV) and I&apos;ll tell you how good your dataset is looking.
        </Verdict>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
            <Stat label="Rows collected" value={n} sub={n < 3 ? 'need ≥ 3' : 'data points'} />
            <Stat label="Features" value={columns.length - 1} sub="clues per row" />
            <Stat label="Duplicates" value={dupes} sub={dupes ? 'repeated rows' : 'all unique 👍'} />
          </div>

          {/* Readiness */}
          {n < 3 ? (
            <Verdict tone="warn" icon={<AlertTriangle size={18} />}>
              You have <b>{n}</b> row{n === 1 ? '' : 's'}. An AI needs at least <b>3</b> examples to spot a pattern — collect a few more.
            </Verdict>
          ) : n < 8 ? (
            <Verdict tone="info" icon={<Info size={18} />}>
              <b>{n} rows</b> is enough to start, but more data = a smarter model. Aim for <b>10+</b> for a result you can trust.
            </Verdict>
          ) : (
            <Verdict tone="good" icon={<CheckCircle size={18} />}>
              <b>{n} rows</b> — a solid sample. The model will have plenty of examples to learn the pattern from.
            </Verdict>
          )}

          {dupes > 0 && (
            <Verdict tone="warn" icon={<Layers size={18} />}>
              <b>{dupes}</b> row{dupes === 1 ? ' is a' : 's are'} exact duplicate{dupes === 1 ? '' : 's'}. Repeated rows don&apos;t teach the AI anything new — collect fresh, varied examples instead.
            </Verdict>
          )}

          {/* Regression: correlation with target */}
          {!isClf && correlations.length > 0 && n >= 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)' }}>
                Does each clue actually predict <b style={{ color: '#fff' }}>{target}</b>?
              </div>
              {correlations.map(({ col, r }) => {
                const mag = Math.abs(r);
                const tone = mag >= 0.6 ? 'good' : mag >= 0.3 ? 'info' : 'warn';
                const strength = mag >= 0.8 ? 'very strong' : mag >= 0.6 ? 'strong' : mag >= 0.3 ? 'weak-ish' : 'almost no';
                const dir = r > 0 ? 'more' : 'less';
                return (
                  <Verdict key={col} tone={tone} icon={<TrendingUp size={18} />}>
                    <b>{col}</b> → <b>{target}</b>: {strength} link (r = {r.toFixed(2)}).{' '}
                    {mag >= 0.3
                      ? <>As <b>{col}</b> goes up, <b>{target}</b> tends to go {dir}. This is a useful clue for the model.</>
                      : <>This clue barely moves with {target} — the model may struggle to use it. Collect a wider range of values.</>}
                  </Verdict>
                );
              })}
            </div>
          )}

          {/* Classification: class balance */}
          {isClf && classBalance && n >= 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)' }}>
                Are your categories balanced?
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {classBalance.map(([k, c]) => (
                  <span key={k} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid var(--glass-border)', borderRadius: 999, padding: '5px 12px', fontSize: '.85rem' }}>
                    <b style={{ color: '#fff' }}>{k}</b>: {c} ({Math.round((c / n) * 100)}%)
                  </span>
                ))}
              </div>
              {classBalance.length < 2 ? (
                <Verdict tone="warn" icon={<AlertTriangle size={18} />}>
                  Every row is the same category (<b>{classBalance[0][0]}</b>). A sorter needs at least <b>two</b> different answers to learn the difference — add examples of the other kind!
                </Verdict>
              ) : (classBalance[0][1] / n) > 0.8 ? (
                <Verdict tone="warn" icon={<Scale size={18} />}>
                  <b>{classBalance[0][0]}</b> fills {Math.round((classBalance[0][1] / n) * 100)}% of your data. A lop-sided dataset makes the AI lazy — it&apos;ll just guess the common one. Add more of the rarer categories.
                </Verdict>
              ) : (
                <Verdict tone="good" icon={<CheckCircle size={18} />}>
                  Nicely balanced categories — the model gets a fair look at each answer.
                </Verdict>
              )}
            </div>
          )}

          {/* Feature spread (real-life tie-in) */}
          {featureStats.some(f => f.numeric) && n >= 3 && (
            <Verdict tone="info" icon={<Info size={18} />}>
              Just like a real data scientist collecting data for <b>{scenarioTitle}</b>: good data has <b>variety</b>.{' '}
              {featureStats.filter(f => f.numeric).map(f => `${f.col} ranges ${Math.round(f.min)}–${Math.round(f.max)}`).join(', ')}.{' '}
              If any range is tiny, go collect examples from the extremes too — that&apos;s what teaches the model the full picture.
            </Verdict>
          )}
        </div>
      )}
    </Panel>
  );
}

/* ── Image collections (computer vision / neural) ── */
export function ImageInsights({ slots, scenarioTitle }) {
  const filled = slots.filter(s => s.file).length;
  const total = slots.length;
  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
          <Stat label="Samples added" value={`${filled}/${total}`} sub="image slots" />
          <Stat label="Variety" value={filled >= 4 ? 'High' : filled >= 2 ? 'Some' : 'Low'} sub="different styles" />
        </div>
        {filled === 0 ? (
          <Verdict tone="info" icon={<Info size={18} />}>
            Add an image to each card. The trick to teaching a vision model is <b>variety</b> — the same thing shown many different ways.
          </Verdict>
        ) : filled < 3 ? (
          <Verdict tone="warn" icon={<AlertTriangle size={18} />}>
            Only <b>{filled}</b> sample{filled === 1 ? '' : 's'}. A vision model that sees one neat example gets fooled by anything messy. Fill more cards with <b>different-looking</b> versions.
          </Verdict>
        ) : (
          <Verdict tone="good" icon={<CheckCircle size={18} />}>
            <b>{filled} varied samples</b> — exactly how real vision datasets are built for <b>{scenarioTitle}</b>: the same idea captured in clean, messy, big, small and tilted forms so the AI learns the <i>concept</i>, not one picture.
          </Verdict>
        )}
        <Verdict tone="info" icon={<Info size={18} />}>
          Real-world lesson: models are only as fair as their data. If every sample looks the same (same handwriting, same lighting), the AI fails on everyone else — the reason good teams collect data from <b>many</b> people and conditions.
        </Verdict>
      </div>
    </Panel>
  );
}

export default TabularInsights;
