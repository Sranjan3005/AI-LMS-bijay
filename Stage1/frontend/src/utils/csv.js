// Tiny CSV parser for classroom-sized files (no quoted-field support needed).
// Returns { headers: [..], rows: [{col: value}], numericCols: [..], textCols: [..] }
// Rows capped at 200 to keep charts snappy on low-end machines.

const MAX_ROWS = 200;

export function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('The file needs a header row and at least one data row.');

  const headers = lines[0].split(',').map(h => h.trim()).filter(Boolean);
  if (headers.length < 2) throw new Error('Need at least two columns (e.g. "Month, Sales").');

  const rows = lines.slice(1, MAX_ROWS + 1).map(line => {
    const cells = line.split(',').map(c => c.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });

  // A column is numeric when every non-empty value parses as a number.
  const numericCols = headers.filter(h =>
    rows.every(r => r[h] === '' || (r[h] !== '' && !Number.isNaN(Number(r[h]))))
    && rows.some(r => r[h] !== '')
  );
  const textCols = headers.filter(h => !numericCols.includes(h));

  // Coerce numeric cells so charts can consume rows directly.
  rows.forEach(r => numericCols.forEach(h => { r[h] = r[h] === '' ? null : Number(r[h]); }));

  return { headers, rows, numericCols, textCols, truncated: lines.length - 1 > MAX_ROWS };
}
