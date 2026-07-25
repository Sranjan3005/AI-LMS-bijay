/* =========================================================================
   Support Vector Machine (linear, 2-D) — pure model code. No DOM, no globals.

   The idea the lesson turns on: of all the straight lines that separate two
   groups, prefer the one with the widest empty "street" between them. The
   street's edges rest on a handful of points — the support vectors — and
   only those points matter.

   Rather than fight the numerical fragility of soft-margin SGD on
   unnormalised coordinates, this module finds the widest street the exact,
   explainable way: fix a direction for the street, and the widest street in
   that direction is simply the gap between the two groups projected onto it.
   Sweep the direction, keep the widest gap. That sweep *is* the "machine"
   the lesson watches — a landscape (width vs angle) climbed to its peak,
   echoing the valleys of the earlier lessons.
   ========================================================================= */

import { blobs, split } from './points2d.js';

export { split };

/**
 * Two crops in a field, by leaf width (x) and height (y). Well separated so a
 * real street exists. Labels are +1 / −1, the natural sign for a margin.
 */
export function makeField(opts = {}) {
  return blobs({ n: 30, seed: 5, gap: 5.2, spread: 0.95, ...opts })
    .map((p) => ({ ...p, y2: p.label === 1 ? 1 : -1 }));
}

export const CROPS = ['Barley', 'Wheat'];

/** A line as normal direction (nx, ny) with offset b: nx·x + ny·y + b = 0. */
export const signedDist = (line, p) => {
  const n = Math.hypot(line.nx ?? line.wx, line.ny ?? line.wy) || 1e-9;
  return ((line.nx ?? line.wx) * p.x + (line.ny ?? line.wy) * p.y + line.b) / n;
};

export const correct = (line, pts) => {
  let n = 0;
  for (const p of pts) if (Math.sign(signedDist(line, p)) === p.y2) n++;
  return n;
};

/**
 * The widest street whose centre-line points in direction θ (radians).
 * Project every point onto the unit normal n = (cosθ, sinθ); the −1 class
 * ends at its furthest projection, the +1 class begins at its nearest, and
 * the street is the gap between. A negative gap means this angle fails to
 * separate the classes.
 *
 * @returns {{nx,ny,b, margin, separates, loId, hiId}}
 */
export function streetAt(pts, theta) {
  const nx = Math.cos(theta), ny = Math.sin(theta);
  let loMax = -Infinity, hiMin = Infinity, loId = -1, hiId = -1;
  for (const p of pts) {
    const proj = nx * p.x + ny * p.y;
    if (p.y2 === -1) { if (proj > loMax) { loMax = proj; loId = p.id; } }
    else if (proj < hiMin) { hiMin = proj; hiId = p.id; }
  }
  const gap = hiMin - loMax;
  return {
    nx, ny, b: -(hiMin + loMax) / 2,
    margin: gap / 2,
    separates: gap > 0,
    loId, hiId,
  };
}

/** Half-width of the street at angle θ (0 if this angle can't separate). */
export const widthAt = (pts, theta) => Math.max(0, streetAt(pts, theta).margin);

/**
 * The maximum-margin line, by scanning the orientation. Exact for separable
 * data, stable always.
 * @returns the streetAt result at the best angle, plus that angle.
 */
export function bestLine(pts, { steps = 900 } = {}) {
  let best = null, bestTh = 0;
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI;
    const s = streetAt(pts, th);
    if (!best || s.margin > best.margin) { best = s; bestTh = th; }
  }
  return { ...best, theta: bestTh };
}

/** Distance from each point to the given line's centre, nearest first. */
export function distances(line, pts) {
  return pts.map((p) => ({ p, d: Math.abs(signedDist(line, p)) }))
    .sort((a, b) => a.d - b.d);
}

/**
 * The support vectors of a line: the points sitting on (or nearest to) the
 * street edges. For the max-margin line exactly two or three points tie for
 * closest; `tol` catches ties from floating-point wobble.
 */
export function supportVectors(line, pts, tol = 0.12) {
  const ds = distances(line, pts);
  const m = ds[0].d;
  return ds.filter((s) => s.d - m <= tol).map((s) => s.p);
}
