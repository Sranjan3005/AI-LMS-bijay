import React, { useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Upload, Database, RotateCcw, Sparkles } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import { parseCsv } from '../../utils/csv';
import { CHART_TYPES, judgeFit } from '../../utils/chartFit';
import { GuideProvider, useGuide } from '../../components/guide/GuideProvider';
import s from '../../components/sutra/DemoFlow.module.css';

// Chiti's script for this page — build a real bar chart, hit a mismatch, repair
// it into a real scatter, then set the student free. Targets are data-guide attrs.
const GUIDE_STEPS = [
  { target: '[data-guide="pick-data"]', mood: 'point',
    say: "Hi, I'm Chiti! 🤖 This is our tuck-shop data — snacks and how many sold. Let's turn it into charts together!" },
  { target: '[data-guide="pick-chart"]', mood: 'think', waitFor: 'chart:bar',
    say: 'These are categories, so a 📊 Bar chart is perfect. Tap Bar and watch it draw!' },
  { target: '[data-guide="verdict"]', mood: 'cheer',
    say: 'A perfect bar chart! 🎉 The tallest bar is the best-seller — categories love bars.' },
  { target: '[data-guide="pick-chart"]', mood: 'think', waitFor: 'chart:scatter',
    say: 'Now tap ✨ Scatter. Our data has only ONE number column — watch what I do next 👀' },
  { target: '[data-guide="verdict"]', mood: 'point', waitFor: 'repair-applied',
    say: 'No scatter yet — it needs TWO numbers! Hit "➕ Add a second number: Cost" and I\'ll invent one for every snack.' },
  { target: '[data-guide="chart"]', mood: 'cheer',
    say: "Boom 💥 Every snack is a dot now. This is exactly what an AI model 'sees' when it learns from data!" },
  { target: null, mood: 'cheer',
    say: 'You built a bar AND a scatter 🙌 Now explore on your own — try 📈 Line, 🥧 Pie, or upload your own CSV. Tap "Ask Chiti" to bring me back anytime!' },
];

/**
 * Which chart fits your data? — "Working with Data" hands-on.
 * Pick a built-in dataset or upload a small CSV, choose a chart type,
 * see YOUR data drawn that way, and get rule-based feedback on the fit.
 *
 * When a chart CAN'T honestly be drawn (e.g. a scatter on one-number data),
 * we don't fake it — we explain why and offer a one-click repair (add a
 * column, group slices, switch chart) so the student watches it start working.
 * The fit logic lives in utils/chartFit.js so the Data Labs can reuse it.
 */

const COLORS = ['#64D2FF', '#5E5CE6', '#BF5AF2', '#30D158', '#FF9F0A', '#FF453A', '#00C7BE'];

const BUILTINS = [
  {
    id: 'snacks', label: '🍿 Tuck-shop sales (categories)',
    hint: 'One text column, one number column — categories to compare.',
    best: 'bar',
    data: { headers: ['Snack', 'Sold'], textCols: ['Snack'], numericCols: ['Sold'],
      rows: [{ Snack: 'Samosa', Sold: 92 }, { Snack: 'Idli', Sold: 63 }, { Snack: 'Maggi', Sold: 78 }, { Snack: 'Fruit cup', Sold: 22 }, { Snack: 'Sandwich', Sold: 41 }] },
  },
  {
    id: 'temp', label: '🌡️ Delhi temperature by month (time)',
    hint: 'Values in time order — a story of change.',
    best: 'line',
    data: { headers: ['Month', 'TempC'], textCols: ['Month'], numericCols: ['TempC'],
      rows: [{ Month: 'Jan', TempC: 14 }, { Month: 'Feb', TempC: 17 }, { Month: 'Mar', TempC: 23 }, { Month: 'Apr', TempC: 30 }, { Month: 'May', TempC: 34 }, { Month: 'Jun', TempC: 35 }, { Month: 'Jul', TempC: 31 }] },
  },
  {
    id: 'study', label: '📚 Study hours vs marks (two numbers)',
    hint: 'Two number columns — is there a relationship?',
    best: 'scatter',
    data: { headers: ['Hours', 'Marks'], textCols: [], numericCols: ['Hours', 'Marks'],
      rows: [{ Hours: 1, Marks: 42 }, { Hours: 2, Marks: 55 }, { Hours: 2.5, Marks: 53 }, { Hours: 3, Marks: 64 }, { Hours: 4, Marks: 71 }, { Hours: 5, Marks: 83 }, { Hours: 6, Marks: 88 }, { Hours: 7, Marks: 94 }] },
  },
];

function DataTable({ ds }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '.85rem' }}>
        <thead>
          <tr>{ds.headers.map(h => (
            <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64D2FF', borderBottom: '1px solid rgba(255,255,255,.12)' }}>
              {h} <span style={{ color: '#9aa0b5', fontWeight: 400 }}>({ds.numericCols.includes(h) ? '123' : 'abc'})</span>
            </th>))}
          </tr>
        </thead>
        <tbody>
          {ds.rows.slice(0, 6).map((r, i) => (
            <tr key={i}>{ds.headers.map(h => <td key={h} style={{ padding: '7px 12px', color: '#cdd1e0', borderBottom: '1px solid rgba(255,255,255,.05)' }}>{String(r[h] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {ds.rows.length > 6 && <div style={{ padding: '6px 12px', color: '#9aa0b5', fontSize: '.78rem' }}>…and {ds.rows.length - 6} more rows</div>}
    </div>
  );
}

function RenderChart({ type, ds }) {
  const cat = ds.textCols[0] || ds.numericCols[0];
  const val = ds.numericCols.find(c => c !== cat) || ds.numericCols[0];
  const [nx, ny] = ds.numericCols;
  const tooltip = <Tooltip contentStyle={{ background: '#12142a', border: '1px solid rgba(255,255,255,.15)', borderRadius: 10 }} />;

  if (type === 'bar') return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={ds.rows} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey={cat} stroke="#9aa0b5" fontSize={12} /><YAxis stroke="#9aa0b5" fontSize={12} />{tooltip}
        <Bar dataKey={val} radius={[6, 6, 0, 0]}>{ds.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
  if (type === 'line') return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={ds.rows} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey={cat} stroke="#9aa0b5" fontSize={12} /><YAxis stroke="#9aa0b5" fontSize={12} />{tooltip}
        <Line type="monotone" dataKey={val} stroke="#64D2FF" strokeWidth={3} dot={{ r: 4, fill: '#64D2FF' }} />
      </LineChart>
    </ResponsiveContainer>
  );
  if (type === 'pie') return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={ds.rows} dataKey={val} nameKey={cat} innerRadius={50} outerRadius={100} paddingAngle={3}>
          {ds.rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 12 }} />{tooltip}
      </PieChart>
    </ResponsiveContainer>
  );
  // scatter — only reached when there are two numeric columns (see chartFit.canRender)
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey={nx} name={nx} stroke="#9aa0b5" fontSize={12} type="number" />
        <YAxis dataKey={ny} name={ny} stroke="#9aa0b5" fontSize={12} type="number" />{tooltip}
        <Scatter data={ds.rows} fill="#BF5AF2" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// Shown in place of the chart when the data can't honestly be drawn that way.
function CantDraw({ chartLabel }) {
  return (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, border: '1px dashed rgba(255,159,10,.35)', borderRadius: 12, color: '#ffe9c7', textAlign: 'center', padding: '20px 26px', background: 'rgba(255,159,10,.05)' }}>
      <span style={{ fontSize: '2.2rem' }}>🚫</span>
      <div style={{ fontWeight: 600 }}>No {chartLabel.toLowerCase()} to draw — yet.</div>
      <div style={{ color: '#d8bd93', fontSize: '.9rem', lineHeight: 1.5, maxWidth: 340 }}>
        This data doesn’t have the shape a {chartLabel.toLowerCase()} needs. See the fix below the chart ↓
      </div>
    </div>
  );
}

const ChartPickerInner = ({ onBack, onOpenDataLab }) => {
  const [dsId, setDsId] = useState('snacks');
  const [custom, setCustom] = useState(null);
  const [patched, setPatched] = useState(null);   // repaired dataset override
  const [uploadErr, setUploadErr] = useState('');
  const [chartType, setChartType] = useState(null);
  const fileRef = useRef(null);
  const { start, signal } = useGuide();

  const builtin = BUILTINS.find(b => b.id === dsId);
  const base = dsId === 'custom' ? custom : builtin?.data;
  const ds = patched || base;
  const verdict = chartType && ds ? judgeFit(chartType, ds) : null;
  const chartLabel = chartType ? CHART_TYPES.find(c => c.id === chartType)?.label.replace(/^\S+\s/, '') : '';

  const chooseDataset = (id) => { setDsId(id); setPatched(null); setChartType(null); signal('data-picked'); };
  const pickChart = (id) => { setChartType(id); signal(`chart:${id}`); };

  const applyRepair = (repair) => {
    if (repair.toChart) { setChartType(repair.toChart); signal(`chart:${repair.toChart}`); return; }
    if (repair.apply) { setPatched(repair.apply(ds)); signal('repair-applied'); }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const parsed = parseCsv(await f.text());
      setCustom(parsed); setDsId('custom'); setPatched(null); setChartType(null); setUploadErr('');
    } catch (err) {
      setUploadErr(err.message || 'Could not read that file — is it a simple CSV?');
    }
    e.target.value = '';
  };

  return (
    <DemoFlow
      onBack={onBack}
      eyebrow="Working with Data · Hands-on"
      accent="#64D2FF"
      title="Which chart fits your data?"
      lede="Real analysts don't decorate data — they match the chart to the data's shape. Pick a dataset (or upload your own), choose a chart, and see if it fits. When it can't, fix the data and watch it work."
      realLife={[
        { icon: '🧾', title: 'The cheat-sheet', text: 'Categories → bar. Time → line. Share of whole → pie. Two numbers → scatter. That one line runs half of data science.' },
        { icon: '📊', title: 'School projects', text: 'Next science-fair poster: pick the chart from the DATA shape, not from what looks prettiest.' },
        { icon: '🤖', title: 'Feeding models', text: 'The scatter you made of two number columns? That is literally what a regression model looks at when it learns.' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* LEFT — data + chart-type controls */}
        <div className={s.card} style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>1 · Pick your data</h3>
            <button className={s.pillBtn} style={{ padding: '6px 12px', fontSize: '.82rem' }} onClick={() => start(GUIDE_STEPS)}>
              <Sparkles size={13} /> Guide me
            </button>
          </div>
          <div data-guide="pick-data" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, borderRadius: 12 }}>
            {BUILTINS.map(b => (
              <button key={b.id} className={`${s.pillBtn} ${dsId === b.id ? s.pillOn : ''}`}
                      onClick={() => chooseDataset(b.id)}>
                <Database size={14} /> {b.label}
              </button>
            ))}
            <button className={`${s.pillBtn} ${dsId === 'custom' ? s.pillOn : ''}`} onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload my CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
          </div>
          {dsId !== 'custom' && !patched && <p className={s.muted} style={{ marginTop: 0, fontSize: '.88rem' }}>{builtin.hint}</p>}
          {uploadErr && <div className={`${s.banner} ${s.bannerWarn}`} style={{ marginTop: 0, marginBottom: 12 }}>⚠️ {uploadErr}</div>}
          {ds ? <DataTable ds={ds} /> : <p className={s.muted}>Upload a small CSV like: <code>Month,Sales</code> then one row per line.</p>}
          {ds?.truncated && <p className={s.muted} style={{ fontSize: '.8rem' }}>Showing the first 200 rows.</p>}
          {patched && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ color: '#64D2FF', fontSize: '.85rem' }}>✨ {patched.patchNote}</span>
              <button className={s.pillBtn} style={{ padding: '5px 12px', fontSize: '.82rem' }} onClick={() => setPatched(null)}>
                <RotateCcw size={13} /> Reset data
              </button>
            </div>
          )}

          {ds && (
            <>
              <h3 style={{ margin: '20px 0 10px' }}>2 · Pick a chart for it</h3>
              <div data-guide="pick-chart" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, borderRadius: 12 }}>
                {CHART_TYPES.map(c => (
                  <button key={c.id} className={`${s.pillBtn} ${chartType === c.id ? s.pillOn : ''}`} title={c.fit}
                          onClick={() => pickChart(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <p className={s.muted} style={{ fontSize: '.84rem', marginBottom: 0 }}>
                See it drawn on the right — with the verdict and, when needed, a one-click fix.
              </p>
            </>
          )}
        </div>

        {/* RIGHT — YOUR data drawn, with the reasoning card BELOW it */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <div data-guide="chart" className={s.card} style={{ minWidth: 0 }}>
            <h3 style={{ margin: '0 0 12px' }}>Your data, drawn</h3>
            {ds && chartType ? (
              verdict && verdict.canRender
                ? <RenderChart type={chartType} ds={ds} />
                : <CantDraw chartLabel={chartLabel} />
            ) : (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, border: '1px dashed rgba(255,255,255,.15)', borderRadius: 12, color: '#9aa0b5', textAlign: 'center', padding: 20 }}>
                <span style={{ fontSize: '2.2rem' }}>📊</span>
                {ds ? 'Pick a chart type on the left and it appears here.' : 'Pick a dataset on the left to get started.'}
              </div>
            )}
          </div>

          {/* Reasoning card — the "why it fits (or doesn't)" + repair, below the chart */}
          {verdict && (
            <div data-guide="verdict" className={s.card} style={{ minWidth: 0 }}>
              <h3 style={{ margin: '0 0 10px' }}>Why this {verdict.ok ? 'fits' : "doesn't fit"}</h3>
              <div className={verdict.ok ? s.banner : `${s.banner} ${s.bannerWarn}`} style={{ marginTop: 0 }}>
                {verdict.ok ? '✅ ' : '🤔 '}{verdict.msg}
              </div>

              {verdict.repair && (
                <div style={{ marginTop: 14 }}>
                  {verdict.repair.note && (
                    <p className={s.muted} style={{ marginTop: 0, marginBottom: 10, fontSize: '.92rem', lineHeight: 1.55 }}>
                      💡 {verdict.repair.note}
                    </p>
                  )}
                  <button
                    className={s.pillBtn}
                    style={{ background: 'color-mix(in srgb, #64D2FF 20%, transparent)', borderColor: 'color-mix(in srgb, #64D2FF 60%, transparent)', fontSize: '.95rem' }}
                    onClick={() => applyRepair(verdict.repair)}>
                    {verdict.repair.label}
                  </button>
                </div>
              )}

              {verdict.ok && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button className={s.navBtn} onClick={onOpenDataLab}>
                    Take your data further in the Data Lab →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DemoFlow>
  );
};

// Wrap in the guide provider so Chiti can walk students through this page.
// (Later this provider can live at the App root for platform-wide guides.)
const ChartPicker = (props) => (
  <GuideProvider steps={GUIDE_STEPS} autoStartKey="chartPicker">
    <ChartPickerInner {...props} />
  </GuideProvider>
);

export default ChartPicker;
