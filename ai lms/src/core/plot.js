/* =========================================================================
   Plot — a small canvas charting layer.

   Owns the boring, easy-to-get-wrong parts: device-pixel scaling, margins,
   data->pixel scales, hairline grids, tick formatting, and marks that follow
   the house spec (2px lines, >=8px markers, 2px surface ring on overlap,
   haloed direct labels).

   Scene code should never touch ctx.setTransform or raw pixel math.
   ========================================================================= */

/** Reads live design tokens off :root so canvas ink matches the DOM in
 *  either theme. Re-read after a theme flip; never cache across one. */
export function tokens() {
  const s = getComputedStyle(document.documentElement);
  const v = (n) => s.getPropertyValue(n).trim();
  return {
    surface:  v('--surface'),
    sunken:   v('--surface-sunken'),
    ink:      v('--ink'),
    ink2:     v('--ink-secondary'),
    muted:    v('--ink-muted'),
    grid:     v('--grid'),
    axis:     v('--axis'),
    d1:       v('--data-1'),
    d2:       v('--data-2'),
    d3:       v('--data-3'),
    d1soft:   v('--data-1-soft'),
    d2soft:   v('--data-2-soft'),
    d2wash:   v('--data-2-wash'),
    d3soft:   v('--data-3-soft'),
    seq: [v('--seq-100'), v('--seq-250'), v('--seq-400'), v('--seq-550'), v('--seq-700')],
    good:     v('--good'),
  };
}

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export class Plot {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{margin?: {t:number,r:number,b:number,l:number}}} [opts]
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.margin = opts.margin ?? { t: 28, r: 28, b: 46, l: 54 };
    this.w = 0;
    this.h = 0;
    this.t = tokens();
    this.domain = { x: [0, 1], y: [0, 1] };
  }

  /** Resize to the element box at device resolution. Call on resize + theme flip. */
  measure() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.t = tokens();
    return this;
  }

  setDomain(x, y) { this.domain = { x, y }; return this; }

  /* --- geometry -------------------------------------------------------- */

  get left()   { return this.margin.l; }
  get right()  { return this.w - this.margin.r; }
  get top()    { return this.margin.t; }
  get bottom() { return this.h - this.margin.b; }
  get plotW()  { return Math.max(0, this.right - this.left); }
  get plotH()  { return Math.max(0, this.bottom - this.top); }

  /** data x -> pixel x */
  sx(v) {
    const [a, b] = this.domain.x;
    return this.left + ((v - a) / (b - a)) * this.plotW;
  }
  /** data y -> pixel y (inverted) */
  sy(v) {
    const [a, b] = this.domain.y;
    return this.bottom - ((v - a) / (b - a)) * this.plotH;
  }
  /** pixel x -> data x */
  ix(px) {
    const [a, b] = this.domain.x;
    return a + ((px - this.left) / this.plotW) * (b - a);
  }
  /** pixel y -> data y */
  iy(py) {
    const [a, b] = this.domain.y;
    return a + ((this.bottom - py) / this.plotH) * (b - a);
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    return this;
  }

  /* --- chrome ---------------------------------------------------------- */

  /**
   * Recessive hairline grid + solid axis rules + ticks.
   * Gridlines are solid, one shade off the surface — never dashed.
   */
  frame({
    xTicks, yTicks, xLabel, yLabel, xFmt = String, yFmt = String, gridAlpha = 1,
  } = {}) {
    const { ctx, t } = this;
    ctx.save();

    if (gridAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = gridAlpha;
      ctx.lineWidth = 1;
      ctx.strokeStyle = t.grid;
      ctx.beginPath();
      for (const v of yTicks ?? []) {
        const y = Math.round(this.sy(v)) + 0.5;
        ctx.moveTo(this.left, y);
        ctx.lineTo(this.right, y);
      }
      for (const v of xTicks ?? []) {
        const x = Math.round(this.sx(v)) + 0.5;
        ctx.moveTo(x, this.top);
        ctx.lineTo(x, this.bottom);
      }
      ctx.stroke();
      ctx.restore();
    }

    // axis rules
    ctx.strokeStyle = t.axis;
    ctx.beginPath();
    const by = Math.round(this.bottom) + 0.5;
    const lx = Math.round(this.left) + 0.5;
    ctx.moveTo(this.left, by); ctx.lineTo(this.right, by);
    ctx.moveTo(lx, this.top);  ctx.lineTo(lx, this.bottom);
    ctx.stroke();

    // ticks
    ctx.fillStyle = t.muted;
    ctx.font = `500 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const v of xTicks ?? []) ctx.fillText(xFmt(v), this.sx(v), this.bottom + 9);

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of yTicks ?? []) ctx.fillText(yFmt(v), this.left - 10, this.sy(v));

    // axis titles
    ctx.fillStyle = t.ink2;
    ctx.font = `600 12px ${FONT}`;
    // anchored to this plot's own baseline, not the canvas bottom — two
    // stacked plots on one canvas would otherwise print both labels in the
    // same place
    if (xLabel) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(xLabel, this.left + this.plotW / 2, this.bottom + 26);
    }
    // anchored to this plot's own left edge — a hardcoded x printed every
    // stacked plot's y-label on top of the first one's
    if (yLabel) {
      ctx.save();
      ctx.translate(this.left - 40, this.top + this.plotH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    ctx.restore();
    return this;
  }

  /* --- marks ----------------------------------------------------------- */

  /** Scatter marker. 2px surface ring keeps overlapping dots readable. */
  dot(x, y, { r = 5, fill, ring = true, alpha = 1 } = {}) {
    const { ctx, t } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    if (ring) {
      ctx.beginPath();
      ctx.arc(this.sx(x), this.sy(y), r + 2, 0, Math.PI * 2);
      ctx.fillStyle = t.surface;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(this.sx(x), this.sy(y), r, 0, Math.PI * 2);
    ctx.fillStyle = fill ?? t.d1;
    ctx.fill();
    ctx.restore();
    return this;
  }

  /** A straight line across the full x-domain, given slope + intercept. */
  fitLine(m, b, { color, width = 2.5, dash = null, alpha = 1 } = {}) {
    const [x0, x1] = this.domain.x;
    this.segment(x0, m * x0 + b, x1, m * x1 + b, { color, width, dash, alpha });
    return this;
  }

  segment(x0, y0, x1, y1, { color, width = 2, dash = null, alpha = 1, cap = 'round' } = {}) {
    const { ctx, t } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color ?? t.d2;
    ctx.lineWidth = width;
    ctx.lineCap = cap;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(this.sx(x0), this.sy(y0));
    ctx.lineTo(this.sx(x1), this.sy(y1));
    ctx.stroke();
    ctx.restore();
    return this;
  }

  /** Polyline through data-space points. */
  path(pts, { color, width = 2, alpha = 1, dash = null } = {}) {
    if (pts.length < 2) return this;
    const { ctx, t } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color ?? t.d1;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(this.sx(x), this.sy(y)) : ctx.moveTo(this.sx(x), this.sy(y))));
    ctx.stroke();
    ctx.restore();
    return this;
  }

  /** Axis-aligned rect in data space (used for the squared-error squares). */
  rectData(x0, y0, x1, y1, { fill, stroke, width = 1, alpha = 1 } = {}) {
    const { ctx } = this;
    const px = this.sx(Math.min(x0, x1));
    const py = this.sy(Math.max(y0, y1));
    const pw = Math.abs(this.sx(x1) - this.sx(x0));
    const ph = Math.abs(this.sy(y1) - this.sy(y0));
    ctx.save();
    ctx.globalAlpha = alpha;
    if (fill)   { ctx.fillStyle = fill; ctx.fillRect(px, py, pw, ph); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.strokeRect(px, py, pw, ph); }
    ctx.restore();
    return this;
  }

  /**
   * Direct label with a surface halo so it stays legible over marks.
   * Selective use only — never a value on every point.
   */
  label(text, x, y, {
    color, size = 12, weight = 600, align = 'left', baseline = 'middle',
    dx = 0, dy = 0, halo = true, space = false,
  } = {}) {
    const { ctx, t } = this;
    const px = (space ? x : this.sx(x)) + dx;
    const py = (space ? y : this.sy(y)) + dy;
    ctx.save();
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    if (halo) {
      ctx.strokeStyle = t.surface;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.strokeText(text, px, py);
    }
    ctx.fillStyle = color ?? t.ink;
    ctx.fillText(text, px, py);
    ctx.restore();
    return this;
  }

  /** Small rounded chip drawn in screen space — for anchored callouts. */
  chip(text, px, py, { color, bg, size = 12, weight = 600, pad = 7 } = {}) {
    const { ctx, t } = this;
    ctx.save();
    ctx.font = `${weight} ${size}px ${FONT}`;
    const w = ctx.measureText(text).width + pad * 2;
    const h = size + pad * 1.6;
    ctx.beginPath();
    ctx.roundRect(px - w / 2, py - h / 2, w, h, 999);
    ctx.fillStyle = bg ?? t.surface;
    ctx.fill();
    ctx.strokeStyle = color ?? t.axis;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = color ?? t.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, px, py);
    ctx.restore();
    return this;
  }

  /** Arrowhead-terminated segment in screen space. */
  arrow(x0, y0, x1, y1, { color, width = 2, head = 8, alpha = 1 } = {}) {
    const { ctx, t } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ctx.fillStyle = color ?? t.ink;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    const a = Math.atan2(y1 - y0, x1 - x0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(a - 0.42), y1 - head * Math.sin(a - 0.42));
    ctx.lineTo(x1 - head * Math.cos(a + 0.42), y1 - head * Math.sin(a + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return this;
  }

  /**
   * Paint a decision background by sampling a label function on a coarse grid
   * and drawing one soft rectangle per cell. `labelAt(dataX, dataY)` returns
   * an index into `fills`. Cheap enough to run every frame at ~cell=8px, and
   * kept deliberately blocky so it reads as "regions", not a photo.
   */
  regions(labelAt, fills, { cell = 9, alpha = 1 } = {}) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let py = this.top; py < this.bottom; py += cell) {
      for (let px = this.left; px < this.right; px += cell) {
        const cx = px + cell / 2, cy = py + cell / 2;
        const idx = labelAt(this.ix(cx), this.iy(cy));
        if (idx < 0) continue;
        ctx.fillStyle = fills[idx];
        ctx.fillRect(
          px, py,
          Math.min(cell, this.right - px),
          Math.min(cell, this.bottom - py),
        );
      }
    }
    ctx.restore();
    return this;
  }

  /** Clip subsequent drawing to the plot rect. */
  clip(fn) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.left, this.top, this.plotW, this.plotH);
    ctx.clip();
    fn();
    ctx.restore();
    return this;
  }
}

/* --- helpers -------------------------------------------------------------- */

/** Evenly spaced ticks, inclusive of both ends. */
export function ticks(a, b, step) {
  const out = [];
  // integer-stepped accumulation avoids float drift on e.g. 0.1 steps
  const n = Math.round((b - a) / step);
  for (let i = 0; i <= n; i++) out.push(+(a + i * step).toFixed(6));
  return out;
}

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Interpolate a hex ramp at t in [0,1]. Sequential encoding only. */
export function ramp(stops, t) {
  const u = clamp(t, 0, 1) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(u));
  const f = u - i;
  const p = hexToRgb(stops[i]);
  const q = hexToRgb(stops[i + 1]);
  return `rgb(${Math.round(lerp(p[0], q[0], f))},${Math.round(lerp(p[1], q[1], f))},${Math.round(lerp(p[2], q[2], f))})`;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '').trim();
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
