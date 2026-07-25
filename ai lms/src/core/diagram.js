/* =========================================================================
   Diagrams — for the recap act, where the subject is no longer the data but
   the *idea*. Deliberately not charts: no axes, no scales, nothing to read
   off. A student should be able to redraw one of these from memory.
   ========================================================================= */

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Rounded rect path. */
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Text wrapped to a pixel width, returned as lines. */
function wrap(ctx, text, maxW) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const probe = line ? `${line} ${w}` : w;
    if (ctx.measureText(probe).width > maxW && line) { lines.push(line); line = w; }
    else line = probe;
  }
  if (line) lines.push(line);
  return lines;
}

function arrowHead(ctx, x, y, dir, size = 7) {
  ctx.beginPath();
  if (dir === 'right')      { ctx.moveTo(x, y); ctx.lineTo(x - size, y - size * 0.62); ctx.lineTo(x - size, y + size * 0.62); }
  else if (dir === 'left')  { ctx.moveTo(x, y); ctx.lineTo(x + size, y - size * 0.62); ctx.lineTo(x + size, y + size * 0.62); }
  else if (dir === 'up')    { ctx.moveTo(x, y); ctx.lineTo(x - size * 0.62, y + size); ctx.lineTo(x + size * 0.62, y + size); }
  else                      { ctx.moveTo(x, y); ctx.lineTo(x - size * 0.62, y - size); ctx.lineTo(x + size * 0.62, y - size); }
  ctx.closePath();
  ctx.fill();
}

/**
 * A row of stages with a return arrow underneath — "and then do it all again".
 *
 * Drawn as a circuit rather than a list because the repetition *is* the
 * lesson: no single step here is clever, and a student who remembers only
 * the shape of this picture has the important half of it.
 *
 * @param {import('./plot.js').Plot} pl
 * @param {Array<{k: string, v: string}>} boxes
 * @param {{active?: number, accent?: string, caption?: string, loop?: boolean}} [opts]
 */
export function loopDiagram(pl, boxes, opts = {}) {
  const { ctx, t } = pl;
  const { active = -1, accent = t.d2, caption, loop = true } = opts;
  const n = boxes.length;

  const padX = Math.max(18, pl.w * 0.04);
  const gap = Math.max(20, pl.w * 0.035);
  const boxW = (pl.w - padX * 2 - gap * (n - 1)) / n;
  const boxH = Math.min(104, Math.max(64, pl.h * 0.26));

  // Centre the whole assembly — boxes plus the return path plus the caption —
  // rather than the box row alone, or the picture rides high in a tall canvas.
  const returnH = loop ? Math.min(46, pl.h * 0.17) + 10 : 0;
  const capH = caption ? 34 : 0;
  const top = Math.max(16, (pl.h - boxH - returnH - capH) / 2);
  const midY = top + boxH / 2;

  const xs = Array.from({ length: n }, (_, i) => padX + i * (boxW + gap));

  ctx.save();
  ctx.textAlign = 'center';

  /* --- connecting arrows, drawn under the boxes --- */
  for (let i = 0; i < n - 1; i++) {
    const lit = active >= 0 && i < active;
    ctx.strokeStyle = lit ? accent : t.axis;
    ctx.fillStyle = lit ? accent : t.axis;
    ctx.lineWidth = lit ? 2.5 : 2;
    const x0 = xs[i] + boxW + 5;
    const x1 = xs[i + 1] - 5;
    ctx.beginPath();
    ctx.moveTo(x0, midY);
    ctx.lineTo(x1 - 6, midY);
    ctx.stroke();
    arrowHead(ctx, x1, midY, 'right');
  }

  /* --- the return path --- */
  if (loop) {
    const y = top + boxH + Math.min(46, pl.h * 0.17);
    const xEnd = xs[n - 1] + boxW / 2;
    const xStart = xs[0] + boxW / 2;
    ctx.strokeStyle = t.axis;
    ctx.fillStyle = t.axis;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(xEnd, top + boxH + 4);
    ctx.lineTo(xEnd, y);
    ctx.lineTo(xStart, y);
    ctx.lineTo(xStart, top + boxH + 12);
    ctx.stroke();
    ctx.setLineDash([]);
    arrowHead(ctx, xStart, top + boxH + 5, 'up');

    ctx.font = `500 12.5px ${FONT}`;
    ctx.fillStyle = t.ink2;
    ctx.textBaseline = 'bottom';
    const mid = (xStart + xEnd) / 2;
    const label = opts.returnLabel ?? 'and again, thousands of times';
    const wTxt = ctx.measureText(label).width;
    ctx.fillStyle = t.surface;
    ctx.fillRect(mid - wTxt / 2 - 6, y - 9, wTxt + 12, 18);
    ctx.fillStyle = t.ink2;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, mid, y);
  }

  /* --- the boxes --- */
  boxes.forEach((b, i) => {
    const x = xs[i];
    const on = i === active;
    rr(ctx, x, top, boxW, boxH, 12);
    ctx.fillStyle = on ? t.surface : t.sunken;
    ctx.fill();
    ctx.lineWidth = on ? 2.5 : 1.5;
    ctx.strokeStyle = on ? accent : t.grid;
    ctx.stroke();

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = on ? accent : t.ink;
    ctx.font = `600 ${Math.min(16, boxW / 9)}px ${FONT}`;
    ctx.fillText(b.k, x + boxW / 2, top + 27);

    ctx.font = `400 12px ${FONT}`;
    ctx.fillStyle = t.muted;
    const lines = wrap(ctx, b.v, boxW - 20);
    lines.slice(0, 3).forEach((ln, j) => {
      ctx.fillText(ln, x + boxW / 2, top + 47 + j * 15);
    });

    // step number, so the order is unambiguous
    ctx.beginPath();
    ctx.arc(x + 15, top - 1, 11, 0, Math.PI * 2);
    ctx.fillStyle = on ? accent : t.grid;
    ctx.fill();
    ctx.font = `700 11px ${FONT}`;
    ctx.fillStyle = on ? t.surface : t.ink2;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), x + 15, top);
    ctx.textBaseline = 'alphabetic';
  });

  if (caption) {
    ctx.font = `500 13.5px ${FONT}`;
    ctx.fillStyle = t.ink2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const lines = wrap(ctx, caption, Math.min(560, pl.w - padX * 2));
    lines.forEach((ln, j) => ctx.fillText(ln, pl.w / 2, top + boxH + returnH + 10 + j * 18));
  }

  ctx.restore();
}

/**
 * A headline number with a line of explanation — used where the recap's point
 * is a single quantity rather than a process.
 */
export function bigNumber(pl, { value, unit = '', label, sub, color }) {
  const { ctx, t } = pl;
  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = t.muted;
  ctx.fillText(label, pl.w / 2, pl.h / 2 - 44);

  ctx.font = `650 ${Math.min(72, pl.w / 7)}px ${FONT}`;
  ctx.fillStyle = color ?? t.d2;
  ctx.fillText(`${value}${unit}`, pl.w / 2, pl.h / 2 + 14);

  if (sub) {
    ctx.font = `400 13.5px ${FONT}`;
    ctx.fillStyle = t.ink2;
    wrap(ctx, sub, pl.w * 0.75).forEach((ln, j) => {
      ctx.fillText(ln, pl.w / 2, pl.h / 2 + 48 + j * 19);
    });
  }
  ctx.restore();
}
