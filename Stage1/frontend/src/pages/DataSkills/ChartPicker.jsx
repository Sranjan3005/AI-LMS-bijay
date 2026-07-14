import React, { useRef, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import { Upload, Database } from 'lucide-react';
import DemoFlow from '../../components/sutra/DemoFlow';
import { parseCsv } from '../../utils/csv';
import s from '../../components/sutra/DemoFlow.module.css';

/**
 * Which chart fits your data? — "Working with Data" hands-on.
 * Pick a built-in dataset or upload a small CSV, choose a chart type,
 * see YOUR data drawn that way, and get rule-based feedback on the fit.
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

const CHART_TYPES = [
  { id: 'bar', label: '📊 Bar', fit: 'Comparing categories (which is biggest?)' },
  { id: 'line', label: '📈 Line', fit: 'Change over time (what’s the trend?)' },
  { id: 'pie', label: '🥧 Pie', fit: 'Parts of a whole (share of 100%)' },
  { id: 'scatter', label: '✨ Scatter', fit: 'Two numbers, looking for a relationship — the AI favourite' },
];

// Rule-based feedback: how well does chartType fit the shape of the dataset?
function judge(chartType, ds) {
  const { textCols, numericCols, rows } = ds;
  const hasCat = textCols.length >= 1 && numericCols.length >= 1;
  const twoNums = numericCols.length >= 2;
  const looksTime = hasCat && /month|day|date|week|year|time/i.test(textCols[0]);
  const total = hasCat ? rows.reduce((a, r) => a + (Number(r[numericCols[0]]) || 0), 0) : 0;

  switch (chartType) {
    case 'bar':
      if (looksTime) return { ok: false, msg: 'A bar chart works, but your first column looks like TIME — a line chart would show the trend much better.' };
      if (hasCat) return { ok: true, msg: 'Great fit! Categories + one number = bar chart. Tallest bar wins at a glance.' };
      return { ok: false, msg: 'You have two number columns — bars need categories to compare. Try a scatter to hunt for a relationship.' };
    case 'line':
      if (looksTime) return { ok: true, msg: 'Perfect — time on the X-axis, value on the Y. The line tells the story of change.' };
      if (hasCat) return { ok: false, msg: 'A line joins your categories as if they were a sequence — but snack names have no order! Bars fit categories better.' };
      return { ok: false, msg: 'Lines are for ordered data (usually time). For two free numbers, scatter is the honest choice.' };
    case 'pie':
      if (hasCat && rows.length <= 6 && total > 0) return { ok: true, msg: `OK fit: few categories forming a whole (total ${total}). But careful — pies get unreadable beyond ~5 slices.` };
      if (hasCat) return { ok: false, msg: 'Too many slices make a pie unreadable — a bar chart compares these categories much more clearly.' };
      return { ok: false, msg: 'A pie needs parts-of-a-whole categories. Two number columns want a scatter instead.' };
    case 'scatter':
      if (twoNums) return { ok: true, msg: 'Exactly right — two numbers per row, one dot each. If the dots form a slope, the two things are related. This is the chart ML models “see”.' };
      return { ok: false, msg: 'Scatter needs TWO number columns (like hours & marks). This dataset has only one — bars or a line fit better.' };
    default:
      return { ok: false, msg: '' };
  }
}

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
  // scatter
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
        <XAxis dataKey={nx} name={nx} stroke="#9aa0b5" fontSize={12} type="number" />
        <YAxis dataKey={ny || nx} name={ny || nx} stroke="#9aa0b5" fontSize={12} type="number" />{tooltip}
        <Scatter data={ds.rows} fill="#BF5AF2" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

const ChartPicker = ({ onBack, onOpenDataLab }) => {
  const [dsId, setDsId] = useState('snacks');
  const [custom, setCustom] = useState(null);
  const [uploadErr, setUploadErr] = useState('');
  const [chartType, setChartType] = useState(null);
  const fileRef = useRef(null);

  const builtin = BUILTINS.find(b => b.id === dsId);
  const ds = dsId === 'custom' ? custom : builtin.data;
  const verdict = chartType && ds ? judge(chartType, ds) : null;

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const parsed = parseCsv(await f.text());
      setCustom(parsed); setDsId('custom'); setChartType(null); setUploadErr('');
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
      lede="Real analysts don't decorate data — they match the chart to the data's shape. Pick a dataset (or upload your own), choose a chart, and see if it fits."
      realLife={[
        { icon: '🧾', title: 'The cheat-sheet', text: 'Categories → bar. Time → line. Share of whole → pie. Two numbers → scatter. That one line runs half of data science.' },
        { icon: '📊', title: 'School projects', text: 'Next science-fair poster: pick the chart from the DATA shape, not from what looks prettiest.' },
        { icon: '🤖', title: 'Feeding models', text: 'The scatter you made of two number columns? That is literally what a regression model looks at when it learns.' },
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'start' }}>
        {/* LEFT — data + chart-type controls + verdict */}
        <div className={s.card} style={{ minWidth: 0 }}>
          <h3 style={{ margin: '0 0 10px' }}>1 · Pick your data</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {BUILTINS.map(b => (
              <button key={b.id} className={`${s.pillBtn} ${dsId === b.id ? s.pillOn : ''}`}
                      onClick={() => { setDsId(b.id); setChartType(null); }}>
                <Database size={14} /> {b.label}
              </button>
            ))}
            <button className={`${s.pillBtn} ${dsId === 'custom' ? s.pillOn : ''}`} onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload my CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
          </div>
          {dsId !== 'custom' && <p className={s.muted} style={{ marginTop: 0, fontSize: '.88rem' }}>{builtin.hint}</p>}
          {uploadErr && <div className={`${s.banner} ${s.bannerWarn}`} style={{ marginTop: 0, marginBottom: 12 }}>⚠️ {uploadErr}</div>}
          {ds ? <DataTable ds={ds} /> : <p className={s.muted}>Upload a small CSV like: <code>Month,Sales</code> then one row per line.</p>}
          {ds?.truncated && <p className={s.muted} style={{ fontSize: '.8rem' }}>Showing the first 200 rows.</p>}

          {ds && (
            <>
              <h3 style={{ margin: '20px 0 10px' }}>2 · Pick a chart for it</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {CHART_TYPES.map(c => (
                  <button key={c.id} className={`${s.pillBtn} ${chartType === c.id ? s.pillOn : ''}`} title={c.fit}
                          onClick={() => setChartType(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>

              {verdict && (
                <>
                  <div className={verdict.ok ? s.banner : `${s.banner} ${s.bannerWarn}`}>
                    {verdict.ok ? '✅ ' : '🤔 '}{verdict.msg}
                  </div>
                  {verdict.ok && (
                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <button className={s.navBtn} onClick={onOpenDataLab}>
                        Take your data further in the Data Lab →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* RIGHT — YOUR data, drawn */}
        <div className={s.card} style={{ position: 'sticky', top: 84, minWidth: 0 }}>
          <h3 style={{ margin: '0 0 12px' }}>Your data, drawn</h3>
          {ds && chartType ? (
            <RenderChart type={chartType} ds={ds} />
          ) : (
            <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, border: '1px dashed rgba(255,255,255,.15)', borderRadius: 12, color: '#9aa0b5', textAlign: 'center', padding: 20 }}>
              <span style={{ fontSize: '2.2rem' }}>📊</span>
              {ds ? 'Pick a chart type on the left and it appears here.' : 'Pick a dataset on the left to get started.'}
            </div>
          )}
        </div>
      </div>
    </DemoFlow>
  );
};

export default ChartPicker;
