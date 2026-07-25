/* =========================================================================
   Shared 2-D point generators for the classification lessons (k-NN, SVM,
   neural network). Pure, deterministic, no DOM.

   Everything lives in a 0–10 × 0–10 square so the axes read as tangible
   measurements (millimetres, say) rather than abstract units, matching the
   0–10 "hours" feel of the first two lessons.

   Two shapes, chosen for what each downstream lesson needs to teach:
     • blobs — two clusters with a tunable gap. A straight boundary works, so
       it suits k-NN (neighbours vote) and SVM (how wide is the gap?).
     • rings — one class in a central disc, the other in a surrounding ring.
       No straight line can separate these, which is the entire reason the
       neural-network lesson exists.
   ========================================================================= */

export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function gauss(rand) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Two Gaussian clusters, labelled 0 and 1.
 * @param {number} gap   distance between the cluster centres; larger = easier
 * @param {number} spread cluster radius (standard deviation)
 */
export function blobs({ n = 40, seed = 3, gap = 4.2, spread = 1.15 } = {}) {
  const rand = rng(seed);
  const cx = 5, cy = 5;
  const dx = gap / 2, dy = gap / 3.4;   // offset on a slight diagonal
  const centres = [
    { x: cx - dx, y: cy - dy, label: 0 },
    { x: cx + dx, y: cy + dy, label: 1 },
  ];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const c = centres[i % 2];
    pts.push({
      id: i,
      x: +clamp(c.x + gauss(rand) * spread, 0.4, 9.6).toFixed(2),
      y: +clamp(c.y + gauss(rand) * spread, 0.4, 9.6).toFixed(2),
      label: c.label,
    });
  }
  return pts.map((p, i) => ({ ...p, id: i }));
}

/**
 * A central disc of one class ringed by the other — not linearly separable.
 * @param {number} innerR radius under which a point is class 1 (inside)
 * @param {number} ringR  mean radius of the outer class-0 ring
 */
export function rings({ n = 60, seed = 11, innerR = 2.2, ringR = 3.8 } = {}) {
  const rand = rng(seed);
  const cx = 5, cy = 5;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const inside = i % 2 === 0;
    const ang = rand() * Math.PI * 2;
    const r = inside
      ? rand() * innerR * 0.9                     // filled disc
      : ringR + gauss(rand) * 0.6;                // fuzzy ring
    pts.push({
      id: i,
      x: +clamp(cx + Math.cos(ang) * r, 0.4, 9.6).toFixed(2),
      y: +clamp(cy + Math.sin(ang) * r, 0.4, 9.6).toFixed(2),
      label: inside ? 1 : 0,
    });
  }
  return pts.map((p, i) => ({ ...p, id: i }));
}

/* --- shared helpers ------------------------------------------------------- */

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Split a labelled set into train/test by a deterministic stride. */
export function split(pts, { testEvery = 4 } = {}) {
  const train = [], test = [];
  pts.forEach((p, i) => (i % testEvery === 0 ? test : train).push(p));
  return { train, test };
}
