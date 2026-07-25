/* =========================================================================
   Lesson — How a machine finds the widest street.

   Support vector machines. The twist from the boundary lesson: many lines
   separate two clean groups, so "which one?" needs a new idea — the one with
   the most clearance. And the punchline: only a handful of points decide it.

     1  two crops, and the embarrassment of choice — many lines separate them
     2  turn a line by hand; every angle works, but the gap keeps changing
     3  reveal the street: the widest gap, its edges resting on a few points
     4  the machine sweeps every angle and keeps the widest — a peak to climb
     5  support vectors: move an inside crop, nothing happens; move an edge one,
        everything does.
   ========================================================================= */

import { Plot, ticks, clamp } from '../src/core/plot.js';
import {
  makeField, streetAt, widthAt, bestLine, supportVectors, signedDist, split, CROPS,
} from '../src/ml/svm.js';
import { Lesson, initTheme, $, slider } from '../src/lesson/shell.js';
import { loopDiagram } from '../src/core/diagram.js';
import { attach } from '../src/lesson/teach.js';

/* --- constants ------------------------------------------------------------ */

const DOM = [0, 10];
let field = makeField();
let BEST = bestLine(field);

const canvas = $('#canvas');
const wrap = $('#canvasWrap');
const tipEl = $('#tip');
const plot = new Plot(canvas);

const state = {
  theta: (60 / 180) * Math.PI,   // user's line angle
  sweeping: false,
  sweepTheta: 0,
  sweepBest: { margin: -1, theta: 0 },
  allowDrag: false,
  dragId: null,
  hovered: null,
};

/* --- helpers -------------------------------------------------------------- */

const COL = (t, y2) => (y2 === -1 ? t.d3 : t.d2);
const FILL = (t, y2) => (y2 === -1 ? t.d3soft : t.d2soft);
const fmt2 = (v) => v.toFixed(2);

function setLegend(items) {
  $('#legend').innerHTML = items.map((it) => {
    const cls = it.kind === 'line' ? 'legend__swatch legend__swatch--line'
      : it.kind === 'dash' ? 'legend__swatch legend__swatch--dash'
      : 'legend__swatch';
    return `<span class="legend__item"><span class="${cls}" style="--_c:${it.color}"></span>${it.label}</span>`;
  }).join('');
}
function describe(t) { canvas.setAttribute('aria-label', t); }
function setNote(html) { const el = $('#note'); el.hidden = !html; if (html) el.innerHTML = `<span>${html}</span>`; }
function showTip(px, py, html) { tipEl.innerHTML = html; tipEl.style.left = `${px}px`; tipEl.style.top = `${py}px`; tipEl.dataset.show = '1'; }
const hideTip = () => { tipEl.dataset.show = '0'; };

function frameField(pl) {
  pl.frame({
    xTicks: ticks(0, 10, 2), yTicks: ticks(0, 10, 2),
    xLabel: 'Leaf width (mm)', yLabel: 'Leaf height (mm)',
  });
}

function drawCrops(pl, { faded = new Set(), ringed = new Set() } = {}) {
  const t = pl.t;
  for (const p of field) {
    const hovered = state.hovered && p.id === state.hovered.id;
    if (ringed.has(p.id)) {
      pl.ctx.save();
      pl.ctx.beginPath();
      pl.ctx.arc(pl.sx(p.x), pl.sy(p.y), 10, 0, Math.PI * 2);
      pl.ctx.strokeStyle = COL(t, p.y2);
      pl.ctx.lineWidth = 2.5;
      pl.ctx.stroke();
      pl.ctx.restore();
    }
    pl.dot(p.x, p.y, { r: hovered ? 6.5 : 5, fill: COL(t, p.y2), alpha: faded.has(p.id) ? 0.35 : 1 });
  }
}

/**
 * Draw a street: the centre line plus the two kerbs, with the space between
 * shaded. `line` carries nx, ny, b and (optionally) margin.
 */
function drawStreet(pl, line, { showKerbs = true, dim = false } = {}) {
  const t = pl.t;
  const { nx, ny, b } = line;
  const norm = Math.hypot(nx, ny) || 1e-9;
  // a direction along the line
  const dx = -ny / norm, dy = nx / norm;
  const cx = 5, cy = 5;
  // centre point on the line closest to (5,5)
  const s = -(nx * cx + ny * cy + b) / (norm * norm);
  const mid = { x: cx + nx * s, y: cy + ny * s };
  const L = 16;
  const p1 = { x: mid.x - dx * L, y: mid.y - dy * L };
  const p2 = { x: mid.x + dx * L, y: mid.y + dy * L };

  pl.clip(() => {
    // shaded street
    if (showKerbs && line.margin > 0) {
      const off = line.margin;
      const ox = (nx / norm) * off, oy = (ny / norm) * off;
      pl.ctx.save();
      pl.ctx.beginPath();
      pl.ctx.moveTo(pl.sx(p1.x - ox), pl.sy(p1.y - oy));
      pl.ctx.lineTo(pl.sx(p2.x - ox), pl.sy(p2.y - oy));
      pl.ctx.lineTo(pl.sx(p2.x + ox), pl.sy(p2.y + oy));
      pl.ctx.lineTo(pl.sx(p1.x + ox), pl.sy(p1.y + oy));
      pl.ctx.closePath();
      pl.ctx.fillStyle = t.d1soft;
      pl.ctx.globalAlpha = dim ? 0.5 : 1;
      pl.ctx.fill();
      pl.ctx.restore();
      // kerbs
      pl.segment(p1.x - ox, p1.y - oy, p2.x - ox, p2.y - oy, { color: t.d1, width: 1.5, dash: [6, 5], alpha: 0.8 });
      pl.segment(p1.x + ox, p1.y + oy, p2.x + ox, p2.y + oy, { color: t.d1, width: 1.5, dash: [6, 5], alpha: 0.8 });
    }
    // centre line
    pl.segment(p1.x, p1.y, p2.x, p2.y, { color: dim ? t.muted : t.ink, width: 2.5, alpha: dim ? 0.5 : 1 });
  });
}

/* =========================================================================
   Act 1 — many lines separate them
   ========================================================================= */

function drawChoice() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;
  frameField(pl);

  // a fan of valid separating lines, to make "which one?" vivid
  for (const dth of [-0.5, -0.25, 0, 0.25, 0.5]) {
    const s = streetAt(field, BEST.theta + dth);
    if (s.separates) drawStreet(pl, { ...s, margin: 0 }, { showKerbs: false, dim: true });
  }
  drawCrops(pl);

  setLegend([
    { label: `${CROPS[0]}`, color: t.d3 },
    { label: `${CROPS[1]}`, color: t.d2 },
    { label: 'Some lines that separate them', color: t.muted, kind: 'line' },
  ]);
  setNote(`Two crops, cleanly apart. The trouble isn't finding <em>a</em> dividing line — it's that <b>lots</b> of lines work. Which one should we trust for the next unlabelled leaf?`);
  describe(`Two well-separated crops with several possible dividing lines drawn between them.`);
}

/* =========================================================================
   Act 2 — turn a line by hand
   ========================================================================= */

function drawTurn() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;
  frameField(pl);

  const s = streetAt(field, state.theta);
  drawStreet(pl, s, { showKerbs: true });
  drawCrops(pl);

  // width tiles
  $('#widthVal').textContent = s.separates ? fmt2(s.margin * 2) : '—';
  $('#bestWidthVal').textContent = fmt2(BEST.margin * 2);
  $('#sepVal').textContent = s.separates ? 'Yes' : 'No';
  $('#sepVal').style.color = s.separates ? t.d3 : t.d2;

  setLegend([
    { label: `${CROPS[0]}`, color: t.d3 },
    { label: `${CROPS[1]}`, color: t.d2 },
    { label: 'The street', color: t.d1, kind: 'dash' },
  ]);
  setNote(s.separates
    ? `This angle keeps the crops apart, and leaves a street <b>${fmt2(s.margin * 2)}</b> wide. Turn the dial — some angles give a broad avenue, others a tight alley. The widest is <b>${fmt2(BEST.margin * 2)}</b>.`
    : `At this angle the crops spill across the line — it doesn't separate them at all. Turn until it does.`);
  describe(`A dividing line at ${Math.round(state.theta / Math.PI * 180)} degrees${s.separates ? `, leaving a street ${fmt2(s.margin * 2)} wide` : ', which does not separate the crops'}.`);
}

/* =========================================================================
   Act 3 — the widest street + support vectors
   ========================================================================= */

function drawStreetReveal() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;
  frameField(pl);

  drawStreet(pl, BEST, { showKerbs: true });
  const sv = supportVectors(BEST, field);
  const svIds = new Set(sv.map((p) => p.id));
  drawCrops(pl, { ringed: svIds });

  // draw the props holding the kerbs
  for (const p of sv) {
    const d = signedDist(BEST, p);
    const norm = Math.hypot(BEST.nx, BEST.ny);
    const foot = { x: p.x - (BEST.nx / norm) * d, y: p.y - (BEST.ny / norm) * d };
    pl.segment(p.x, p.y, foot.x, foot.y, { color: t.ink, width: 1.5, dash: [3, 3], alpha: 0.6 });
  }

  setLegend([
    { label: `${CROPS[0]}`, color: t.d3 },
    { label: `${CROPS[1]}`, color: t.d2 },
    { label: 'Widest street', color: t.d1, kind: 'dash' },
    { label: 'Support vectors', color: t.ink },
  ]);
  setNote(`Here it is: the <b>widest street</b> that fits. Its kerbs press right up against a few crops — the <b>support vectors</b> (ringed). They alone hold the street in place. Every other crop could wander and nothing would change.`);
  describe(`The maximum-margin line, with its street edges resting on ${sv.length} support vectors.`);
}

/* =========================================================================
   Act 4 — the machine sweeps the angle
   ========================================================================= */

function drawSweep() {
  plot.measure();
  const t = plot.t;
  const gap = 26;
  const half = (plot.w - gap) / 2;

  // left: the field with the current swept line
  const fp = new Plot(canvas, { margin: { t: 26, r: 14, b: 46, l: 52 } });
  fp.w = half; fp.h = plot.h; fp.t = t;
  fp.setDomain(DOM, DOM);
  plot.clear();
  fp.frame({ xTicks: ticks(0, 10, 2), yTicks: ticks(0, 10, 2), xLabel: 'Leaf width (mm)', yLabel: 'Leaf height (mm)' });

  const shown = state.sweeping ? state.sweepTheta : state.sweepBest.theta;
  const s = streetAt(field, shown);
  // faint best-so-far
  if (state.sweepBest.margin > 0) {
    drawStreet(fp, streetAt(field, state.sweepBest.theta), { showKerbs: true, dim: true });
  }
  drawStreet(fp, s, { showKerbs: s.separates });
  for (const p of field) fp.dot(p.x, p.y, { r: 4, fill: COL(t, p.y2) });
  fp.label('turning the street…', fp.left, fp.top - 12, { color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false });

  // right: street width vs angle, with the peak
  const wp = new Plot(canvas, { margin: { t: 26, r: 22, b: 46, l: half + gap + 54 } });
  wp.w = plot.w; wp.h = plot.h; wp.t = t;
  const yMax = Math.ceil(BEST.margin * 2 * 1.15 * 4) / 4;
  wp.setDomain([0, 180], [0, yMax]);
  wp.frame({ xTicks: ticks(0, 180, 45), yTicks: ticks(0, yMax, yMax / 3), xLabel: 'Street angle (°)', yLabel: 'Street width', xFmt: (v) => `${v}`, yFmt: fmt2 });

  const curve = [];
  for (let a = 0; a <= 180; a += 1.5) curve.push([a, widthAt(field, (a / 180) * Math.PI) * 2]);
  // fill under
  wp.ctx.save();
  wp.ctx.beginPath();
  wp.ctx.moveTo(wp.sx(0), wp.sy(0));
  for (const [a, w] of curve) wp.ctx.lineTo(wp.sx(a), wp.sy(w));
  wp.ctx.lineTo(wp.sx(180), wp.sy(0));
  wp.ctx.closePath();
  wp.ctx.fillStyle = t.d1soft; wp.ctx.fill();
  wp.ctx.restore();
  wp.path(curve, { color: t.muted, width: 2 });

  // peak marker
  wp.dot(BEST.theta / Math.PI * 180, BEST.margin * 2, { r: 5, fill: t.d3 });
  wp.label('widest', BEST.theta / Math.PI * 180, BEST.margin * 2, { color: t.d3, dx: 8, dy: -12, size: 12 });

  // current swept position
  const shownDeg = shown / Math.PI * 180;
  wp.dot(shownDeg, s.separates ? s.margin * 2 : 0, { r: 6, fill: t.d1 });

  setLegend([
    { label: `${CROPS[0]}`, color: t.d3 },
    { label: `${CROPS[1]}`, color: t.d2 },
    { label: 'Street width', color: t.muted, kind: 'line' },
    { label: 'Widest', color: t.d3 },
  ]);
  const best2 = state.sweepBest.margin > 0 ? fmt2(state.sweepBest.margin * 2) : '—';
  setNote(state.sweeping
    ? `Turning… widest gap so far is <b>${best2}</b>. The machine just keeps the best angle it has seen.`
    : state.sweepBest.margin > 0
      ? `Done. The widest street is <b>${fmt2(state.sweepBest.margin * 2)}</b> wide — the peak of the curve on the right. That single best angle is the machine's answer.`
      : `Press <b>Sweep every angle</b>. The machine turns the street a full half-circle and keeps whichever angle gave the widest gap.`);
  describe(`Left: the street at ${Math.round(shownDeg)} degrees. Right: street width against angle, peaking at the widest street.`);
}

/* =========================================================================
   Act 5 — support vectors are all that matter
   ========================================================================= */

function drawSupport() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;
  frameField(pl);

  const live = bestLine(field);
  drawStreet(pl, live, { showKerbs: true });
  const sv = supportVectors(live, field);
  const svIds = new Set(sv.map((p) => p.id));
  drawCrops(pl, { ringed: svIds });

  $('#svCount').textContent = sv.length;
  $('#svTotal').textContent = field.length;

  setLegend([
    { label: `${CROPS[0]}`, color: t.d3 },
    { label: `${CROPS[1]}`, color: t.d2 },
    { label: 'Widest street', color: t.d1, kind: 'dash' },
    { label: 'Support vectors', color: t.ink },
  ]);
  setNote(state.allowDrag
    ? `Now drag any crop. A plain one in the middle of its field? The street doesn't budge. A ringed one on the edge? The whole street jumps. <b>Only the support vectors matter</b> — that's the machine's secret to being so lean.`
    : `Just <b>${sv.length} crops</b> out of ${field.length} hold this street in place. Tick the box and drag a crop to feel it: the inside ones are dead weight; the edge ones are everything.`);
  describe(`The final street rests on ${sv.length} support vectors out of ${field.length} crops.`);
}

/* =========================================================================
   Act 6 — what it was, and why it is so lean
   ========================================================================= */

let recapClock = 0;
let recapRunning = false;

function drawRecap() {
  const pl = plot.measure();
  pl.clear();
  loopDiagram(pl, [
    { k: 'Try', v: 'point the street in some direction' },
    { k: 'Measure', v: 'how much clear room does it leave?' },
    { k: 'Keep', v: 'hold on to the widest seen so far' },
  ], {
    active: Math.floor(recapClock / 900) % 3,
    accent: pl.t.d1,
    returnLabel: 'and again, at every angle',
    caption: 'The same three boxes as lesson 1 — but this one climbs to a peak instead of walking down to a valley.',
  });
  setLegend([{ label: 'A search, not a descent', color: pl.t.d1, kind: 'line' }]);
  setNote('Making the street <b>as wide as possible</b> and making wrongness <b>as small as possible</b> are the same sentence pointed in opposite directions.');
  describe('A three-stage search loop: try an angle, measure the clearance, keep the widest.');
}

/* =========================================================================
   Checkpoints
   ========================================================================= */

/** A tiny field with a single dividing line at the given angle. */
function miniField(pl, theta) {
  const t = pl.t;
  pl.setDomain(DOM, DOM);
  const s = streetAt(field, theta);
  pl.clip(() => drawStreet(pl, { ...s, margin: 0 }, { showKerbs: false }));
  for (const p of field) pl.dot(p.x, p.y, { r: 2.2, fill: COL(t, p.y2), ring: false });
}

const CHECKS = {
  which: {
    id: 'svm-which-line',
    kind: 'predict',
    question: 'All three of these lines separate the crops perfectly. Which one would you trust?',
    note: 'Every one of them gets all 30 plants on the right side. Something else has to decide between them.',
    options: [
      {
        label: 'The one hugging the green crop',
        paint: (pl) => miniField(pl, BEST.theta - 0.42),
        why: `It scores <b>100%</b> on every plant you have — and it passes within a whisker of a green
              one. A new leaf only slightly different from that plant lands on the wrong side. Being
              perfect on what you already have is not the same as being safe on what comes next.`,
      },
      {
        label: 'The one down the middle of the gap',
        ok: true,
        paint: (pl) => miniField(pl, BEST.theta),
        why: `The one that keeps its distance from <em>both</em> crops. All three are equally right about
              the plants in front of them, so the tie-breaker has to be about the plants you have not
              seen yet — and clearance is exactly that. This single idea is the whole lesson.`,
      },
      {
        label: 'The one hugging the orange crop',
        paint: (pl) => miniField(pl, BEST.theta + 0.42),
        why: `Same objection, mirrored: it grazes an orange plant. Ask yourself what happens to a new
              leaf that lands just inside that gap — this line calls it green, and it had almost no
              reason to.`,
      },
    ],
  },

  peak: {
    id: 'svm-peak',
    kind: 'predict',
    question: 'Turn the street through every angle and plot how wide it is. What shape comes out?',
    note: 'Across the bottom: the angle. Up the side: the clearance that angle leaves.',
    options: [
      {
        label: 'A valley — walk down to the bottom',
        paint: (pl) => {
          pl.setDomain([0, 1], [0, 1]);
          const pts = [];
          for (let i = 0; i <= 60; i++) pts.push([i / 60, 0.12 + 2.6 * (i / 60 - 0.45) ** 2]);
          pl.path(pts, { color: pl.t.muted, width: 2.5 });
        },
        why: `A valley is what you get when the number means <em>wrongness</em> and small is good. Here
              the number is <b>elbow room</b>, and more of it is better — so the good answer sits at the
              top, not the bottom.`,
      },
      {
        label: 'A peak — climb up to the top',
        ok: true,
        paint: (pl) => {
          pl.setDomain([0, 1], [0, 1]);
          const pts = [];
          for (let i = 0; i <= 60; i++) pts.push([i / 60, Math.max(0.05, 0.92 - 3.4 * (i / 60 - 0.5) ** 2)]);
          pl.path(pts, { color: pl.t.muted, width: 2.5 });
        },
        why: `Turn too far either way and the street gets pinched. One angle in the middle leaves the most
              room, and that is the <b>peak</b>. Notice this is lesson 1's valley turned upside down —
              "make the wrongness small" and "make the gap big" are the same instruction.`,
      },
      {
        label: 'Flat — the angle makes no difference',
        paint: (pl) => {
          pl.setDomain([0, 1], [0, 1]);
          pl.path([[0, 0.5], [1, 0.5]], { color: pl.t.muted, width: 2.5 });
        },
        why: `Go back a step and turn the dial yourself. The street visibly pinches and widens as you
              swing it — some angles barely squeeze through, others sail down a wide avenue. The angle
              matters enormously; that is the only reason there is anything to search for.`,
      },
    ],
  },

  support: {
    id: 'svm-support',
    kind: 'check',
    question: 'Tick the box and drag a plant buried deep inside its own group. What happens to the street?',
    note: 'Do it before you answer — the box is in the panel on the right. Move one that is nowhere near the kerbs.',
    options: [
      {
        label: 'It shifts a little',
        why: `Have another go and watch closely — it does not move by a single pixel. The street's
              position is fixed by the <em>nearest</em> plant on each side. A plant that is not nearest
              has no vote at all, no matter how far you drag it.`,
      },
      {
        label: 'Absolutely nothing',
        ok: true,
        why: `Nothing whatsoever. You could <b>delete every plant in the middle</b> and get back the
              identical street. Only the handful resting on the kerbs — the <b>support vectors</b> —
              have any say. Now drag one of <em>those</em>, and watch the whole thing swing.`,
      },
      {
        label: 'It flips to a completely new angle',
        why: `That happens when you move a plant <em>on the kerb</em>, and it is worth doing next. Move an
              interior plant, though, and the street sits perfectly still — it never depended on that
              plant in the first place.`,
      },
    ],
  },

  lean: {
    id: 'svm-lean',
    kind: 'recall',
    question: 'An SVM learns to sort 100,000 emails. To rebuild that exact boundary later, how many must it keep?',
    options: [
      {
        label: 'All 100,000 — it needs the whole set',
        why: `That is what the <em>previous</em> lesson's model needed — k-NN keeps everything, which is
              why answering gets so expensive. An SVM is the opposite: once the street is found, almost
              every email is revealed to have been irrelevant.`,
      },
      {
        label: 'Only the handful sitting on the kerbs',
        ok: true,
        why: `Often a few dozen out of a hundred thousand. Everything else was <b>dead weight</b> — you
              proved it yourself by dragging one and watching nothing happen. That is why SVMs stayed
              the tool of choice for so long: tiny to store, quick to answer, and they tell you exactly
              which examples were the hard ones.`,
      },
      {
        label: 'About half of them',
        why: `Nothing special happens at half. The number it keeps is decided by the <em>shape</em> of the
              problem, not its size — just the plants that touch the kerbs, however big the field gets.`,
      },
    ],
  },
};

/* =========================================================================
   Steps
   ========================================================================= */

const steps = [
  {
    label: 'Too many lines',
    title: 'Which dividing line?',
    sub: 'Two crops, clearly apart. The problem is that many lines separate them equally well.',
    brief: 'Spoilt for choice',
    beats: [
      {
        text: `<p>Two crops — <b style="color:var(--data-3)">${CROPS[0]}</b> and <b style="color:var(--data-2)">${CROPS[1]}</b> — measured by two leaf sizes. This time they are <em>cleanly</em> separated.</p>
               <p>Last lesson the hard part was finding a boundary at all. Here the hard part is the opposite.</p>`,
        panels: [],
      },
      {
        head: 'Too many right answers',
        text: `<p>Every one of those lines separates the crops perfectly. All of them score <b>100%</b> on the plants in front of us.</p>
               <p>So "get them all right" cannot choose between them. We need a different reason to prefer one.</p>`,
        panels: [],
      },
      {
        ask: CHECKS.which,
        text: `<p>Trust your instinct here — you almost certainly already know the answer. The interesting part is <em>why</em>.</p>`,
        panels: [],
      },
    ],
    draw: drawChoice,
  },

  {
    label: 'Turn the line',
    title: 'Mind the gap',
    sub: 'Turn a line by hand. Every separating angle is valid — but the clearance changes a lot.',
    brief: 'How much room?',
    beats: [
      {
        text: `<p>Turn the line with the dial. As long as the crops stay on opposite sides, it is a valid divider.</p>
               <p>But watch the shaded <b>street</b> — the empty space either side of it.</p>`,
        panels: ['line', 'width'],
      },
      {
        head: 'Find the widest yourself',
        text: `<p>Some angles leave a broad avenue; others squeak past a leaf with almost nothing to spare.</p>
               <p><b>Hunt for the widest street you can find</b>, and keep an eye on the number as you go. The best possible is <b>${fmt2(BEST.margin * 2)}</b>.</p>
               <p>A wide street means a new leaf can be a bit unusual and still land on the right side. That is the whole argument.</p>`,
        panels: ['line', 'width'],
        cta: 'Show me the best →',
      },
    ],
    draw: drawTurn,
  },

  {
    label: 'The widest',
    title: 'The widest street wins',
    sub: 'Of every separating line, one leaves the most room. Its kerbs rest on just a few crops.',
    brief: 'Maximum clearance',
    beats: [
      {
        text: `<p>This is the champion: the <b>widest street</b> that still keeps the crops apart, sitting as far from both sides as it possibly can.</p>`,
        panels: ['width'],
        enter() {
          BEST = bestLine(field);
          $('#bestWidthVal').textContent = fmt2(BEST.margin * 2);
          $('#widthVal').textContent = fmt2(BEST.margin * 2);
          $('#sepVal').textContent = 'Yes';
        },
      },
      {
        head: 'Look at what touches the kerbs',
        text: `<p>Only a <b>few crops</b> — the ringed ones. These are the <b>support vectors</b>.</p>
               <p>They are the plants nearest the divide, and they alone decide where it goes. Everything else in that field is, as far as the boundary is concerned, irrelevant.</p>
               <p>That claim sounds too strong. You will test it yourself shortly.</p>`,
        panels: ['width'],
        cta: 'How does it find it? →',
      },
    ],
    draw: drawStreetReveal,
  },

  {
    label: 'The machine',
    title: 'Sweep for the widest',
    sub: 'The machine turns the street through every angle and keeps the biggest gap.',
    brief: 'How it searches',
    beats: [
      {
        text: `<p>How does a machine find it? <b>Not</b> by a downhill walk this time.</p>
               <p>It simply tries every angle the street could face, measures the gap each one leaves, and remembers the widest. Crude, slow, and it cannot possibly fail.</p>`,
        panels: [],
        enter() { resetSweep(); },
      },
      {
        ask: CHECKS.peak,
        text: `<p>Plot that measurement — clearance up the side, angle along the bottom — and a shape appears. You have seen its cousin before.</p>`,
        panels: [],
      },
      {
        head: 'Watch it sweep',
        text: `<p>Press <b>Sweep every angle</b>. The street rotates while the graph alongside fills in, and the best-so-far is held.</p>
               <p>Nothing here can overshoot or get stuck, because nothing is being nudged. It looks everywhere and keeps the winner.</p>`,
        panels: ['sweep'],
        cta: 'What actually matters →',
      },
    ],
    exit() { state.sweeping = false; },
    draw: drawSweep,
  },

  {
    label: 'What matters',
    title: 'Only a few crops matter',
    sub: 'Move a crop in the middle: nothing. Move one on the edge: everything shifts.',
    brief: 'The support vectors',
    beats: [
      {
        text: `<p>Time to test that claim. Dragging is switched on: <b>grab any plant and move it.</b></p>
               <p>Start with one buried deep inside its own group, far from the street. Drag it about properly.</p>`,
        panels: ['sv'],
        enter() {
          state.allowDrag = true;
          $('#svDrag').checked = true;
          field = makeField();
          BEST = bestLine(field);
        },
      },
      {
        ask: CHECKS.support,
        text: `<p>Do it before you answer — the result is more convincing when you have caused it.</p>`,
        panels: ['sv'],
      },
      {
        head: 'Now move one on the kerb',
        text: `<p>Drag a <b>ringed</b> plant instead, and the whole street swings.</p>
               <p>So the boundary is pinned by a handful of points and completely indifferent to the rest. To remember it, you only need to remember them.</p>`,
        panels: ['sv'],
        cta: 'So what was that? →',
      },
    ],
    draw: drawSupport,
  },

  {
    label: 'So what?',
    title: 'Room to be wrong',
    sub: 'The best boundary is the one that leaves the most room for what you have not seen.',
    brief: 'What you actually learned',
    beats: [
      {
        text: `<p>Every line in act 1 was perfect on the data. Choosing between them meant asking a harder question: <em>which will still be right about a leaf I have never met?</em></p>
               <p>That question — how well does this hold up on new data — is what the whole field is actually about.</p>`,
      },
      {
        head: 'The words the grown-ups use',
        text: `<p>Note the shape of the search: the same three boxes as lesson 1, climbing to a peak instead of walking down to a valley.</p>`,
        panels: ['recap'],
      },
      {
        ask: CHECKS.lean,
        text: `<p>One last question, about what an SVM actually has to carry around with it once the searching is over.</p>`,
        panels: ['recap'],
        answered() { lesson.progress.finish(); },
      },
    ],
    enter() {
      recapRunning = true;
      const t0 = performance.now();
      lesson.animateWhile(() => {
        recapClock = performance.now() - t0;
        return recapRunning && lesson.step?.label === 'So what?';
      });
    },
    exit() { recapRunning = false; },
    draw: drawRecap,
  },
];

/* =========================================================================
   Wiring
   ========================================================================= */

const els = {
  steps: $('#steps'), prev: $('#prevBtn'), next: $('#nextBtn'), progress: $('#progress'),
  stageTitle: $('#stageTitle'), stageSub: $('#stageSub'),
  briefHead: $('#briefHead'), briefBody: $('#briefBody'),
  advance: $('#advanceBtn'), beatDots: $('#beatDots'),
  canvasWrap: wrap,
  panels: { line: $('#panel-line'), width: $('#panel-width'), sweep: $('#panel-sweep'), sv: $('#panel-sv'), recap: $('#panel-recap') },
};

const lesson = new Lesson({ steps, els });

const { ask } = attach(lesson, {
  id: 'support-vector-machine',
  total: 4,
  recap: {
    terms: [
      ['Finding the widest street', 'Support vector machine', 'the best tool there was, before deep learning'],
      ['Half the street’s width', 'The margin', 'the room the boundary leaves on each side'],
      ['The crops on the kerbs', 'Support vectors', 'the only examples that actually matter'],
      ['Room for a leaf you have not seen', 'Generalisation', 'the thing every model is really judged on'],
      ['Trying every angle', 'A search', 'no downhill walk here — it cannot overshoot or get stuck'],
    ],
    uses: [
      '<b>Handwriting recognition</b> on posted letters, for two decades',
      '<b>Face detection</b> in cameras, before phones had neural networks',
      '<b>Sorting genes</b> in medical research, where examples are few and precious',
      '<b>Any problem with little data</b> — SVMs stay strong where big models starve',
    ],
  },
});

const theme = initTheme($('#themeBtn'));
theme.onChange(() => { ask.repaint(); lesson.invalidate(); });

/* --- act 2: turn the line ------------------------------------------------- */

slider($('#ang'), $('#angVal'), String, (v) => { state.theta = (v / 180) * Math.PI; lesson.invalidate(); });
$('#lineBest').addEventListener('click', () => {
  const from = state.theta, to = BEST.theta;
  const t0 = performance.now();
  const run = (now) => {
    const k = clamp((now - t0) / 700, 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const th = from + (to - from) * e;
    $('#ang').value = Math.round(th / Math.PI * 180);
    $('#angVal').textContent = Math.round(th / Math.PI * 180);
    state.theta = th; lesson.invalidate();
    if (k < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
});

/* --- act 4: the sweep ----------------------------------------------------- */

function resetSweep() {
  state.sweeping = false;
  state.sweepTheta = 0;
  state.sweepBest = { margin: -1, theta: 0 };
  $('#sweepBtn').textContent = 'Sweep every angle';
  lesson.invalidate();
}
function considerSweep(th) {
  const w = widthAt(field, th);
  if (w > state.sweepBest.margin) state.sweepBest = { margin: w, theta: th };
}
$('#sweepBtn').addEventListener('click', () => {
  if (state.sweeping) return;
  if (state.sweepBest.margin > 0) resetSweep();
  state.sweeping = true;
  $('#sweepBtn').textContent = 'Sweeping…';
  const dur = 2600, t0 = performance.now();
  const run = (now) => {
    const k = clamp((now - t0) / dur, 0, 1);
    state.sweepTheta = k * Math.PI;
    considerSweep(state.sweepTheta);
    lesson.invalidate();
    if (k < 1) requestAnimationFrame(run);
    else { state.sweeping = false; $('#sweepBtn').textContent = 'Sweep again'; lesson.invalidate(); }
  };
  requestAnimationFrame(run);
});
$('#sweepStep').addEventListener('click', () => {
  state.sweeping = false;
  state.sweepTheta = (state.sweepTheta + Math.PI / 18) % Math.PI;
  considerSweep(state.sweepTheta);
  lesson.invalidate();
});
$('#sweepReset').addEventListener('click', resetSweep);

/* --- act 5: drag crops ---------------------------------------------------- */

$('#svDrag').addEventListener('change', (e) => { state.allowDrag = e.target.checked; lesson.invalidate(); });

/* --- pointer -------------------------------------------------------------- */

function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }

canvas.addEventListener('pointerdown', (e) => {
  if (!(lesson.step.label === 'What matters' && state.allowDrag)) return;
  const { x, y } = localPos(e);
  let near = null, best = 20 * 20;
  for (const p of field) {
    const d = (plot.sx(p.x) - x) ** 2 + (plot.sy(p.y) - y) ** 2;
    if (d < best) { best = d; near = p; }
  }
  if (near) { state.dragId = near.id; canvas.setPointerCapture(e.pointerId); lesson.invalidate(); }
});
canvas.addEventListener('pointermove', (e) => {
  const { x, y } = localPos(e);
  if (state.dragId != null) {
    const nx = clamp(plot.ix(x), DOM[0], DOM[1]);
    const ny = clamp(plot.iy(y), DOM[0], DOM[1]);
    field = field.map((p) => (p.id === state.dragId ? { ...p, x: nx, y: ny } : p));
    BEST = bestLine(field);
    lesson.invalidate();
    return;
  }
  // hover tooltip
  if (lesson.step.panels?.includes('sweep')) { hideTip(); return; }
  let near = null, best = 24 * 24;
  for (const p of field) {
    const d = (plot.sx(p.x) - x) ** 2 + (plot.sy(p.y) - y) ** 2;
    if (d < best) { best = d; near = p; }
  }
  if (near !== state.hovered) { state.hovered = near; lesson.invalidate(); }
  if (near) showTip(plot.sx(near.x), plot.sy(near.y), `<strong>${CROPS[near.y2 === -1 ? 0 : 1]}</strong><span>${near.x.toFixed(1)} × ${near.y.toFixed(1)} mm</span>`);
  else hideTip();
});
const endDrag = () => { if (state.dragId != null) { state.dragId = null; lesson.invalidate(); } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { state.hovered = null; hideTip(); lesson.invalidate(); });

/* --- table ---------------------------------------------------------------- */

$('#tableBtn').addEventListener('click', () => {
  const tv = $('#tableView');
  const open = tv.hidden;
  if (open) {
    const line = bestLine(field);
    const svIds = new Set(supportVectors(line, field).map((p) => p.id));
    const rows = field.map((p) => `<tr${svIds.has(p.id) ? ' style="font-weight:600"' : ''}>
        <td>${CROPS[p.y2 === -1 ? 0 : 1]}</td><td>${p.x.toFixed(1)}</td><td>${p.y.toFixed(1)}</td>
        <td>${Math.abs(signedDist(line, p)).toFixed(2)}</td><td>${svIds.has(p.id) ? '★ support' : ''}</td></tr>`).join('');
    $('#tableView').innerHTML = `<table><thead><tr><th>Crop</th><th>Width</th><th>Height</th><th>Dist. to line</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  tv.hidden = !open;
  $('#tableBtn').setAttribute('aria-expanded', String(open));
  $('#tableBtn').textContent = open ? 'Hide the numbers' : 'Show the numbers';
});

/* --- go ------------------------------------------------------------------- */

lesson.start();
