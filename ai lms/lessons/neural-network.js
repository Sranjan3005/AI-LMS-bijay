/* =========================================================================
   Lesson — How a machine learns a curved boundary.

   The finale. Every method so far drew a straight boundary. This data — a
   ring around a core — defeats all of them. The fix is to stack the simple
   line-detectors from the logistic lesson and bend them together into a
   curve. Training is the same downhill walk as lessons 1–2, with more knobs.

     1  the wall — drag a straight line; nothing beats ~70% on a ring
     2  one detector — a single soft line, bright on one side (a 2-D S-curve)
     3  stack them — many detectors combine into a curved (untrained) boundary
     4  the machine learns — backprop bends the curve around the ring
     5  how many — too few can't close the ring; more can; the trade-off
   ========================================================================= */

import { Plot, ticks, clamp } from '../src/core/plot.js';
import { makeRings, Network, Trainer, ZONES } from '../src/ml/network.js';
import { Lesson, initTheme, $, slider } from '../src/lesson/shell.js';
import { loopDiagram } from '../src/core/diagram.js';
import { attach } from '../src/lesson/teach.js';

/* --- constants ------------------------------------------------------------ */

const DOM = [0, 10];
const DATA = makeRings();

const canvas = $('#canvas');
const wrap = $('#canvasWrap');
const tipEl = $('#tip');
const plot = new Plot(canvas);

const state = {
  line: { ang: (45 / 180) * Math.PI, off: 0 },
  unit: 0,
  H: 8,
  hovered: null,
};

let trainer = new Trainer(DATA, { H: 8, lr: 0.8, seed: 4 });
let playing = false;

// a fixed reference network to illustrate acts 2–3 before training
let demoNet = new Network(8, 4);

/* --- helpers -------------------------------------------------------------- */

const COL = (t, label) => (label === 1 ? t.d2 : t.d3);   // inner=orange, outer=aqua
const fmtPct = (v) => Math.round(v * 100);

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
    xLabel: 'Measurement A', yLabel: 'Measurement B',
  });
}

function drawPoints(pl, { faded = false } = {}) {
  const t = pl.t;
  for (const p of DATA) {
    const hovered = state.hovered && p.id === state.hovered.id;
    pl.dot(p.x, p.y, { r: hovered ? 6.5 : 4.5, fill: COL(t, p.label), alpha: faded ? 0.5 : 1 });
  }
}

/* --- straight-line accuracy (act 1) --------------------------------------- */

function lineAccuracy(ang, off) {
  const nx = Math.cos(ang), ny = Math.sin(ang);
  let correct = 0;
  for (const p of DATA) {
    const side = (nx * (p.x - 5) + ny * (p.y - 5) - off) >= 0 ? 1 : 0;
    if (side === p.label) correct++;
  }
  return correct / DATA.length;
}
function bestLineAccuracy() {
  let best = 0;
  for (let a = 0; a < 90; a++) {
    for (let off = -6; off <= 6; off += 0.3) {
      best = Math.max(best, lineAccuracy((a / 90) * Math.PI, off));
    }
  }
  return best;
}
const BEST_LINE = bestLineAccuracy();

/* --- decision background -------------------------------------------------- */

function paintDecision(pl, net, { alpha = 1 } = {}) {
  const t = pl.t;
  pl.regions((x, y) => (net.predict(x, y) >= 0.5 ? 1 : 0), [t.d3soft, t.d2soft], { cell: 9, alpha });
}

/* =========================================================================
   Act 1 — the wall
   ========================================================================= */

function drawWall() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;

  // shade the line's two sides
  const { ang, off } = state.line;
  const nx = Math.cos(ang), ny = Math.sin(ang);
  pl.regions((x, y) => ((nx * (x - 5) + ny * (y - 5) - off) >= 0 ? 1 : 0), [t.d3soft, t.d2soft], { cell: 12 });
  frameField(pl);

  // the line itself
  const dx = -ny, dy = nx;
  const cxp = 5 + nx * off, cyp = 5 + ny * off;
  pl.clip(() => pl.segment(cxp - dx * 16, cyp - dy * 16, cxp + dx * 16, cyp + dy * 16, { color: t.ink, width: 2.5 }));
  drawPoints(pl);

  $('#lineAcc').textContent = fmtPct(lineAccuracy(ang, off));

  setLegend([
    { label: `${ZONES[1]} (core)`, color: t.d2 },
    { label: `${ZONES[0]} (ring)`, color: t.d3 },
    { label: 'Your line', color: t.ink, kind: 'line' },
  ]);
  setNote(`Try to split the core from the ring with one straight line. You can't — a line always leaves part of the ring on the wrong side. The best any straight line manages here is about <b>${fmtPct(BEST_LINE)}%</b>.`);
  describe(`A ring of one class surrounding a core of another. A straight line cannot separate them; this one gets ${fmtPct(lineAccuracy(ang, off))}% right.`);
}

/* =========================================================================
   Act 2 — one detector
   ========================================================================= */

function drawUnit() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;

  // heat map of this single unit's activation (tanh, -1..1)
  const [w1, w2, b] = demoNet.W1[state.unit];
  pl.regions((x, y) => {
    const a = Math.tanh(w1 * ((x - 5) / 5) + w2 * ((y - 5) / 5) + b);
    return a >= 0 ? 0 : 1;                       // bright vs dark side
  }, [t.d1soft, t.surface], { cell: 8 });

  frameField(pl);

  // the unit's zero line
  drawHiddenLine(pl, demoNet.W1[state.unit], t.d1, 2.5);
  drawPoints(pl, { faded: true });

  setLegend([
    { label: 'This detector fires', color: t.d1 },
    { label: 'stays quiet', color: t.muted },
    { label: 'Its line', color: t.d1, kind: 'line' },
  ]);
  setNote(`A hidden unit is nothing fancy: it's a <b>soft straight line</b>. On one side it fires (bright), on the other it's quiet. That's exactly the S-curve from the boundary lesson — just facing a chosen direction. One alone is still straight. The trick is combining many.`);
  describe(`A single hidden unit shown as a soft line: it fires on one side and stays quiet on the other.`);
}

/** Draw a hidden unit's zero-activation line in display space. */
function drawHiddenLine(pl, [w1, w2, b], color, width = 1.5, alpha = 1) {
  // w1*sx(x) + w2*sx(y) + b = 0, sx(v) = (v-5)/5
  // solve for display y across the x-domain
  pl.clip(() => {
    if (Math.abs(w2) > Math.abs(w1)) {
      const yAt = (x) => 5 + 5 * (-(w1 * ((x - 5) / 5) + b) / w2);
      pl.segment(DOM[0], yAt(DOM[0]), DOM[1], yAt(DOM[1]), { color, width, alpha });
    } else {
      const xAt = (y) => 5 + 5 * (-(w2 * ((y - 5) / 5) + b) / w1);
      pl.segment(xAt(DOM[0]), DOM[0], xAt(DOM[1]), DOM[1], { color, width, alpha });
    }
  });
}

/* =========================================================================
   Act 3 — stack them (untrained)
   ========================================================================= */

function drawStack() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;

  paintDecision(pl, demoNet);
  frameField(pl);
  // all the hidden lines, faint
  for (const w of demoNet.W1) drawHiddenLine(pl, w, t.d1, 1.2, 0.4);
  drawPoints(pl);

  setLegend([
    { label: `${ZONES[1]} region`, color: t.d2 },
    { label: `${ZONES[0]} region`, color: t.d3 },
    { label: 'The 8 detector lines', color: t.d1, kind: 'line' },
  ]);
  setNote(`Now lay <b>eight</b> of those detectors down together and let the output add them up. The boundary already <b>bends</b> — it's no longer a single straight cut. But these detectors are still random, so it's a mess. Next: aim them.`);
  describe(`Eight hidden units combined give a bent, multi-piece boundary — but untrained, so it does not yet match the ring.`);
}

/* =========================================================================
   Act 4 — the machine learns
   ========================================================================= */

function drawTrain() {
  plot.measure();
  const t = plot.t;
  const stripH = Math.min(150, Math.max(104, plot.h * 0.26));

  const pl = new Plot(canvas, { margin: { t: 22, r: 26, b: stripH + 58, l: 54 } });
  pl.w = plot.w; pl.h = plot.h; pl.t = t;
  pl.setDomain(DOM, DOM);
  plot.clear();

  paintDecision(pl, trainer.net);
  pl.frame({ xTicks: ticks(0, 10, 2), yTicks: ticks(0, 10, 2), xLabel: 'Measurement A', yLabel: 'Measurement B' });
  for (const w of trainer.net.W1) drawHiddenLine(pl, w, t.d1, 1, 0.28);
  for (const p of DATA) pl.dot(p.x, p.y, { r: 4.5, fill: COL(t, p.label) });

  // loss strip
  const lp = new Plot(canvas, { margin: { t: plot.h - stripH, r: 26, b: 46, l: 54 } });
  lp.w = plot.w; lp.h = plot.h; lp.t = t;
  const maxL = Math.max(0.1, Math.ceil(trainer.history[0].loss * 10) / 10);
  const maxStep = Math.max(60, trainer.epoch);
  lp.setDomain([0, maxStep], [0, maxL]);
  lp.frame({ xTicks: ticks(0, maxStep, Math.max(20, Math.round(maxStep / 4 / 20) * 20)), yTicks: [0, maxL / 2, maxL], xLabel: 'Steps', yFmt: (v) => v.toFixed(1) });
  lp.path(trainer.history.map((h) => [h.step, h.loss]), { color: t.d1, width: 2 });
  const last = trainer.history.at(-1);
  lp.dot(last.step, last.loss, { r: 4.5, fill: t.d1 });
  lp.label('wrongness', lp.left + 8, lp.top + 14, { color: t.muted, size: 11.5, weight: 500, space: true });

  $('#accVal').textContent = fmtPct(trainer.accuracy);
  $('#lossVal').textContent = trainer.loss.toFixed(3);
  $('#stepVal').textContent = trainer.epoch;

  setLegend([
    { label: `${ZONES[1]} region`, color: t.d2 },
    { label: `${ZONES[0]} region`, color: t.d3 },
    { label: 'Detector lines', color: t.d1, kind: 'line' },
  ]);
  describe(`Training step ${trainer.epoch}. The network gets ${fmtPct(trainer.accuracy)}% right; wrongness is ${trainer.loss.toFixed(3)}.`);
}

/* =========================================================================
   Act 5 — how many detectors
   ========================================================================= */

let archNet = trainedNet(8);

function trainedNet(H) {
  const tr = new Trainer(DATA, { H, lr: 0.8, seed: 4 });
  for (let i = 0; i < 450; i++) tr.step();
  return tr.net;
}

function drawArch() {
  const pl = plot.measure().setDomain(DOM, DOM);
  pl.clear();
  const t = pl.t;

  paintDecision(pl, archNet);
  frameField(pl);
  drawPoints(pl);

  const acc = archNet.accuracy(DATA);
  $('#archAcc').textContent = fmtPct(acc);
  const fit = state.H <= 2 ? 'Too few' : acc >= 0.97 ? 'Good' : 'Getting there';
  $('#archFit').textContent = fit;
  $('#archFit').style.color = fit === 'Good' ? t.d3 : t.d2;

  setLegend([
    { label: `${ZONES[1]} region`, color: t.d2 },
    { label: `${ZONES[0]} region`, color: t.d3 },
  ]);
  setNote(state.H <= 2
    ? `With only <b>${state.H}</b> detector${state.H === 1 ? '' : 's'} the network can draw a couple of straight cuts — but it can't <b>close a loop</b> around the core. It's stuck underfitting at <b>${fmtPct(acc)}%</b>.`
    : acc >= 0.97
      ? `<b>${state.H}</b> detectors is plenty: the boundary wraps the core cleanly, <b>${fmtPct(acc)}%</b> right. That's a neural network — simple straight pieces, bent and added into any shape you need.`
      : `<b>${state.H}</b> detectors bend the boundary into a partial loop — <b>${fmtPct(acc)}%</b>. A few more and it closes.`);
  describe(`With ${state.H} hidden units the trained boundary reaches ${fmtPct(acc)}% accuracy on the ring.`);
}

/* =========================================================================
   Act 6 — what it was, and how far it goes
   ========================================================================= */

let recapClock = 0;
let recapRunning = false;

function drawRecap() {
  const pl = plot.measure();
  pl.clear();
  loopDiagram(pl, [
    { k: 'Guess', v: 'every detector points somewhere random' },
    { k: 'Measure', v: 'how many points land in the wrong region?' },
    { k: 'Nudge', v: 'shift all of them a little, all at once' },
  ], {
    active: Math.floor(recapClock / 900) % 3,
    accent: pl.t.d2,
    returnLabel: 'and again — this ran 450 times',
    caption: 'Lesson 1 moved two numbers. This moved about forty. A chatbot moves a few hundred billion. Nothing else changes.',
  });
  setLegend([{ label: 'Lesson 1’s loop, with more knobs', color: pl.t.d2, kind: 'line' }]);
  setNote('You have now met every idea a modern AI is built from. What is left is <b>scale</b> — and scale turns out to change a great deal.');
  describe('The same three-stage learning loop from the first lesson, now moving roughly forty numbers at once instead of two.');
}

/* =========================================================================
   Checkpoints
   ========================================================================= */

/** A tiny ring plot with an arbitrary decision region painted behind it. */
function miniRing(pl, verdict) {
  const t = pl.t;
  pl.setDomain(DOM, DOM);
  pl.regions((x, y) => (verdict(x, y) ? 0 : 1), [t.d2soft, t.d3soft], { cell: 6 });
  for (const p of DATA) pl.dot(p.x, p.y, { r: 2, fill: COL(t, p.label), ring: false });
}

const CHECKS = {
  wall: {
    id: 'nn-wall',
    kind: 'predict',
    question: 'One group is a ring wrapped around the other. How well can a single straight line do?',
    note: 'Every model so far — the line, the S-curve, the widest street — draws a straight boundary.',
    options: [
      {
        label: 'Nearly all of them, with the line in the right place',
        why: `There is no right place. Try it in a moment: wherever you put the line, it cuts the ring in
              half and hands part of it to the core. The ceiling is about <b>${fmtPct(BEST_LINE)}%</b>,
              and no amount of dragging beats it.`,
      },
      {
        label: `About ${fmtPct(BEST_LINE)}% — and no line can ever beat that`,
        ok: true,
        why: `And that number is a <b>hard ceiling</b>, not a matter of effort. A straight line splits the
              plane into two halves; a ring is not one half of anything. Every method you have met so far
              is stuck at that wall — which is exactly why this lesson exists.`,
      },
      {
        label: 'About half — no better than a coin toss',
        why: `Better than that. A line can at least lop off a chunk of the ring and be right about it,
              reaching roughly <b>${fmtPct(BEST_LINE)}%</b>. That is the frustrating part: it is good
              enough to look like it is nearly working, and it can never be finished.`,
      },
    ],
  },

  stack: {
    id: 'nn-stack',
    kind: 'predict',
    question: 'Each detector is one straight soft line. What can eight of them, added together, draw?',
    note: 'They can only ever be straight individually. The question is what their sum can do.',
    options: [
      {
        label: 'Still only a straight line',
        paint: (pl) => miniRing(pl, (x, y) => x + y < 9.5),
        why: `This is the natural guess and it is the crux of the whole lesson. Adding straight things
              usually gives you a straight thing — but each detector is a <em>soft</em> line, an S-curve,
              and that gentle bend is what breaks it. Add bent things and you can get any shape you like.`,
      },
      {
        label: 'A shape with corners that can wrap right round',
        ok: true,
        paint: (pl) => miniRing(pl, (x, y) => (x - 5) ** 2 + (y - 5) ** 2 < 6.5),
        why: `Each detector cuts off one half of the field. Point eight of them inwards from all sides and
              the overlap is a closed pen — a rough circle with corners, like a stop sign. That is the
              entire trick of deep learning: <b>simple straight parts, stacked, make any shape at all</b>.`,
      },
      {
        label: 'Nothing useful — random pieces stay a mess',
        paint: (pl) => miniRing(pl, (x, y) => Math.sin(x * 1.6) + Math.cos(y * 1.9) > 0),
        why: `Untrained, that is exactly what you get, and the next act looks like this. But the pieces do
              not have to stay random — pointing them in useful directions is precisely what training
              does.`,
      },
    ],
  },

  capacity: {
    id: 'nn-capacity',
    kind: 'check',
    question: 'Slide the detector count down to 2 and retrain. Why can it not close the loop?',
    note: 'Run it first — the slider is in the panel on the right.',
    options: [
      {
        label: 'Two straight cuts cannot fence off a middle',
        ok: true,
        why: `Two lines can make a corner or a stripe, but they cannot surround anything — you need cuts
              coming in from every side to pen the core in. This is a <b>capacity</b> limit: the network
              is not badly trained, it is <em>incapable</em> of the shape. More training will never fix
              it; more detectors will, instantly.`,
      },
      {
        label: 'It was not trained for long enough',
        why: `Leave it running as long as you like and it will not improve. Watch the wrongness — it falls
              and then flattens out, because the network has done the best that two straight cuts allow.
              The problem is the shape it can draw, not the effort it puts in.`,
      },
      {
        label: 'The starting position was unlucky',
        why: `Retrain it a few times and you will see the same ceiling every run. Bad luck gives you
              different <em>wrong</em> answers; a capacity limit gives you the same wall over and over.
              Telling those two apart is a genuinely useful engineering skill.`,
      },
    ],
  },

  scale: {
    id: 'nn-scale',
    kind: 'recall',
    question: 'A chatbot has a few hundred billion knobs instead of your forty. What else is different?',
    options: [
      {
        label: 'Essentially nothing — it is this loop, much bigger',
        ok: true,
        why: `Genuinely, yes. Guess, measure how wrong, nudge everything downhill, repeat — for months, on
              thousands of machines. The parts you have used today are the real parts. What scale buys is
              not a different method but a vastly richer set of shapes it can draw, and that turns out to
              include "sounds like a person". Nobody fully understands why that works.`,
      },
      {
        label: 'It understands language, so it must reason differently',
        why: `It certainly behaves as if it does, and that is worth being curious about — but the training
              is this loop. It reads text with a word removed, guesses the word, measures how wrong the
              guess was, and nudges. Billions of times. Everything else is scale and arrangement.`,
      },
      {
        label: 'It is programmed with rules by people',
        why: `That was genuinely how people tried to build AI for about thirty years, and it worked badly.
              Nobody writes the rules any more. The rules are what falls out of the loop you just ran —
              which is also why nobody can simply open one up and read what it learnt.`,
      },
    ],
  },
};

/* =========================================================================
   Steps
   ========================================================================= */

const steps = [
  {
    label: 'The wall',
    title: 'A shape no line can split',
    sub: 'One group forms a ring around the other. Every method so far drew a straight line.',
    brief: 'Straight lines hit a wall',
    beats: [
      {
        text: `<p>New data, and look at the shape of it: a <b style="color:var(--data-2)">core</b> wrapped inside a <b style="color:var(--data-3)">ring</b>.</p>
               <p>To separate those you would have to draw a <em>loop</em>. Every model in this course so far draws a straight boundary — regression, the S-curve, the widest street, all of them.</p>`,
        panels: [],
      },
      {
        ask: CHECKS.wall,
        text: `<p>Before you touch anything, commit to a number. You will get to test it against the real thing in a moment.</p>`,
        panels: [],
      },
      {
        head: 'Go on, try',
        text: `<p>Drag the line around and hunt for something better. Watch the score.</p>
               <p>Whatever you do it cuts the ring in half and hands part of it to the core. This is not a lack of effort — it is a <b>hard ceiling</b> on what a straight line can express.</p>
               <p>We need to bend it.</p>`,
        panels: ['line'],
        cta: 'How do we bend it? →',
      },
    ],
    draw: drawWall,
  },

  {
    label: 'One piece',
    title: 'A detector is just a soft line',
    sub: 'The building block: a unit that fires on one side of a line and stays quiet on the other.',
    brief: 'Meet the building block',
    beats: [
      {
        text: `<p>A neural network is built from <b>hidden units</b>, and each one is something you have already met.</p>
               <p>It is a <b>soft straight line</b>: bright where it fires, dark where it does not. That is exactly the S-curve from the boundary lesson, pointed in some direction.</p>`,
        panels: ['unit'],
        enter() { state.unit = 0; syncUnit(); },
      },
      {
        head: 'Flip through them',
        text: `<p>There are eight of them here, each aimed differently. Step through and look at each one.</p>
               <p>Every single one is still <em>straight</em>, and on its own completely useless against a ring.</p>
               <p>The trick is not in the piece. It is in the stacking.</p>`,
        panels: ['unit'],
        cta: 'Stack them →',
      },
    ],
    draw: drawUnit,
  },

  {
    label: 'Stack them',
    title: 'Add the pieces up',
    sub: 'Eight soft lines, combined by an output layer, already make a boundary that bends.',
    brief: 'Bending the boundary',
    beats: [
      {
        ask: CHECKS.stack,
        text: `<p>Now lay all eight down together and let the output layer <b>add them up</b> into a single yes/no.</p>`,
        panels: [],
      },
      {
        head: 'Made of straight pieces, and yet',
        text: `<p>The boundary already <b>bends and turns</b>, even though every part of it is straight. With enough pieces it could trace any shape at all.</p>
               <p>Right now the detectors point in random directions, so it is a muddle that fits nothing.</p>
               <p>Time to aim them — and that is the only thing left that training does.</p>`,
        panels: [],
        cta: 'Aim them →',
      },
    ],
    draw: drawStack,
  },

  {
    label: 'The machine',
    title: 'Bend the curve to fit',
    sub: 'The same downhill walk as lesson 1 — just more knobs.',
    brief: 'Learning, with more knobs',
    beats: [
      {
        text: `<p>Training is the <b>same idea as lesson 1</b>: measure the wrongness, nudge everything a little downhill, repeat.</p>
               <p>The only difference is the count. There are now dozens of knobs — every detector's line, plus how they are added — and the machine moves them <em>all at once</em>.</p>`,
        panels: [],
        enter() { setNote('Press <b>Start learning</b>.'); },
      },
      {
        head: 'Watch it curl',
        text: `<p>Press <b>Start learning</b> and watch the boundary wrap itself around the core as the wrongness falls.</p>
               <p>Nobody told it "draw a circle". It has no idea what a circle is. It only ever pushed each detector in the direction that made the total slightly less wrong.</p>`,
        panels: ['train'],
        cta: 'How many pieces? →',
      },
    ],
    exit() { playing = false; $('#playBtn').textContent = 'Start learning'; },
    draw: drawTrain,
  },

  {
    label: 'How many',
    title: 'How many pieces do you need?',
    sub: 'Too few and it cannot close the loop; enough and it wraps the core cleanly.',
    brief: 'Just enough pieces',
    beats: [
      {
        text: `<p>How many detectors does a ring actually need? Slide the count and retrain.</p>
               <p>Start at <b>8</b>, then drop it right down to <b>2</b> and watch what happens.</p>`,
        panels: ['arch'],
        enter() { state.H = 8; syncH(); archNet = trainedNet(8); },
      },
      {
        ask: CHECKS.capacity,
        text: `<p>At 2 detectors it fails, and it keeps failing however long you leave it.</p>`,
        panels: ['arch'],
      },
      {
        head: 'Enough parts, any shape',
        text: `<p>Add a few more and the pieces wrap right around the core. That is the whole trick of deep learning: <b>stack enough simple parts and you can draw any shape at all.</b></p>
               <p>Now hold that thought, and imagine doing it with a few hundred billion pieces instead of eight.</p>`,
        panels: ['arch'],
        cta: 'So what was that? →',
      },
    ],
    draw: drawArch,
  },

  {
    label: 'So what?',
    title: 'This is the whole thing',
    sub: 'Not a simplified version of how modern AI works. The actual method, at a size you can see.',
    brief: 'What you actually learned',
    beats: [
      {
        text: `<p>Five lessons ago you dragged a line through some dots and measured how badly it missed. Everything since has been that same move, applied harder.</p>
               <p>The honest summary of modern AI: <b>stack enough simple parts, measure how wrong you are, nudge everything downhill a few billion times.</b></p>`,
      },
      {
        head: 'The words the grown-ups use',
        text: `<p>You now have every idea a modern AI is built from. What is left is <em>scale</em> — and scale turns out to change a great deal.</p>`,
        panels: ['recap'],
      },
      {
        ask: CHECKS.scale,
        text: `<p>Last question of the whole course — and it is the one worth getting right, because most people are wrong about it.</p>`,
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
  panels: { line: $('#panel-line'), unit: $('#panel-unit'), train: $('#panel-train'), arch: $('#panel-arch'), recap: $('#panel-recap') },
};

const lesson = new Lesson({ steps, els });

const { ask } = attach(lesson, {
  id: 'neural-network',
  total: 4,
  recap: {
    terms: [
      ['Stacking detectors', 'A neural network', 'the thing behind almost every AI you have heard of'],
      ['One detector', 'A neuron, or unit', 'a soft straight line, and nothing more'],
      ['A row of them', 'A hidden layer', 'stack several rows and you get "deep" learning'],
      ['Nudging them all at once', 'Backpropagation', 'the 1986 idea that makes the whole thing possible'],
      ['How many detectors', 'Capacity', 'too few cannot draw the shape; too many memorise the noise'],
    ],
    uses: [
      '<b>ChatGPT and friends</b> — this exact loop, with a few hundred billion knobs',
      '<b>Face unlock</b> on your phone, and the camera that finds the faces',
      '<b>Voice notes turned into text</b>, and translation between languages',
      '<b>Reading medical scans</b> — often now better than a human at spotting one thing',
    ],
  },
});

const theme = initTheme($('#themeBtn'));
theme.onChange(() => { ask.repaint(); lesson.invalidate(); });

/* --- act 1: the line ------------------------------------------------------ */

slider($('#ang'), $('#angVal'), String, (v) => { state.line.ang = (v / 180) * Math.PI; lesson.invalidate(); });
slider($('#off'), $('#offVal'), (v) => v.toFixed(1), (v) => { state.line.off = v; lesson.invalidate(); });

/* --- act 2: units --------------------------------------------------------- */

function syncUnit() { $('#unit').value = state.unit + 1; $('#unitVal').textContent = `${state.unit + 1} of 8`; }
slider($('#unit'), null, null, (v) => { state.unit = v - 1; $('#unitVal').textContent = `${v} of 8`; lesson.invalidate(); });

/* --- act 4: training ------------------------------------------------------ */

$('#playBtn').addEventListener('click', () => {
  if (trainer.epoch >= 400) restart();
  playing = !playing;
  $('#playBtn').textContent = playing ? 'Pause' : 'Start learning';
  if (playing) pump();
});
$('#stepBtn').addEventListener('click', () => {
  playing = false; $('#playBtn').textContent = 'Start learning';
  for (let i = 0; i < 10; i++) trainer.step();
  lesson.invalidate();
});
$('#restartBtn').addEventListener('click', restart);

function restart() {
  playing = false; $('#playBtn').textContent = 'Start learning';
  trainer.reset();
  setNote('Press <b>Start learning</b>.');
  lesson.invalidate();
}
function pump() {
  if (!playing) return;
  for (let i = 0; i < 4; i++) trainer.step();     // several epochs per frame
  lesson.invalidate();
  if (trainer.epoch >= 400 || trainer.accuracy >= 0.995) {
    playing = false;
    $('#playBtn').textContent = 'Start over';
    setNote(`<b>Done.</b> The boundary now wraps the core — <b>${fmtPct(trainer.accuracy)}%</b> right, from straight pieces bent into a loop. Same downhill walk as lesson one, just more knobs.`);
    lesson.invalidate();
    return;
  }
  if (trainer.epoch % 8 === 0) {
    setNote(`Bending… <b>${fmtPct(trainer.accuracy)}%</b> right, wrongness <b>${trainer.loss.toFixed(2)}</b>. The detector lines are swinging into place around the core.`);
  }
  requestAnimationFrame(pump);
}

/* --- act 5: architecture -------------------------------------------------- */

function syncH() { $('#hcount').value = state.H; $('#hVal').textContent = state.H; }
slider($('#hcount'), $('#hVal'), String, (v) => {
  state.H = v;
  archNet = trainedNet(v);
  lesson.invalidate();
});
$('#archTrain').addEventListener('click', () => { archNet = trainedNet(state.H); lesson.invalidate(); });

/* --- pointer (hover only) ------------------------------------------------- */

function localPos(e) { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
canvas.addEventListener('pointermove', (e) => {
  if (lesson.step.panels?.includes('train')) { hideTip(); return; }
  const { x, y } = localPos(e);
  let near = null, best = 22 * 22;
  for (const p of DATA) {
    const d = (plot.sx(p.x) - x) ** 2 + (plot.sy(p.y) - y) ** 2;
    if (d < best) { best = d; near = p; }
  }
  if (near !== state.hovered) { state.hovered = near; lesson.invalidate(); }
  if (near) showTip(plot.sx(near.x), plot.sy(near.y), `<strong>${ZONES[near.label]}</strong><span>${near.x.toFixed(1)}, ${near.y.toFixed(1)}</span>`);
  else hideTip();
});
canvas.addEventListener('pointerleave', () => { state.hovered = null; hideTip(); lesson.invalidate(); });

/* --- table ---------------------------------------------------------------- */

$('#tableBtn').addEventListener('click', () => {
  const tv = $('#tableView');
  const open = tv.hidden;
  if (open) {
    const net = lesson.step.panels?.includes('arch') ? archNet
      : lesson.step.panels?.includes('train') ? trainer.net : demoNet;
    const rows = DATA.slice(0, 24).map((p) => {
      const q = net.predict(p.x, p.y);
      const call = q >= 0.5 ? 1 : 0;
      return `<tr><td>${ZONES[p.label]}</td><td>${p.x.toFixed(1)}</td><td>${p.y.toFixed(1)}</td>
              <td>${Math.round(q * 100)}%</td><td>${call === p.label ? '✓' : '✗'}</td></tr>`;
    }).join('');
    $('#tableView').innerHTML = `<table><thead><tr><th>Zone</th><th>A</th><th>B</th><th>Says inner</th><th></th></tr></thead><tbody>${rows}</tbody><caption class="visually-hidden">First 24 points</caption></table>`;
  }
  tv.hidden = !open;
  $('#tableBtn').setAttribute('aria-expanded', String(open));
  $('#tableBtn').textContent = open ? 'Hide the numbers' : 'Show the numbers';
});

/* --- go ------------------------------------------------------------------- */

lesson.start();
