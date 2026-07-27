/* =========================================================================
   Lesson — How a machine learns by asking the neighbours.

   The odd one out, on purpose. After two lessons of "start wrong, measure the
   wrongness, step downhill", this method has none of that: no line, no knobs,
   no training loop, no valley. It keeps every example and lets the closest
   ones vote. The lesson is built to make that absence loud.

     1  a mystery flower, and the instinct to look at what's nearby
     2  ask the k closest and take a vote — move the flower, watch it flip
     3  paint every point's verdict → the decision map, and how k reshapes it
     4  choosing k: too small copies noise, too big ignores the local shape
     5  the twist — there was never any "training". Compare with lessons 1–2.
   ========================================================================= */

import { Plot, ticks, clamp } from '../src/core/plot.js';
import {
  makeGarden, split, neighbours, classify, looAccuracy, bestK, KINDS,
} from '../src/ml/knn.js';
import { Lesson, initTheme, $, slider } from '../src/lesson/shell.js';
import { loopDiagram } from '../src/core/diagram.js';
import { attach } from '../src/lesson/teach.js';

/* --- constants ------------------------------------------------------------ */

const DOM = [0, 10];
const GARDEN = makeGarden();
const { train, test: HELD } = split(GARDEN);
const BEST_K = bestK(train);

const canvas = $('#canvas');
const wrap = $('#canvasWrap');
const tipEl = $('#tip');
const plot = new Plot(canvas);

const state = {
  q: { x: 5.6, y: 5.2 },   // the mystery flower — starts near the boundary
  k: 3,
  dragging: false,
  hovered: null,
  showRegions: false,
};

/* --- helpers -------------------------------------------------------------- */

const COL = (t, label) => (label === 0 ? t.d3 : t.d2);      // Sunmoss=aqua, Dewbell=orange
const FILL = (t, label) => (label === 0 ? t.d3soft : t.d2soft);

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

function frameGarden(pl) {
  pl.frame({
    xTicks: ticks(0, 10, 2), yTicks: ticks(0, 10, 2),
    xLabel: 'Petal width (mm)', yLabel: 'Petal length (mm)',
  });
}

function drawFlowers(pl, { faded = false } = {}) {
  const t = pl.t;
  for (const p of train) {
    const hovered = state.hovered && p.id === state.hovered.id;
    pl.dot(p.x, p.y, { r: hovered ? 6.5 : 5, fill: COL(t, p.label), alpha: faded ? 0.5 : 1 });
  }
}

/** The mystery flower: a hollow diamond so it never looks like a data point. */
function drawQuery(pl, label = null) {
  const t = pl.t;
  const px = pl.sx(state.q.x), py = pl.sy(state.q.y);
  pl.ctx.save();
  pl.ctx.translate(px, py);
  pl.ctx.rotate(Math.PI / 4);
  pl.ctx.beginPath();
  pl.ctx.rect(-8, -8, 16, 16);
  pl.ctx.fillStyle = label === null ? t.surface : FILL(t, label);
  pl.ctx.fill();
  pl.ctx.lineWidth = state.dragging ? 3.5 : 2.5;
  pl.ctx.strokeStyle = label === null ? t.ink : COL(t, label);
  pl.ctx.stroke();
  pl.ctx.restore();
  pl.label('?', state.q.x, state.q.y, { color: label === null ? t.ink : COL(t, label), size: 13, weight: 700, align: 'center', baseline: 'middle' });
}

/* =========================================================================
   Act 1 — the mystery flower
   ========================================================================= */

function drawAsk() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  frameGarden(pl);
  drawFlowers(pl);
  drawQuery(pl, null);

  setLegend([
    { label: `${KINDS[0]} flower`, color: pl.t.d3 },
    { label: `${KINDS[1]} flower`, color: pl.t.d2 },
    { label: 'Mystery flower', color: pl.t.ink },
  ]);
  setNote(`A new flower turns up. We measured its petals but don't know its kind. Every dot around it <b>is</b> labelled — so the obvious move is to look at what's <b>nearby</b>.`);
  describe(`A garden of ${train.length} flowers of two kinds, plotted by petal width and length, with one unlabelled mystery flower.`);
}

/* =========================================================================
   Acts 2 — the vote
   ========================================================================= */

function drawVote() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  frameGarden(pl);

  const res = classify(train, state.q, state.k);
  const nearIds = new Set(res.near.map((p) => p.id));

  // reach circle around the query
  const rpx = pl.sx(state.q.x) - pl.sx(state.q.x - Math.sqrt(res.reach2));
  pl.ctx.save();
  pl.ctx.beginPath();
  pl.ctx.arc(pl.sx(state.q.x), pl.sy(state.q.y), rpx, 0, Math.PI * 2);
  pl.ctx.strokeStyle = pl.t.muted;
  pl.ctx.lineWidth = 1.5;
  pl.ctx.setLineDash([5, 5]);
  pl.ctx.stroke();
  pl.ctx.restore();

  const t = pl.t;
  // non-neighbours faded, neighbours drawn with a spoke to the query
  for (const p of train) {
    if (nearIds.has(p.id)) continue;
    pl.dot(p.x, p.y, { r: 5, fill: COL(t, p.label), alpha: 0.28 });
  }
  for (const p of res.near) {
    pl.segment(state.q.x, state.q.y, p.x, p.y, { color: COL(t, p.label), width: 1.5, alpha: 0.55 });
  }
  for (const p of res.near) {
    pl.dot(p.x, p.y, { r: 6, fill: COL(t, p.label) });
  }
  drawQuery(pl, res.label);

  // tiles + tally
  $('#verdict').textContent = KINDS[res.label];
  $('#verdict').style.color = res.label === 0 ? t.d3 : t.d2;
  $('#tally').innerHTML = voteBar(res, t);

  setLegend([
    { label: `${KINDS[0]} (${res.votes0})`, color: t.d3 },
    { label: `${KINDS[1]} (${res.votes1})`, color: t.d2 },
    { label: `${state.k} nearest`, color: t.muted, kind: 'dash' },
  ]);
  setNote(`Its <b>${state.k}</b> closest neighbours vote: <b>${res.votes0}</b> ${KINDS[0]} to <b>${res.votes1}</b> ${KINDS[1]}. Majority wins, so we call it <b>${KINDS[res.label]}</b>. Drag the flower across the gap and watch the verdict flip.`);
  describe(`The mystery flower's ${state.k} nearest neighbours vote ${res.votes0} to ${res.votes1}; it is classified as ${KINDS[res.label]}.`);
}

function voteBar(res, t) {
  const total = res.votes0 + res.votes1;
  const w0 = Math.round((res.votes0 / total) * 100);
  return `<div style="display:flex;height:26px;border-radius:7px;overflow:hidden;border:1px solid var(--border)">
      <div style="width:${w0}%;background:${t.d3};min-width:${res.votes0 ? '2px' : '0'}"></div>
      <div style="flex:1;background:${t.d2}"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:var(--step-0);color:var(--ink-secondary)">
      <span>${KINDS[0]}: <b>${res.votes0}</b></span>
      <span>${KINDS[1]}: <b>${res.votes1}</b></span>
    </div>`;
}

/* =========================================================================
   Act 3 — the decision map
   ========================================================================= */

function drawMap() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;

  // paint every location's verdict as a soft region
  pl.regions((x, y) => classify(train, { x, y }, state.k).label,
    [t.d3soft, t.d2soft], { cell: 10 });

  frameGarden(pl);
  drawFlowers(pl);
  drawQuery(pl, classify(train, state.q, state.k).label);

  setLegend([
    { label: `${KINDS[0]} region`, color: t.d3 },
    { label: `${KINDS[1]} region`, color: t.d2 },
  ]);
  setNote(`Colour every spot by how it would be classified and the whole map appears — no equation, just the neighbours. Slide <b>k</b>: small k gives a jagged boundary that hugs stragglers; large k smooths it into a gentle curve.`);
  describe(`The decision map at k=${state.k}: each region is shaded by which flower kind a point there would be assigned.`);
}

/* =========================================================================
   Act 4 — choosing k
   ========================================================================= */

function drawTune() {
  plot.measure();
  const t = plot.t;
  const gap = 26;
  const half = (plot.w - gap) / 2;

  // left: the map at this k
  const mp = new Plot(canvas, { margin: { t: 26, r: 14, b: 46, l: 52 } });
  mp.w = half; mp.h = plot.h; mp.t = t;
  mp.setDomain(DOM, DOM);
  plot.clear();
  mp.regions((x, y) => classify(train, { x, y }, state.k).label, [t.d3soft, t.d2soft], { cell: 11 });
  mp.frame({ xTicks: ticks(0, 10, 2), yTicks: ticks(0, 10, 2), xLabel: 'Petal width (mm)', yLabel: 'Petal length (mm)' });
  for (const p of train) mp.dot(p.x, p.y, { r: 4, fill: COL(t, p.label) });
  mp.label(`boundary at k = ${state.k}`, mp.left, mp.top - 12, { color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false });

  // right: accuracy vs k
  const ks = [], accs = [];
  for (let k = 1; k <= 13; k += 2) { ks.push(k); accs.push(looAccuracy(train, k)); }
  const vp = new Plot(canvas, { margin: { t: 26, r: 22, b: 46, l: half + gap + 54 } });
  vp.w = plot.w; vp.h = plot.h; vp.t = t;
  vp.setDomain([0, 14], [0.5, 1]);
  vp.frame({ xTicks: ticks(0, 14, 2), yTicks: [0.5, 0.75, 1], xLabel: 'k  (neighbours asked)', yLabel: 'Accuracy', yFmt: (v) => `${Math.round(v * 100)}%` });
  vp.path(ks.map((k, i) => [k, accs[i]]), { color: t.d1, width: 2.5 });
  ks.forEach((k, i) => vp.dot(k, accs[i], { r: k === state.k ? 6 : 4, fill: k === state.k ? t.d1 : t.surface, ring: true }));
  // mark the current k and the best k
  vp.dot(BEST_K.k, looAccuracy(train, BEST_K.k), { r: 6, fill: t.d3 });
  vp.label('best', BEST_K.k, looAccuracy(train, BEST_K.k), { color: t.d3, dx: 8, dy: -12, size: 12 });
  vp.label('how surprised', 0, 0, { color: 'transparent', size: 1, space: true });   // no-op spacer
  vp.label(`k = ${state.k}`, state.k, accs[(state.k - 1) / 2], { color: t.d1, dx: 0, dy: 20, size: 12, align: 'center' });

  // tiles
  const acc = looAccuracy(train, state.k);
  $('#accVal').textContent = Math.round(acc * 100);
  $('#bestKVal').textContent = BEST_K.k;
  const fit = state.k <= 1 ? 'Too jumpy' : state.k >= 11 ? 'Too smooth' : 'Balanced';
  $('#fitVal').textContent = fit;
  $('#fitVal').style.color = fit === 'Balanced' ? t.d3 : t.d2;

  setLegend([
    { label: `${KINDS[0]}`, color: t.d3 },
    { label: `${KINDS[1]}`, color: t.d2 },
    { label: 'Accuracy', color: t.d1, kind: 'line' },
  ]);
  setNote(state.k <= 1
    ? `At <b>k = 1</b> the boundary bends around every single flower, even the odd one in the wrong place. It <b>memorises</b> instead of learning.`
    : state.k >= 11
      ? `At <b>k = ${state.k}</b> so many neighbours vote that local detail is washed out — the boundary barely bends. It <b>over-smooths</b>.`
      : `<b>k = ${state.k}</b> balances the two: enough neighbours to ignore noise, few enough to keep the real shape. Best here is <b>k = ${BEST_K.k}</b>.`);
  describe(`Left: the decision boundary at k=${state.k}. Right: accuracy peaks around k=${BEST_K.k} and falls off for very small or very large k.`);
}

/* =========================================================================
   Act 5 — the twist: nothing was trained
   ========================================================================= */

function drawTwist() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;
  pl.regions((x, y) => classify(train, { x, y }, BEST_K.k).label, [t.d3soft, t.d2soft], { cell: 10 });
  frameGarden(pl);
  drawFlowers(pl);

  // overlay: the "model" is literally the dots
  pl.label('the "model" is just these dots', pl.left, pl.top - 12, { color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false });

  setLegend([
    { label: `${KINDS[0]}`, color: t.d3 },
    { label: `${KINDS[1]}`, color: t.d2 },
  ]);
  setNote(`Here's the twist: <b>nothing was ever trained</b>. There's no line, no weight, no tipping point, no downhill walk. The flowers <em>are</em> the model. Learning cost nothing; every answer does the work instead, by measuring distances on the spot.`);
  describe(`The final decision map at the best k. The lesson's point: k-NN stores the examples and does all its work at question time, with no training step.`);
}

/* =========================================================================
   Act 6 — what it was, and what it costs
   ========================================================================= */

let recapClock = 0;
let recapRunning = false;

function drawRecap() {
  const pl = plot.measure();
  pl.clear();
  // Deliberately NOT a loop: this is the one lesson with no training step,
  // and the missing return arrow is the point being made.
  loopDiagram(pl, [
    { k: 'Keep', v: 'store every example exactly as it came' },
    { k: 'Compare', v: 'a question arrives — measure the distance to all of them' },
    { k: 'Copy', v: 'answer with whatever the closest ones say' },
  ], {
    active: Math.floor(recapClock / 900) % 3,
    accent: pl.t.d3,
    loop: false,
    caption: 'Notice what is missing: there is no arrow back. Nothing is ever adjusted, because nothing was ever fitted.',
  });
  setLegend([{ label: 'No training loop — just store and compare', color: pl.t.d3, kind: 'line' }]);
  setNote('Every other lesson in this course spends its effort <b>before</b> the question arrives. This one spends it all <b>after</b>.');
  describe('A three-stage flow — keep, compare, copy — with no return arrow, because k-nearest-neighbours has no training step.');
}

/* =========================================================================
   Checkpoints
   ========================================================================= */

/** A tiny decision map at the given k. */
function miniMap(pl, k) {
  const t = pl.t;
  pl.setDomain(DOM, DOM);
  pl.regions((x, y) => classify(train, { x, y }, k).label, [t.d3soft, t.d2soft], { cell: 6 });
  for (const f of train) pl.dot(f.x, f.y, { r: 2.2, fill: COL(t, f.label), ring: false });
}

const CHECKS = {
  how: {
    id: 'knn-how',
    kind: 'predict',
    question: 'This model is never trained. So how can it possibly answer anything?',
    note: 'No line gets fitted here. No knob gets turned. Nothing walks downhill.',
    options: [
      {
        label: 'It works out a rule from the flowers first',
        why: `That is exactly what the last two lessons did — and it is the assumption this lesson exists
              to break. Here, <b>nothing whatsoever happens</b> until a question arrives. There is no
              rule sitting in memory waiting to be applied.`,
      },
      {
        label: 'It finds the known flowers closest to the new one and copies them',
        ok: true,
        why: `That is the entire algorithm, and you already use it. "This song is like those songs, so you
              will probably like it." No formula, no training — just <b>keep the examples and measure
              distances when asked</b>.`,
      },
      {
        label: 'It cannot — you always have to train something',
        why: `A reasonable conclusion after two lessons of training, and wrong. You can answer a question
              perfectly well by looking up similar cases, which is roughly how a doctor uses experience.
              The catch is not accuracy; it is <em>speed</em>, and you will meet it shortly.`,
      },
    ],
  },

  boundary: {
    id: 'knn-boundary',
    kind: 'predict',
    question: 'Colour in every spot on the map by what it would answer. What does the border look like?',
    note: 'Not the flowers — the whole field, every position, coloured by the answer k-NN would give there.',
    options: [
      {
        label: 'A straight line, like before',
        paint: (pl) => {
          const t = pl.t;
          pl.setDomain(DOM, DOM);
          pl.regions((x, y) => (y > 10.6 - x ? 1 : 0), [t.d3soft, t.d2soft], { cell: 6 });
          pl.clip(() => pl.segment(0, 10.6, 10, 0.6, { color: t.muted, width: 2 }));
          for (const f of train) pl.dot(f.x, f.y, { r: 2.2, fill: COL(t, f.label), ring: false });
        },
        why: `Straight lines came from <em>formulas</em> — a line has an equation, so it can only ever be
              straight. k-NN has no equation at all, so nothing is forcing its border to be tidy.`,
      },
      {
        label: 'A ragged border that hugs the flowers',
        ok: true,
        paint: (pl) => miniMap(pl, 3),
        why: `The border is not a shape anybody chose — it is <b>whatever falls out of where the flowers
              happen to sit</b>. That is k-NN's great strength: it can trace any shape at all, no matter
              how odd, without being told. It is also its weakness, as you are about to see: it traces
              the <em>accidents</em> just as faithfully.`,
      },
      {
        label: 'A perfect circle around each group',
        paint: (pl) => {
          const t = pl.t;
          pl.setDomain(DOM, DOM);
          const R2 = 7;
          pl.regions((x, y) => ((x - 3.4) ** 2 + (y - 3.4) ** 2 < R2 ? 0 : 1), [t.d3soft, t.d2soft], { cell: 6 });
          const ring = [];
          for (let i = 0; i <= 80; i++) {
            const a = (i / 80) * Math.PI * 2;
            ring.push([3.4 + Math.sqrt(R2) * Math.cos(a), 3.4 + Math.sqrt(R2) * Math.sin(a)]);
          }
          pl.clip(() => pl.path(ring, { color: t.muted, width: 2 }));
          for (const f of train) pl.dot(f.x, f.y, { r: 2.2, fill: COL(t, f.label), ring: false });
        },
        why: `Circles are a formula too, and k-NN never writes one down. It only ever asks "which stored
              flowers are nearest?", so the border lands wherever that answer happens to change.`,
      },
    ],
  },

  overfit: {
    id: 'knn-overfit',
    kind: 'check',
    question: 'At k = 1 the model labels every flower in the garden correctly. 100%. Is that a good model?',
    note: 'Think about which flower is closest to a flower that is already in the garden.',
    options: [
      {
        label: 'Yes — 100% is as good as it gets',
        why: `It really is 100%, and it means <b>nothing at all</b>. Ask k=1 about a flower already in the
              garden and the nearest one it finds is <em>that very flower</em>, sitting at distance zero.
              It is not predicting; it is reading the answer off the back of the card. And we never
              needed those answers — we already had them.`,
      },
      {
        label: 'No — it is reciting flowers it has already been shown',
        ok: true,
        why: `Yes, and this is one of the two or three most important ideas in the whole subject. Testing
              a model on the very data it was built from measures its <b>memory</b>, not its
              <b>judgement</b>. It is why the score on this screen hides each flower in turn and asks the
              <em>others</em> — and why k=1 does badly the moment you do that. The real name for looking
              brilliant on your own data and useless on anything new is <em>overfitting</em>.`,
      },
      {
        label: 'It depends how many flowers are in the garden',
        why: `It does not. k=1 scores 100% on its own garden whether there are eight flowers or eight
              million, because every flower is always its own nearest neighbour. A score that is
              guaranteed before you even look tells you nothing.`,
      },
    ],
  },

  cost: {
    id: 'knn-cost',
    kind: 'recall',
    question: 'You store 50 million photos and use k-NN to label a new one. Where does the trouble show up?',
    options: [
      {
        label: 'Training would take weeks',
        why: `There is no training — that is the one thing k-NN gets for free. Storing 50 million photos
              is instant in the sense that matters: nothing has to be computed. The bill arrives later.`,
      },
      {
        label: 'Every single answer has to compare against all 50 million',
        ok: true,
        why: `This is the trade you have been shown, at scale. k-NN moves <b>all</b> of the work from
              training time to question time. Free to learn, expensive to use — and every question costs
              the same again. The models in the other lessons are the opposite: slow and awkward to
              train, then almost free to ask. That is why the next lessons go back to training.`,
      },
      {
        label: 'Nothing — it scales perfectly well',
        why: `Try the arithmetic. One question means 50 million distance calculations, and they cannot be
              done in advance because you do not know the question yet. Ten thousand users asking at once
              is half a trillion comparisons.`,
      },
    ],
  },
};

/* =========================================================================
   Steps
   ========================================================================= */

const steps = [
  {
    label: 'The question',
    title: 'A flower with no label',
    sub: 'A garden of two kinds, and one new arrival nobody has identified.',
    brief: 'A flower with no label',
    beats: [
      {
        text: `<p>A garden of ${train.length} flowers, of two kinds — <b style="color:var(--data-3)">${KINDS[0]}</b> and <b style="color:var(--data-2)">${KINDS[1]}</b>.</p>
               <p>Each one is plotted by two petal measurements. Every dot here is <em>already labelled</em>; a botanist did that work years ago.</p>`,
        panels: ['ask'],
      },
      {
        head: 'The new arrival',
        text: `<p>The hollow diamond is a flower somebody just found. We measured its petals. We have no idea what it is.</p>
               <p>Look where it sits. Before reading on — what would <em>you</em> guess, and what made you guess it?</p>`,
        panels: ['ask'],
      },
      {
        ask: CHECKS.how,
        text: `<p>Here is what makes this lesson the odd one out — and it is worth pausing on before you read the options.</p>`,
        panels: ['ask'],
      },
    ],
    draw: drawAsk,
  },

  {
    label: 'Ask around',
    title: 'Let the closest ones vote',
    sub: 'Find the k nearest labelled flowers and take a majority.',
    brief: 'Let the neighbours vote',
    beats: [
      {
        text: `<p>The whole method, in one sentence: <b>find the closest few flowers we do have labels for, and copy the majority.</b></p>
               <p>The dashed circle shows how far it had to reach. The spokes show who voted.</p>`,
        panels: ['ask', 'vote'],
      },
      {
        head: 'Now break it',
        text: `<p><b>Drag the mystery flower</b> across the chart and watch the verdict flip as it crosses the middle.</p>
               <p>Then change <b>k</b> — how many neighbours get a vote. Park the flower somewhere ambiguous and change k there; sometimes the answer flips on that alone.</p>
               <p>That is not a flaw to be fixed. It is the model telling you it is genuinely unsure.</p>`,
        panels: ['ask', 'vote'],
        cta: 'Show me everywhere →',
      },
    ],
    draw: drawVote,
  },

  {
    label: 'The whole map',
    title: 'Every spot has a verdict',
    sub: 'Run that vote at every location and the garden splits into coloured regions.',
    brief: 'Colour the whole garden',
    beats: [
      {
        ask: CHECKS.boundary,
        text: `<p>Do that vote not just for one flower but for <b>every single point</b> in the garden, and shade each by its verdict.</p>`,
        panels: [],
        enter() { state.showRegions = true; },
      },
      {
        head: 'A boundary with no equation',
        text: `<p>That shaded edge is the <b>decision boundary</b> — and it came from the dots alone. There is no formula anywhere in this lesson.</p>
               <p>Change <b>k</b> and watch it breathe: tight and jagged when small, loose and smooth when large.</p>
               <p>Which raises the obvious question — which k is right?</p>`,
        panels: ['ask'],
        cta: 'Which k? →',
      },
    ],
    draw: drawMap,
  },

  {
    label: 'Choosing k',
    title: 'How many neighbours is right?',
    sub: 'Too few copies the noise; too many forgets the local shape.',
    brief: 'The Goldilocks number',
    beats: [
      {
        text: `<p>To score a k honestly we <b>hide each flower in turn</b> and ask the others to name it. A flower never gets a vote on itself.</p>
               <p>Slide k and watch both panels: the map on the left, and how well it does on the right.</p>`,
        panels: ['tune'],
      },
      {
        ask: CHECKS.overfit,
        text: `<p>Now set <b>k = 1</b> and think carefully about what that model is really doing.</p>`,
        panels: ['tune'],
      },
      {
        head: 'The Goldilocks number',
        text: `<p>The curve peaks in the middle — here at <b>k = ${BEST_K.k}</b>. Small k trusts every straggler; huge k blurs the two kinds into one average.</p>
               <p>Under-fit on one side, over-fit on the other, and one honest way to tell them apart. This tension never goes away, in any model.</p>`,
        panels: ['tune'],
        cta: 'Wait, something is missing →',
      },
    ],
    draw: drawTune,
  },

  {
    label: 'The twist',
    title: 'There was never any training',
    sub: 'No line, no weights, no downhill walk. The examples themselves are the model.',
    brief: 'Where was the training?',
    beats: [
      {
        text: `<p>Look back at the last two lessons. Each one <em>started wrong</em> and stepped downhill until it fitted.</p>
               <p>Now look for that here. There is no line to fit. No knob to turn. No valley. No training step at all.</p>
               <p>We kept the flowers and asked them questions. <b>The flowers are the model.</b></p>`,
        panels: [],
      },
      {
        head: 'Free to learn, expensive to ask',
        text: `<p>That is the trade. Learning cost nothing whatsoever — but every single answer does the full work, measuring the whole garden from scratch.</p>
               <p>Every other model in this course is the other way round: slow and awkward to train, then nearly free to ask.</p>`,
        panels: [],
        cta: 'So what was that? →',
      },
    ],
    draw: drawTwist,
  },

  {
    label: 'So what?',
    title: 'The exception that proves the rule',
    sub: 'Not everything that learns is trained.',
    brief: 'What you actually learned',
    beats: [
      {
        text: `<p>This lesson exists to stop you believing that <em>machine learning = stepping downhill</em>. That is a very common way to do it, not the only one.</p>
               <p>Notice the diagram has <b>no arrow back</b>. Nothing is ever adjusted, because nothing was ever fitted.</p>`,
      },
      {
        head: 'The words the grown-ups use',
        text: `<p>The one to take furthest is <b>overfitting</b> — scoring perfectly on your own examples and being useless on anything new.</p>`,
        panels: ['recap'],
      },
      {
        ask: CHECKS.cost,
        text: `<p>One last question, about the price you pay for skipping training altogether. It is not a small one.</p>`,
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
  panels: { ask: $('#panel-ask'), vote: $('#panel-vote'), tune: $('#panel-tune'), recap: $('#panel-recap') },
};

const lesson = new Lesson({ steps, els });

const { ask } = attach(lesson, {
  id: 'k-nearest-neighbours',
  total: 4,
  recap: {
    terms: [
      ['Asking the closest ones', 'k-nearest neighbours', 'often the first thing to try on a new problem'],
      ['Keeping the flowers instead of fitting', 'Lazy learning', 'all the work happens at question time'],
      ['Reciting flowers it has seen', 'Overfitting', 'the mistake that ruins more models than any other'],
      ['Hiding one flower and asking the rest', 'Cross-validation', 'the honest way to score any model'],
      ['The coloured map', 'The decision boundary', 'every model has one — this one just has no formula'],
    ],
    uses: [
      '<b>"Customers also bought"</b> — the nearest shoppers to you, and what they picked',
      '<b>Song and film suggestions</b>, before the big recommender systems took over',
      '<b>Handwriting</b> and fingerprint matching, by nearest stored example',
      '<b>Spotting odd readings</b> in a factory: nothing nearby means something is wrong',
    ],
  },
});

const theme = initTheme($('#themeBtn'));
theme.onChange(() => { ask.repaint(); lesson.invalidate(); });

// k is shared across the two sliders that set it
function setK(v) {
  state.k = v;
  $('#k').value = v; $('#kVal').textContent = v;
  $('#k2').value = v; $('#k2Val').textContent = v;
  lesson.invalidate();
}
slider($('#k'), $('#kVal'), String, setK);
slider($('#k2'), $('#k2Val'), String, setK);

/* --- dragging the mystery flower ------------------------------------------ */

function localPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', (e) => {
  if (!lesson.step.panels?.includes('ask')) return;
  const { x, y } = localPos(e);
  if (Math.hypot(plot.sx(state.q.x) - x, plot.sy(state.q.y) - y) < 22) {
    state.dragging = true;
    canvas.setPointerCapture(e.pointerId);
    lesson.invalidate();
  }
});
canvas.addEventListener('pointermove', (e) => {
  const { x, y } = localPos(e);
  if (state.dragging) {
    state.q.x = clamp(plot.ix(x), DOM[0], DOM[1]);
    state.q.y = clamp(plot.iy(y), DOM[0], DOM[1]);
    lesson.invalidate();
    return;
  }
  // hover tooltip on real flowers (not during map-only acts)
  if (!lesson.step.panels?.includes('ask') && lesson.step.label !== 'The whole map') { hideTip(); return; }
  let near = null, best = 26 * 26;
  for (const p of train) {
    const d = (plot.sx(p.x) - x) ** 2 + (plot.sy(p.y) - y) ** 2;
    if (d < best) { best = d; near = p; }
  }
  if (near !== state.hovered) { state.hovered = near; lesson.invalidate(); }
  if (near) {
    showTip(plot.sx(near.x), plot.sy(near.y),
      `<strong>${KINDS[near.label]}</strong><span>${near.x.toFixed(1)} × ${near.y.toFixed(1)} mm</span>`);
  } else hideTip();
});
const endDrag = () => { if (state.dragging) { state.dragging = false; lesson.invalidate(); } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { state.hovered = null; hideTip(); lesson.invalidate(); });

/* --- table ---------------------------------------------------------------- */

$('#tableBtn').addEventListener('click', () => {
  const tv = $('#tableView');
  const open = tv.hidden;
  if (open) {
    const res = classify(train, state.q, state.k);
    const nearIds = new Set(res.near.map((p) => p.id));
    const rows = train
      .map((p) => ({ p, d: Math.hypot(p.x - state.q.x, p.y - state.q.y) }))
      .sort((a, b) => a.d - b.d)
      .map(({ p, d }, i) => `<tr${nearIds.has(p.id) ? ' style="font-weight:600"' : ''}>
          <td>${i + 1}</td><td>${KINDS[p.label]}</td><td>${p.x.toFixed(1)}</td><td>${p.y.toFixed(1)}</td>
          <td>${d.toFixed(2)}</td><td>${nearIds.has(p.id) ? '✓ voter' : ''}</td></tr>`).join('');
    $('#tableView').innerHTML = `<table><thead><tr><th>#</th><th>Kind</th><th>Width</th><th>Length</th><th>Distance</th><th></th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  tv.hidden = !open;
  $('#tableBtn').setAttribute('aria-expanded', String(open));
  $('#tableBtn').textContent = open ? 'Hide the numbers' : 'Show the numbers';
});

/* --- go ------------------------------------------------------------------- */

setK(3);
lesson.start();
