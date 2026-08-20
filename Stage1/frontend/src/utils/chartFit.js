// Shared "does this chart fit this data?" engine.
//
// One place that answers three questions for any (chartType, dataset) pair:
//   1. Is this a GOOD chart for this data?            -> ok
//   2. Will it even draw something meaningful?         -> canRender
//   3. If not, what's the ONE move that fixes it?      -> repair
//
// The whole teaching idea lives in `repair`: instead of silently drawing a
// broken chart, we tell the student WHY it fails and hand them a one-click fix
// (add a column, group slices, switch chart) so they can watch it start working.
//
// Dataset shape (same as utils/csv.js output and ChartPicker's built-ins):
//   { headers: string[], rows: object[], numericCols: string[], textCols: string[] }
// Plain arrays of objects (like the Data Labs use) can be lifted with inferShape().

export const CHART_TYPES = [
  { id: 'bar', label: '📊 Bar', fit: 'Comparing categories (which is biggest?)' },
  { id: 'line', label: '📈 Line', fit: 'Change over time (what’s the trend?)' },
  { id: 'pie', label: '🥧 Pie', fit: 'Parts of a whole (share of 100%)' },
  { id: 'scatter', label: '✨ Scatter', fit: 'Two numbers, looking for a relationship — the AI favourite' },
];

// Derive the {headers, numericCols, textCols} metadata from a bare array of
// row objects — lets components that only hold `[{likes, comments}, …]`
// (e.g. the Data Labs) use the same engine without changing their state shape.
export function inferShape(rows, headerOrder) {
  const headers = headerOrder || (rows.length ? Object.keys(rows[0]) : []);
  const numericCols = headers.filter(h =>
    rows.some(r => r[h] !== '' && r[h] != null) &&
    rows.every(r => r[h] === '' || r[h] == null || !Number.isNaN(Number(r[h])))
  );
  const textCols = headers.filter(h => !numericCols.includes(h));
  return { headers, rows, numericCols, textCols };
}

// A friendly name for the second number we'll invent — "Cost (₹)" when the data
// looks like sales, otherwise a neutral label.
function costName(ds) {
  const base = ds.numericCols[0] || '';
  return /sold|sale|qty|quantit|count|order/i.test(base) ? 'Cost (₹)' : 'Measure B';
}

// What one row represents, in words ("snack", "student", "row") — for narration.
function rowNoun(ds) {
  const t = ds.textCols[0];
  if (!t) return 'row';
  if (/snack|item|product|food|dish/i.test(t)) return 'snack';
  return t.toLowerCase();
}

// REPAIR: invent a second numeric column related to the first, so a real
// scatter exists. We make popular things cheaper (a gentle inverse slope) plus
// a little deterministic jitter, so the dots show a relationship without being
// a fake-perfect line.
function addNumericColumn(ds) {
  const base = ds.numericCols[0];
  const name = costName(ds);
  const vals = ds.rows.map(r => Number(r[base]) || 0);
  const max = Math.max(...vals, 1);
  const rows = ds.rows.map((r, i) => {
    const inv = 1 - (Number(r[base]) || 0) / max;   // popular -> low cost
    const jitter = ((i * 37) % 11) - 5;              // deterministic ±5
    return { ...r, [name]: Math.max(10, Math.round(15 + inv * 55 + jitter)) };
  });
  return {
    ...ds,
    headers: [...ds.headers, name],
    numericCols: [...ds.numericCols, name],
    rows,
    patchNote: `Added a “${name}” column — now every ${rowNoun(ds)} has two numbers, so it can be a dot.`,
  };
}

// REPAIR: keep the biggest `keep` slices, merge the rest into one "Other" wedge
// so a crowded pie becomes readable.
function groupSmallSlices(ds, keep = 5) {
  const cat = ds.textCols[0];
  const val = ds.numericCols[0];
  const sorted = [...ds.rows].sort((a, b) => (Number(b[val]) || 0) - (Number(a[val]) || 0));
  const rest = sorted.slice(keep);
  if (rest.length < 2) return ds;
  const otherSum = rest.reduce((a, r) => a + (Number(r[val]) || 0), 0);
  const otherRow = {};
  ds.headers.forEach(h => { otherRow[h] = h === cat ? 'Other' : h === val ? otherSum : ''; });
  return {
    ...ds,
    rows: [...sorted.slice(0, keep), otherRow],
    patchNote: `Merged the ${rest.length} smallest slices into one “Other” wedge.`,
  };
}

// Core judgement. Returns:
//   ok        — is this a good chart for this data?
//   canRender — will it draw something meaningful at all? (false => don't draw,
//               show the diagnosis + repair instead)
//   msg       — the reasoning, in student language
//   repair?   — the one-click fix, either:
//                 { label, note, toChart: 'bar' }        switch chart type, or
//                 { label, note, apply: (ds) => ds }     transform the data
export function judgeFit(chartType, ds) {
  const { textCols, numericCols, rows } = ds;
  const hasCat = textCols.length >= 1 && numericCols.length >= 1;
  const twoNums = numericCols.length >= 2;
  const looksTime = hasCat && /month|day|date|week|year|time|quarter/i.test(textCols[0]);
  const total = hasCat ? rows.reduce((a, r) => a + (Number(r[numericCols[0]]) || 0), 0) : 0;
  const oneRow = rows.length < 2;

  switch (chartType) {
    case 'scatter': {
      if (twoNums) {
        if (oneRow) return { ok: false, canRender: true, msg: 'A single row is just one lonely dot — you need several rows before you can see whether two numbers move together.' };
        return { ok: true, canRender: true, msg: 'Exactly right — two numbers per row, one dot each. If the dots form a slope, the two things are related. This is the chart ML models “see”.' };
      }
      if (numericCols.length === 1) {
        const other = costName(ds);
        return {
          ok: false, canRender: false,
          msg: `A scatter plots one number against another — but this data has just one number column (${numericCols[0]}). There’s nothing to put on the second axis, so no real scatter exists yet.`,
          repair: {
            label: `➕ Add a second number: ${other}`,
            note: `Give every ${rowNoun(ds)} a ${other}. Now each one becomes a dot — and you can ask: does ${other} affect ${numericCols[0]}?`,
            apply: addNumericColumn,
          },
        };
      }
      return { ok: false, canRender: false, msg: 'A scatter needs two number columns — this data has none. It needs numeric measurements first.' };
    }

    case 'bar': {
      if (looksTime) return {
        ok: false, canRender: true,
        msg: 'A bar chart works, but your first column looks like TIME — a line chart would show the trend much better.',
        repair: { label: 'Switch to Line', note: 'Time belongs on a line, so the trend reads as one continuous story.', toChart: 'line' },
      };
      if (hasCat) return { ok: true, canRender: true, msg: 'Great fit! Categories + one number = bar chart. Tallest bar wins at a glance.' };
      if (twoNums) return {
        ok: false, canRender: false,
        msg: 'You have two number columns and no category labels — bars need labelled groups to compare. Two free numbers want a scatter.',
        repair: { label: 'Switch to Scatter', note: 'Two free numbers → one dot each. Look for a slope.', toChart: 'scatter' },
      };
      return { ok: false, canRender: false, msg: 'Bars need a category column AND a number column. This data is missing one of them.' };
    }

    case 'line': {
      if (looksTime) return { ok: true, canRender: true, msg: 'Perfect — time on the X-axis, value on the Y. The line tells the story of change.' };
      if (hasCat) return {
        ok: false, canRender: true,
        msg: 'A line joins your categories as if they were a sequence — but these labels have no natural order! Bars fit unordered categories better.',
        repair: { label: 'Switch to Bar', note: 'Categories with no order should sit side by side as bars, not be joined into a fake trend.', toChart: 'bar' },
      };
      if (twoNums) return {
        ok: false, canRender: true,
        msg: 'Lines are for ordered data (usually time). For two free numbers, scatter is the honest choice.',
        repair: { label: 'Switch to Scatter', note: 'Two free numbers with no time order → scatter, not a line.', toChart: 'scatter' },
      };
      return { ok: false, canRender: false, msg: 'A line needs values to plot along an ordered axis.' };
    }

    case 'pie': {
      if (hasCat && rows.length <= 6 && total > 0) return { ok: true, canRender: true, msg: `OK fit: few categories forming a whole (total ${total}). But careful — pies get unreadable beyond ~5 slices.` };
      if (hasCat && total > 0) return {
        ok: false, canRender: true,
        msg: `${rows.length} slices is a lot — a pie turns to confetti beyond ~5. Group the small ones, or compare them as bars instead.`,
        repair: { label: '➕ Group smallest into “Other”', note: 'Keep the top 5 slices and merge the rest into one “Other” wedge — now the shares are readable.', apply: (d) => groupSmallSlices(d, 5) },
      };
      if (hasCat) return { ok: false, canRender: false, msg: 'A pie shows shares of a positive whole — these values don’t add up to a meaningful total.' };
      return {
        ok: false, canRender: false,
        msg: 'A pie needs parts-of-a-whole categories. Two number columns want a scatter instead.',
        repair: { label: 'Switch to Scatter', note: 'No categories here — two numbers per row are a scatter.', toChart: 'scatter' },
      };
    }

    default:
      return { ok: false, canRender: false, msg: '' };
  }
}
