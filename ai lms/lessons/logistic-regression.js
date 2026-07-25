/* =========================================================================
   Lesson — How a machine learns to draw a boundary.

   The sequel to "drawing a line". Same forty students, one changed question:
   not "what score?" but "will they pass?". The five acts mirror lesson 1 on
   purpose — the learner should recognise the machine as the same machine.

     1  a yes/no question, and the messy overlap that makes it hard
     2  the learner tries a hard cutoff, and it misclassifies the middle
     3  soften the line into a curve of confidence; measure "surprise"
     4  the machine learns the curve, one student at a time
     5  why it works: surprise is a valley too
   ========================================================================= */

import { Plot, ticks, clamp, lerp } from '../src/core/plot.js';
import { loopDiagram } from '../src/core/diagram.js';
import { makeCohort, Problem, Trainer, PASS_MARK } from '../src/ml/logistic.js';
import { Lesson, initTheme, $, slider, segmented } from '../src/lesson/shell.js';
import { attach } from '../src/lesson/teach.js';

/* --- constants ------------------------------------------------------------ */

const X_DOM = [0, 10.2];
const P_DOM = [0, 1];
const TIP_DOM = [0, 10];
const SHARP_DOM = [0.1, 4];
const ASK_HOURS = 3.5;  // sits in the genuine overlap zone, not past it
const JITTER = 0.045;   // vertical wobble so pass/fail dots don't stack

const P = new Problem(makeCohort());
const BEST = P.bestCurve();
const BEST_CORRECT = P.correct(BEST.tip, BEST.sharp);
const BEST_CUT = P.bestCutoff();

const canvas = $('#canvas');
const wrap = $('#canvasWrap');
const tipEl = $('#tip');
const plot = new Plot(canvas);

const state = {
  cut: 5,
  curve: { tip: 5, sharp: 1 },
  userBestCorrect: -1,
  hovered: null,
  dragging: null,      // 'tip' | 'sharp'
  revealed: false,
  vTip: 2,
};

// pinned by tests/logistic.test.mjs
const TRAIN_OPTS = { lr: 0.3, epochs: 5, decay: 0.8, start: { tip: 2, sharp: 0.4 } };
let trainer = new Trainer(P, TRAIN_OPTS);
let playing = false;
let pace = 220;
let stepClock = 0;
let lastFrame = 0;

// a fixed vertical wobble per student, so dots at y=0/1 don't sit on top of
// each other. Deterministic, computed once.
const jit = new Map();
P.pts.forEach((p, i) => jit.set(p.id, ((Math.sin(i * 12.9898) * 43758.5) % 1) * JITTER));

/* --- helpers -------------------------------------------------------------- */

const fmt1 = (v) => v.toFixed(1);
const pct = (v) => `${Math.round(v * 100)}%`;

function setLegend(items) {
  $('#legend').innerHTML = items.map((it) => {
    const cls = it.kind === 'line' ? 'legend__swatch legend__swatch--line'
      : it.kind === 'dash' ? 'legend__swatch legend__swatch--dash'
      : 'legend__swatch';
    return `<span class="legend__item"><span class="${cls}" style="--_c:${it.color}"></span>${it.label}</span>`;
  }).join('');
}

function describe(text) { canvas.setAttribute('aria-label', text); }

function setNote(html) {
  const el = $('#note');
  el.hidden = !html;
  if (html) el.innerHTML = `<span>${html}</span>`;
}

function showTip(px, py, html) {
  tipEl.innerHTML = html;
  tipEl.style.left = `${px}px`;
  tipEl.style.top = `${py}px`;
  tipEl.dataset.show = '1';
}
const hideTip = () => { tipEl.dataset.show = '0'; };

/**
 * y-position of a student dot: near 1 if passed, near 0 if failed, wobbled.
 * When no curve is on screen (acts 1–2) the two bands are pulled toward the
 * middle so the plot is not two thin strips around a tall empty gap. Acts
 * with the S-curve use the full 0–1 height so the curve reads properly.
 */
let bandSpread = 1;   // 1 = full height, <1 = pulled toward centre
const dotY = (p) => 0.5 + bandSpread * ((p.passed ? 0.43 : -0.43) + jit.get(p.id));

function nearestPoint(px, py, pl, radius = 26) {
  let best = null, bestD = radius * radius;
  for (const p of P.pts) {
    const dx = pl.sx(p.x) - px, dy = pl.sy(dotY(p)) - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/* --- shared marks --------------------------------------------------------- */

function frameProb(pl, { yLabel = 'Chance of passing' } = {}) {
  pl.frame({
    xTicks: ticks(0, 10, 2),
    yTicks: [0, 0.25, 0.5, 0.75, 1],
    xLabel: 'Hours revised',
    yLabel,
    yFmt: pct,
  });
}

/** pass = aqua up top, fail = orange along the bottom. Colour == outcome. */
function drawStudents(pl, { active = null } = {}) {
  const t = pl.t;
  for (const p of P.pts) {
    if (active && p.id === active.id) continue;
    const hovered = state.hovered && p.id === state.hovered.id;
    pl.dot(p.x, dotY(p), { r: hovered ? 6.5 : 5, fill: p.passed ? t.d3 : t.d2 });
  }
  if (active) {
    const px = pl.sx(active.x), py = pl.sy(dotY(active));
    pl.ctx.save();
    pl.ctx.beginPath();
    pl.ctx.arc(px, py, 14, 0, Math.PI * 2);
    pl.ctx.strokeStyle = active.passed ? t.d3 : t.d2;
    pl.ctx.lineWidth = 2;
    pl.ctx.stroke();
    pl.ctx.restore();
    pl.dot(active.x, dotY(active), { r: 7, fill: active.passed ? t.d3 : t.d2 });
  }
}

function drawSCurve(pl, tip, sharp, { color, width = 3, alpha = 1, dash = null } = {}) {
  const pts = [];
  for (let i = 0; i <= 120; i++) {
    const x = X_DOM[0] + (i / 120) * (X_DOM[1] - X_DOM[0]);
    pts.push([x, P.chance(tip, sharp, x)]);
  }
  pl.path(pts, { color: color ?? pl.t.d1, width, alpha, dash });
}

/* --- stat tiles ----------------------------------------------------------- */

function setTiles({ main, mainUnit, heroKey, aKey, aVal, bVal }) {
  $('#statMain').textContent = main;
  $('#statMainUnit').textContent = mainUnit;
  $('#heroKey').textContent = heroKey;
  $('#statAKey').textContent = aKey;
  $('#statA').textContent = aVal;
  $('#statB').textContent = bVal;
}

/* --- table view ----------------------------------------------------------- */

function buildTable() {
  const { tip, sharp } = state.curve;
  const rows = P.pts.map((p) => {
    const c = P.chance(tip, sharp, p.x);
    const call = c >= 0.5 ? 'pass' : 'fail';
    const truth = p.passed ? 'pass' : 'fail';
    return `<tr><td>${p.name}</td><td>${p.x.toFixed(1)}</td><td>${p.score.toFixed(0)}</td>
            <td>${truth}</td><td>${pct(c)}</td><td>${call === truth ? '✓' : '✗'}</td></tr>`;
  }).join('');
  $('#tableView').innerHTML = `
    <table>
      <thead><tr><th>Student</th><th>Hours</th><th>Score</th><th>Really</th><th>Curve says</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* =========================================================================
   Act 1 — the yes/no question
   ========================================================================= */

function drawAsk() {
  const pl = plot.measure().setDomain(X_DOM, P_DOM);
  pl.clear();
  const t = pl.t;
  frameProb(pl, { yLabel: 'Result' });

  // band labels — track the compressed band
  const passY = 0.5 + bandSpread * 0.43, failY = 0.5 - bandSpread * 0.43;
  pl.label('PASSED', pl.left + 8, pl.sy(passY) - 22, {
    color: t.d3, size: 12, weight: 700, space: true, align: 'left', halo: true,
  });
  pl.label('FAILED', pl.left + 8, pl.sy(failY) + 22, {
    color: t.d2, size: 12, weight: 700, space: true, align: 'left', halo: true,
  });

  pl.clip(() => {
    pl.segment(ASK_HOURS, P_DOM[0], ASK_HOURS, P_DOM[1], {
      color: t.muted, width: 1.5, dash: [5, 5], alpha: 0.8,
    });
  });
  drawStudents(pl);

  if (state.revealed) {
    const c = P.chance(BEST.tip, BEST.sharp, ASK_HOURS);
    pl.chip(`about ${pct(c)} likely to pass`, pl.sx(ASK_HOURS), pl.top + 16, { color: t.ink });
  } else {
    pl.chip('pass or fail?', pl.sx(ASK_HOURS), pl.top + 16, { color: t.muted });
  }
  pl.label('Sam revised 3.5 hours', pl.sx(ASK_HOURS), pl.top + 40, {
    color: t.ink2, size: 12.5, align: 'center', space: true,
  });

  setLegend([
    { label: 'Passed', color: t.d3 },
    { label: 'Failed', color: t.d2 },
  ]);
  setNote(state.revealed
    ? `Right where Sam sits, passes and fails are all mixed together — so the honest answer is a <b>chance</b>, near a coin-flip, not a flat yes or no.`
    : `Notice the muddle around 3–4 hours: some who revised that long passed, some failed. <b>Click the chart</b> for a verdict on Sam.`);
  describe(`Forty students plotted by hours revised, split into a passed band and a failed band. Around 3 to 4 hours the two outcomes overlap.`);
}

/* =========================================================================
   Act 2 — the hard cutoff, and why it fails
   ========================================================================= */

function drawCutoff() {
  const pl = plot.measure().setDomain(X_DOM, P_DOM);
  pl.clear();
  const t = pl.t;
  frameProb(pl, { yLabel: 'Result' });

  // shade the "we predict pass" side
  pl.ctx.save();
  pl.ctx.fillStyle = t.d3soft;
  pl.ctx.fillRect(pl.sx(state.cut), pl.top, pl.sx(X_DOM[1]) - pl.sx(state.cut), pl.plotH);
  pl.ctx.restore();

  pl.clip(() => {
    pl.segment(state.cut, P_DOM[0], state.cut, P_DOM[1], { color: t.ink, width: 2.5 });
  });
  pl.label('predict PASS →', pl.sx(state.cut) + 8, pl.top + 14, {
    color: t.ink2, size: 12, space: true, align: 'left',
  });

  // students, with the wrongly-classified ringed
  for (const p of P.pts) {
    const said = p.x >= state.cut ? 1 : 0;
    const wrong = said !== p.passed;
    const px = pl.sx(p.x), py = pl.sy(dotY(p));
    if (wrong) {
      pl.ctx.save();
      pl.ctx.beginPath();
      pl.ctx.arc(px, py, 9, 0, Math.PI * 2);
      pl.ctx.strokeStyle = t.ink;
      pl.ctx.lineWidth = 2;
      pl.ctx.stroke();
      pl.ctx.restore();
    }
    pl.dot(p.x, dotY(p), { r: 5, fill: p.passed ? t.d3 : t.d2 });
  }

  const got = P.correctAtCutoff(state.cut);
  setTiles({
    main: got, mainUnit: '/ 40', heroKey: 'Called right',
    aKey: 'Your best', aVal: state.userBestCorrect < 0 ? '—' : String(state.userBestCorrect),
    bVal: `${BEST_CUT.n} / 40`,
  });
  state.userBestCorrect = Math.max(state.userBestCorrect, got);

  setLegend([
    { label: 'Passed', color: t.d3 },
    { label: 'Failed', color: t.d2 },
    { label: 'Got wrong (ringed)', color: t.ink },
  ]);
  setNote(got >= BEST_CUT.n
    ? `Best this line can do: <b>${got}</b> right, <b>${40 - got}</b> wrong. Those ringed dots in the middle are the problem — one flat line can't sort the muddle out.`
    : `<b>${got}</b> right, <b>${40 - got}</b> wrong. Drag the line — but you'll find no place gets everyone, because the two groups overlap.`);
  describe(`A hard cutoff at ${fmt1(state.cut)} hours. It calls ${got} of 40 students correctly; the ringed dots are misclassified.`);
}

/* =========================================================================
   Acts 3 — the S-curve of confidence
   ========================================================================= */

function drawCurve() {
  const pl = plot.measure().setDomain(X_DOM, P_DOM);
  pl.clear();
  const t = pl.t;
  frameProb(pl);
  const { tip, sharp } = state.curve;

  // 50% line + tipping point
  pl.segment(X_DOM[0], 0.5, X_DOM[1], 0.5, { color: t.axis, width: 1, dash: [4, 4] });
  pl.clip(() => {
    pl.segment(tip, 0, tip, 1, { color: t.muted, width: 1.5, dash: [5, 5] });
    drawSCurve(pl, tip, sharp, { color: t.d1, width: 3 });
  });

  drawStudents(pl);

  // tipping-point handle on the curve
  const hx = tip;
  const hy = 0.5;
  pl.ctx.save();
  pl.ctx.beginPath();
  pl.ctx.arc(pl.sx(hx), pl.sy(hy), 8, 0, Math.PI * 2);
  pl.ctx.fillStyle = t.surface; pl.ctx.fill();
  pl.ctx.strokeStyle = t.d1; pl.ctx.lineWidth = state.dragging ? 3.5 : 2.5; pl.ctx.stroke();
  pl.ctx.restore();
  pl.label('tipping point', tip, 0.5, { color: t.d1, dx: 10, dy: -12, size: 12 });

  const got = P.correct(tip, sharp);
  setTiles({
    main: got, mainUnit: '/ 40', heroKey: 'Called right',
    aKey: 'Surprise', aVal: P.surprise(tip, sharp).toFixed(2),
    bVal: `${BEST_CORRECT} / 40`,
  });

  setLegend([
    { label: 'Passed', color: t.d3 },
    { label: 'Failed', color: t.d2 },
    { label: 'Chance of passing', color: t.d1, kind: 'line' },
  ]);
  setNote(`The curve reads as a <b>chance</b>: high on the right, low on the left, unsure through the middle. At the tipping point (<b>${fmt1(tip)}h</b>) it is a coin-flip.`);
  describe(`A smooth S-curve of pass probability, tipping through 50% at ${fmt1(tip)} hours. It calls ${got} of 40 students correctly.`);
}

/* =========================================================================
   Act 4 — the machine learns the curve
   ========================================================================= */

function drawTrain() {
  plot.measure();
  const t = plot.t;
  const stripH = Math.min(150, Math.max(104, plot.h * 0.26));

  const pl = new Plot(canvas, { margin: { t: 22, r: 26, b: stripH + 58, l: 54 } });
  pl.w = plot.w; pl.h = plot.h; pl.t = t;
  pl.setDomain(X_DOM, P_DOM);
  plot.clear();
  frameProb(pl);

  const last = trainer.last;
  const tip = trainer.tip, sharp = trainer.sharp;

  pl.segment(X_DOM[0], 0.5, X_DOM[1], 0.5, { color: t.axis, width: 1, dash: [4, 4] });
  if (last) {
    pl.clip(() => drawSCurve(pl, last.from.tip, last.from.sharp, { color: t.d1, width: 2, alpha: 0.25 }));
  }
  pl.clip(() => drawSCurve(pl, tip, sharp, { color: t.d1, width: 3 }));

  drawStudents(pl, { active: last?.point ?? null });

  if (last) {
    const p = last.point;
    const px = pl.sx(p.x);
    // drop a marker at what the curve said vs the truth
    pl.dot(p.x, last.said, { r: 5, fill: t.d1 });
    pl.segment(p.x, last.said, p.x, dotY(p), { color: t.muted, width: 1.5, dash: [4, 4] });
    const good = (last.said >= 0.5) === !!p.passed;
    pl.label(good ? 'called it right' : 'called it wrong',
      p.x, (last.said + dotY(p)) / 2, {
        color: good ? t.d3 : t.d2, size: 12,
        dx: p.x > 7 ? -12 : 12, align: p.x > 7 ? 'right' : 'left',
      });
  }

  // surprise-over-time strip
  const lp = new Plot(canvas, { margin: { t: plot.h - stripH, r: 26, b: 46, l: 54 } });
  lp.w = plot.w; lp.h = plot.h; lp.t = t;
  const maxL = Math.max(0.1, Math.ceil(trainer.history[0].loss * 10) / 10);
  lp.setDomain([0, trainer.totalSteps], [0, maxL]);
  lp.frame({
    xTicks: ticks(0, trainer.totalSteps, P.pts.length),
    yTicks: [0, maxL / 2, maxL],
    xLabel: 'Students seen',
    yFmt: (v) => v.toFixed(1),
  });
  lp.path(trainer.history.map((h) => [h.step, h.loss]), { color: t.d1, width: 2 });
  const h = trainer.history.at(-1);
  lp.dot(h.step, h.loss, { r: 4.5, fill: t.d1 });
  lp.label('surprise', lp.left + 8, lp.top + 14, { color: t.muted, size: 11.5, weight: 500, space: true });

  const got = P.correct(tip, sharp);
  setTiles({
    main: got, mainUnit: '/ 40', heroKey: 'Called right',
    aKey: 'Surprise', aVal: P.surprise(tip, sharp).toFixed(2),
    bVal: `${BEST_CORRECT} / 40`,
  });

  setLegend([
    { label: 'Passed', color: t.d3 },
    { label: 'Failed', color: t.d2 },
    { label: "Machine's curve", color: t.d1, kind: 'line' },
  ]);
  describe(`Training step ${trainer.steps} of ${trainer.totalSteps}. The curve calls ${got} of 40 correctly; surprise is ${P.surprise(tip, sharp).toFixed(2)}.`);
}

/* =========================================================================
   Act 5 — surprise is a valley (one knob)
   ========================================================================= */

const VALLEY_SHARP = BEST.sharp;
let rolling = false;
const valleySurprise = (tip) => P.surprise(tip, VALLEY_SHARP);

function drawValley() {
  plot.measure();
  const t = plot.t;
  const gap = 26;
  const half = (plot.w - gap) / 2;

  // left: data + the curve this tipping point gives
  const dp = new Plot(canvas, { margin: { t: 26, r: 14, b: 46, l: 52 } });
  dp.w = half; dp.h = plot.h; dp.t = t;
  dp.setDomain(X_DOM, P_DOM);
  plot.clear();
  frameProb(dp);
  dp.segment(X_DOM[0], 0.5, X_DOM[1], 0.5, { color: t.axis, width: 1, dash: [4, 4] });
  for (const p of P.pts) dp.dot(p.x, dotY(p), { r: 4, fill: p.passed ? t.d3 : t.d2 });
  dp.clip(() => drawSCurve(dp, state.vTip, VALLEY_SHARP, { color: t.d1, width: 2.5 }));
  dp.label('the curve this point gives', dp.left, dp.top - 12, {
    color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false,
  });

  // right: surprise vs tipping point
  const top = Math.max(valleySurprise(TIP_DOM[0]), valleySurprise(TIP_DOM[1]));
  const yMax = Math.ceil(top * 4) / 4;
  const vp = new Plot(canvas, { margin: { t: 26, r: 22, b: 46, l: half + gap + 54 } });
  vp.w = plot.w; vp.h = plot.h; vp.t = t;
  vp.setDomain(TIP_DOM, [0, yMax]);
  vp.frame({
    xTicks: ticks(0, 10, 2),
    yTicks: ticks(0, yMax, yMax / 4),
    xLabel: 'Tipping point  (hours)',
    yLabel: 'Surprise',
    yFmt: (v) => v.toFixed(1),
  });

  const curve = [];
  for (let i = 0; i <= 160; i++) {
    const m = TIP_DOM[0] + (i / 160) * (TIP_DOM[1] - TIP_DOM[0]);
    curve.push([m, valleySurprise(m)]);
  }
  vp.ctx.save();
  vp.ctx.beginPath();
  vp.ctx.moveTo(vp.sx(curve[0][0]), vp.sy(curve[0][1]));
  for (const [m, y] of curve) vp.ctx.lineTo(vp.sx(m), vp.sy(y));
  vp.ctx.lineTo(vp.sx(TIP_DOM[1]), vp.sy(0));
  vp.ctx.lineTo(vp.sx(TIP_DOM[0]), vp.sy(0));
  vp.ctx.closePath();
  vp.ctx.fillStyle = t.sunken;
  vp.ctx.fill();
  vp.ctx.restore();
  vp.path(curve, { color: t.muted, width: 2.5 });
  vp.label('how surprised at every tipping point', vp.left, vp.top - 12, {
    color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false,
  });

  vp.segment(BEST.tip, 0, BEST.tip, valleySurprise(BEST.tip), { color: t.d3, width: 1.5, dash: [5, 5] });
  vp.dot(BEST.tip, valleySurprise(BEST.tip), { r: 5, fill: t.d3 });
  vp.label('bottom of the valley', BEST.tip, valleySurprise(BEST.tip), {
    color: t.d3, dx: 11, dy: 16, size: 12,
  });

  const my = valleySurprise(state.vTip);
  const slope = P.gradient(state.vTip, VALLEY_SHARP).dTip;
  if (Math.abs(state.vTip - BEST.tip) > 0.15) {
    const dir = slope > 0 ? -1 : 1;
    const bx = vp.sx(state.vTip), by = vp.sy(my);
    vp.arrow(bx + dir * 17, by + 4, bx + dir * 55, by + 4, { color: t.d1, width: 2.5 });
    vp.label('downhill', bx + dir * 36, by + 22, { color: t.d1, size: 12, align: 'center', space: true });
  }
  vp.ctx.save();
  vp.ctx.beginPath();
  vp.ctx.arc(vp.sx(state.vTip), vp.sy(my), 11, 0, Math.PI * 2);
  vp.ctx.fillStyle = t.d1; vp.ctx.fill();
  vp.ctx.strokeStyle = t.surface; vp.ctx.lineWidth = 2.5; vp.ctx.stroke();
  vp.ctx.restore();
  vp.label(`surprise ${my.toFixed(2)}`, state.vTip, my, { color: t.ink, dy: -24, size: 13, align: 'center' });

  setTiles({
    main: P.correct(state.vTip, VALLEY_SHARP), mainUnit: '/ 40', heroKey: 'Called right',
    aKey: 'Best tipping point', aVal: `${fmt1(BEST.tip)} h`,
    bVal: `${BEST_CORRECT} / 40`,
  });

  setLegend([
    { label: 'Passed', color: t.d3 },
    { label: 'Failed', color: t.d2 },
    { label: 'Your curve, and your ball', color: t.d1, kind: 'line' },
    { label: 'The best point', color: t.d3, kind: 'dash' },
  ]);
  const away = state.vTip < BEST.tip ? 'too early' : 'too late';
  setNote(Math.abs(state.vTip - BEST.tip) < 0.15
    ? 'You are at the bottom. Move the tipping point either way and the curve fits the students worse.'
    : `This tipping point is <b>${away}</b>, so surprise sits up the slope at <b>${my.toFixed(2)}</b>. Downhill is to the <b>${slope > 0 ? 'left' : 'right'}</b>.`);
  describe(`A U-shaped curve of surprise against the tipping point. The current point of ${fmt1(state.vTip)} hours gives surprise ${my.toFixed(2)}; the lowest point is at ${fmt1(BEST.tip)} hours.`);
}

function setValleyTip(v) {
  state.vTip = clamp(v, TIP_DOM[0], TIP_DOM[1]);
  $('#vTip').value = state.vTip;
  $('#vTipVal').textContent = fmt1(state.vTip);
  lesson.invalidate();
}

function rollDownhill() {
  if (rolling) return;
  rolling = true;
  $('#rollBtn').textContent = 'Rolling…';
  const tick = () => {
    const slope = P.gradient(state.vTip, VALLEY_SHARP).dTip;
    setValleyTip(state.vTip - 4 * slope);
    if (Math.abs(state.vTip - BEST.tip) > 0.03) requestAnimationFrame(tick);
    else { rolling = false; $('#rollBtn').textContent = 'Let it roll downhill'; }
  };
  requestAnimationFrame(tick);
}

/* =========================================================================
   Steps
   ========================================================================= */

/* =========================================================================
   Act 6 — what it was, and the part that is not maths
   ========================================================================= */

let recapClock = 0;
let recapRunning = false;

function drawRecap() {
  const pl = plot.measure();
  pl.clear();
  loopDiagram(pl, [
    { k: 'Guess', v: 'a curve, however lazy' },
    { k: 'Measure', v: 'how surprised was it by what really happened?' },
    { k: 'Nudge', v: 'move the way that makes the surprise smaller' },
  ], {
    active: Math.floor(recapClock / 900) % 3,
    accent: pl.t.d1,
    returnLabel: 'the identical loop from lesson 1',
    caption: 'Only the middle box changed. "Typical miss" became "surprise" — and that was the whole difference.',
  });
  setLegend([{ label: 'The same learning loop', color: pl.t.d1, kind: 'line' }]);
  setNote('A model that answers with a <b>chance</b> instead of a yes or no is being honest about what it does not know. That is worth more than it sounds.');
  describe('The same three-stage loop as the previous lesson, with the measurement changed from typical miss to surprise.');
}

/* =========================================================================
   Checkpoints
   ========================================================================= */

/** A tiny pass/fail strip with an S-curve of the given shape. */
function miniCurve(pl, tip, sharp) {
  const t = pl.t;
  pl.setDomain(X_DOM, [-0.12, 1.12]);
  for (const p of P.pts) {
    pl.dot(p.x, p.passed ? 1.02 : -0.02, { r: 2.2, fill: p.passed ? t.d3 : t.d2, ring: false });
  }
  const pts = [];
  for (let i = 0; i <= 70; i++) {
    const x = X_DOM[0] + (i / 70) * (X_DOM[1] - X_DOM[0]);
    pts.push([x, P.chance(tip, sharp, x)]);
  }
  pl.clip(() => pl.path(pts, { color: t.d1, width: 2.5 }));
}

const CHECKS = {
  cutoff: {
    id: 'lg-predict-cutoff',
    kind: 'predict',
    question: 'One hard line: pass everyone past it, fail everyone before it. How many of the 40 can it get right?',
    note: 'Have a proper look at the chart behind this first. The passes and fails overlap in the middle.',
    options: [
      {
        label: 'All 40 — just put the line in the right place',
        why: `This is the natural guess, and finding out it is wrong is the point of the whole lesson.
              Wherever you put the line, some hard workers failed and some slackers passed. The best any
              single line manages here is <b>${BEST_CUT.n} of 40</b>. Go and try to beat it — you cannot.`,
      },
      {
        label: `About ${BEST_CUT.n} — the overlap defeats it`,
        ok: true,
        why: `Right. The two groups <b>overlap</b>, so no vertical line can ever split them cleanly. The
              best is <b>${BEST_CUT.n} of 40</b>. The interesting question is not how to squeeze out one
              more, but what to say about the students in the muddle — and "definitely a pass" is not it.`,
      },
      {
        label: 'About half — it is barely better than a coin',
        why: `It does much better than that. Revision genuinely helps, so a line does catch the clear
              cases at both ends — around <b>${BEST_CUT.n} of 40</b>. It only fails in the middle, which
              is exactly where the interesting students are.`,
      },
    ],
  },

  meaning: {
    id: 'lg-what-is-a-chance',
    kind: 'check',
    question: 'The curve says Sam has a 61% chance of passing. What does that actually mean?',
    options: [
      {
        label: 'Sam will score about 61 marks',
        why: `A tempting mix-up, because both are numbers on a chart — but this model was never told
              anyone's <b>score</b>. It only ever saw passed or failed. 61 is not a mark; it is a level
              of confidence.`,
      },
      {
        label: 'Of many students like Sam, about 6 in 10 pass',
        ok: true,
        why: `That is the honest reading. The model cannot tell you about Sam <em>specifically</em> — it
              has never met Sam. It can tell you what usually happens to people who revised that much.
              Sam will pass or fail; there is no 61% outcome.`,
      },
      {
        label: 'Sam will pass — 61% is more than half',
        why: `That is a decision, not a prediction — and it is <em>your</em> decision, not the model's.
              You just chose to treat anything above 50% as a pass. A school deciding who needs extra
              help might set that line at 80% instead. Where the line goes is a human choice, and it
              changes who gets caught.`,
      },
    ],
  },

  train: {
    id: 'lg-predict-shape',
    kind: 'predict',
    question: 'Chasing "surprise" down as far as it will go — which curve does the machine settle on?',
    note: 'Green dots along the top passed; orange along the bottom failed.',
    options: [
      {
        label: 'A near-vertical cliff — decisive',
        paint: (pl) => miniCurve(pl, BEST.tip, 9),
        why: `This is the trap, and almost everyone falls into it — a cliff looks confident and confident
              looks clever. But a cliff claims <b>99% certain</b> about students sitting right in the
              muddle, and when it is wrong there it is <em>catastrophically</em> surprised. Overconfidence
              is punished harder than caution.`,
      },
      {
        label: 'A gentle S, leaning where the data leans',
        ok: true,
        paint: (pl) => miniCurve(pl, BEST.tip, BEST.sharp),
        why: `It settles on a curve that is <b>confident at the edges and cagey in the middle</b> —
              because that is genuinely what the data supports. The slope you see is the model saying
              "around here, I really am not sure."`,
      },
      {
        label: 'A flat line at 50% — refuse to commit',
        paint: (pl) => miniCurve(pl, 5, 0.02),
        why: `Safe, but useless: it says "coin flip" to a student who revised nine hours and to one who
              revised none. Refusing to commit is also surprising — it is mildly surprised by every
              single student instead of badly surprised by a few, and that adds up.`,
      },
    ],
  },

  threshold: {
    id: 'lg-threshold-ethics',
    kind: 'recall',
    question: 'A hospital screens for a disease. The model gives each patient a chance. Where should "call it positive" sit?',
    note: 'The maths gives you the chance. It does not give you this.',
    options: [
      {
        label: 'At 50% — that is the fair middle',
        why: `Fair-looking, but think about the two mistakes. Missing a sick patient could be fatal; a
              false alarm costs a follow-up test. Those are <em>not</em> equal, so the line should not sit
              in the middle. Screening usually sets it far lower — around 10% — and accepts many false
              alarms to miss almost nobody.`,
      },
      {
        label: 'Wherever the two kinds of mistake balance out in real life',
        ok: true,
        why: `Yes — and notice that <b>no amount of maths can tell you where that is</b>. The model
              supplies the chance; a human decides what to do with it, by weighing a missed illness
              against a false alarm. The same model with a different threshold is a different policy.
              This is where machine learning stops being maths and starts being a choice someone is
              accountable for.`,
      },
      {
        label: 'As high as possible, so it is rarely wrong',
        why: `That makes the model look excellent and behave terribly. Set it at 99% and it declares
              almost everyone healthy — it will be right most of the time, because most people are, and
              it will miss nearly every genuinely sick patient. Being right often is not the same as
              being useful.`,
      },
    ],
  },
};

const steps = [
  {
    label: 'The question',
    title: 'A different kind of question',
    sub: 'Same forty students. This time: not "what score?", but "did they pass?"',
    brief: 'A yes / no question',
    beats: [
      {
        text: `<p>The same forty students you have already met. Nothing about them has changed.</p>
               <p>Only the question has. The pass mark is <b>${PASS_MARK}</b>, so every student is now simply <em>passed</em> along the top or <em>failed</em> along the bottom.</p>`,
        enter() { state.revealed = false; bandSpread = 0.62; },
      },
      {
        head: 'Meet Sam',
        text: `<p><b>Sam</b> revised <em>${ASK_HOURS} hours</em> and has not sat the exam yet. Will Sam pass?</p>
               <p>Look hard at the dots around that dashed line before you decide it is obvious.</p>`,
        enter() { state.revealed = false; bandSpread = 0.62; },
      },
      {
        head: 'The honest answer',
        text: `<p>Right where Sam sits, <b>passes and fails are mixed together</b>. Some students who revised that much passed; others did not.</p>
               <p>So a flat "yes" would be a lie, and so would a flat "no". The only truthful answer is a <em>chance</em>.</p>
               <p>Getting a machine to say that is what this lesson is about.</p>`,
        cta: 'Let me try first →',
        enter() { state.revealed = true; bandSpread = 0.62; },
      },
    ],
    draw: drawAsk,
  },

  {
    label: 'One hard line',
    title: 'Try a single cutoff',
    sub: 'Pick a number of hours. Pass everyone past it, fail everyone before it.',
    brief: 'You try first',
    beats: [
      {
        text: `<p>The obvious first idea: draw <b>one line</b>. Revise more than X hours and we predict a pass; less and we predict a fail.</p>
               <p>Slide it and watch the count. The ringed dots are the ones it gets wrong.</p>`,
        panels: ['cutoff', 'score'],
        enter() { state.cut = BEST_CUT.cut < 3 ? 5 : state.cut; bandSpread = 0.62; },
      },
      {
        ask: CHECKS.cutoff,
        text: `<p>Before you hunt for the perfect spot — how good can a single line possibly get?</p>`,
        panels: ['cutoff', 'score'],
      },
      {
        head: 'The wall you just hit',
        text: `<p>You cannot fix this by moving the line, because the two groups <b>overlap</b>. Wherever it goes, some hard workers failed and some slackers passed.</p>
               <p>Notice <em>where</em> the mistakes are: never at the edges, always in the muddle. The model is not a bit wrong everywhere — it is confidently wrong in one specific region.</p>
               <p>So stop trying to be right there, and start being honest instead.</p>`,
        panels: ['cutoff', 'score'],
        cta: 'Show me how →',
      },
    ],
    draw: drawCutoff,
  },

  {
    label: 'A softer line',
    title: 'From a wall to a slope',
    sub: 'Replace the hard line with a curve — confidence sliding from 0 to 100%.',
    brief: 'Soften the line',
    beats: [
      {
        text: `<p>Instead of a wall, a <b>ramp</b>. Far right: near-certain pass. Far left: near-certain fail. In between, an honest maybe.</p>
               <p>Two numbers shape it — the <em>tipping point</em> where it crosses 50%, and the <em>sharpness</em> of the turn. Drag both and watch.</p>
               <p>This S is the shape at the heart of logistic regression.</p>`,
        panels: ['curve', 'score'],
        enter() { state.curve = { tip: 5, sharp: 1 }; syncCurve(); bandSpread = 1; },
      },
      {
        ask: CHECKS.meaning,
        text: `<p>The curve now answers Sam with a percentage rather than a verdict. Worth being precise about what that number is claiming.</p>`,
        panels: ['curve', 'score'],
      },
      {
        head: 'A new thing to make small',
        text: `<p>Last lesson the machine chased "typical miss". Here it chases <b>surprise</b>: how shocked the curve is by what actually happened.</p>
               <p>Say 95% about someone who failed and the surprise is enormous. Say 55% and it is mild. Being <em>confidently wrong</em> is what costs.</p>`,
        panels: ['curve', 'score'],
        cta: 'Hand it over →',
      },
    ],
    draw: drawCurve,
  },

  {
    label: 'The machine',
    title: 'One student at a time',
    sub: 'It starts with a lazy, near-flat guess and sharpens as it meets each student.',
    brief: 'Now let the machine try',
    beats: [
      {
        text: `<p>Same machine as last lesson, and the same three boxes. Only the middle one changed: <em>typical miss</em> became <em>surprise</em>.</p>
               <p>It starts almost flat — everyone a coin-flip — and meets one student at a time. Called a passer a likely fail? Slide the curve their way.</p>`,
        panels: ['score'],
        enter() { setNote('It begins almost flat: everyone a coin-flip.'); bandSpread = 1; },
      },
      {
        ask: CHECKS.train,
        text: `<p>It will push the surprise down as far as it will go. The question is what shape that leaves.</p>`,
        panels: ['score'],
      },
      {
        head: 'Watch it settle',
        text: `<p>Press <b>Start learning</b> and watch two things at once: the curve steepening, and the surprise falling.</p>
               <p>It stops somewhere <em>confident at the edges and cagey in the middle</em> — which is exactly what the data supports and nothing more.</p>`,
        panels: ['score', 'train'],
        cta: 'Why does that work? →',
        enter() { setNote('Press <b>Start learning</b>.'); },
      },
    ],
    exit() { playing = false; $('#playBtn').textContent = 'Start learning'; },
    draw: drawTrain,
  },

  {
    label: 'Why it works',
    title: 'Surprise is a valley',
    sub: 'Hold the sharpness still, move one knob, and surprise traces a U.',
    brief: 'Why the rule works',
    beats: [
      {
        text: `<p>Set the tipping point too early and the curve is constantly surprised by the failures. Too late and the passers surprise it instead.</p>
               <p>Somewhere in between it is least surprised of all.</p>`,
        enter() { if (!trainer.done) { while (trainer.step()); } setValleyTip(2); bandSpread = 1; },
      },
      {
        head: 'The same picture as last time',
        text: `<p>Plot surprise against the tipping point and you get a <b>valley</b> — the identical shape from lesson 1, from a completely different measurement.</p>
               <p>Drag the tipping point, then let it roll. The machine never sees this curve; it only feels the slope.</p>
               <p>That is worth sitting with. <em>Two different questions, two different measurements, one shape.</em></p>`,
        panels: ['valley', 'score'],
        cta: 'So what was that? →',
      },
    ],
    exit() { rolling = false; $('#rollBtn').textContent = 'Let it roll downhill'; },
    draw: drawValley,
  },

  {
    label: 'So what?',
    title: 'The same machine, and one human decision',
    sub: 'What changed is that the answer is now a chance — and somebody has to decide what to do with it.',
    brief: 'What you actually learned',
    beats: [
      {
        text: `<p>Swapping "how far off?" for "how surprised?" is the <b>entire</b> difference between this lesson and the last one. The loop is untouched.</p>
               <p>That is the pattern to carry forward: to solve a new kind of problem, you usually do not need a new kind of machine. You need a new way to measure being wrong.</p>`,
      },
      {
        head: 'The words the grown-ups use',
        text: `<p>Every one of these turns up constantly once you start reading about AI.</p>`,
        panels: ['recap'],
      },
      {
        ask: CHECKS.threshold,
        text: `<p>One last thing, and it is not really maths at all — it is the decision the maths hands back to a human.</p>`,
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
  panels: {
    score: $('#panel-score'), cutoff: $('#panel-cutoff'), curve: $('#panel-curve'),
    train: $('#panel-train'), valley: $('#panel-valley'), recap: $('#panel-recap'),
  },
};

const lesson = new Lesson({ steps, els });

const { ask } = attach(lesson, {
  id: 'logistic-regression',
  total: 4,
  recap: {
    terms: [
      ['The S-curve of chances', 'Logistic regression', 'the standard way to answer a yes/no question'],
      ['The S shape itself', 'The sigmoid', 'squashes any number into a chance between 0 and 1'],
      ['Surprise', 'Log loss', 'punishes being confident and wrong far harder than being unsure'],
      ['Where you call it a yes', 'The threshold', 'a human decision, not part of the model'],
      ['Sharpness and tipping point', 'Weight and bias', 'the two numbers the machine actually moves'],
    ],
    uses: [
      '<b>Spam filters</b> — "how likely is it that this email is junk?"',
      '<b>Banks</b> deciding whether a card payment looks stolen',
      '<b>Hospitals</b> flagging which patients are most at risk overnight',
      '<b>Any app</b> that shows a confidence percentage rather than a flat answer',
    ],
  },
});

const theme = initTheme($('#themeBtn'));
theme.onChange(() => { ask.repaint(); lesson.invalidate(); });

/* --- act 2: cutoff -------------------------------------------------------- */

slider($('#cut'), $('#cutVal'), fmt1, (v) => { state.cut = v; lesson.invalidate(); });
$('#cutBest').addEventListener('click', () => {
  $('#cut').value = BEST_CUT.cut;
  $('#cutVal').textContent = fmt1(BEST_CUT.cut);
  state.cut = BEST_CUT.cut;
  lesson.invalidate();
});

/* --- act 3: the curve ----------------------------------------------------- */

function syncCurve() {
  $('#tip_').value = state.curve.tip;
  $('#tipVal').textContent = fmt1(state.curve.tip);
  $('#sharp').value = state.curve.sharp;
  $('#sharpVal').textContent = fmt1(state.curve.sharp);
}
slider($('#tip_'), $('#tipVal'), fmt1, (v) => { state.curve.tip = v; lesson.invalidate(); });
slider($('#sharp'), $('#sharpVal'), fmt1, (v) => { state.curve.sharp = v; lesson.invalidate(); });

$('#resetCurve').addEventListener('click', () => { state.curve = { tip: 5, sharp: 1 }; syncCurve(); lesson.invalidate(); });
$('#snapBest').addEventListener('click', () => {
  const from = { ...state.curve };
  const t0 = performance.now();
  const run = (now) => {
    const k = clamp((now - t0) / 750, 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    state.curve = { tip: lerp(from.tip, BEST.tip, e), sharp: lerp(from.sharp, BEST.sharp, e) };
    syncCurve(); lesson.invalidate();
    if (k < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
});

/* --- act 4: training ------------------------------------------------------ */

segmented($('#paceSeg'), (v) => { pace = +v; });

$('#playBtn').addEventListener('click', () => {
  if (trainer.done) restart();
  playing = !playing;
  $('#playBtn').textContent = playing ? 'Pause' : 'Start learning';
  if (playing) { lastFrame = performance.now(); stepClock = pace; lesson.animateWhile(() => playing); pump(); }
});
$('#stepBtn').addEventListener('click', () => { playing = false; $('#playBtn').textContent = 'Start learning'; doStep(); });
$('#restartBtn').addEventListener('click', restart);

function restart() {
  playing = false;
  $('#playBtn').textContent = 'Start learning';
  trainer.reset();
  setNote('Press <b>Start learning</b>.');
  lesson.invalidate();
}
function doStep() {
  const r = trainer.step();
  if (!r) { finish(); return; }
  narrate(r);
  lesson.invalidate();
}
function narrate(r) {
  const truth = r.point.passed ? 'passed' : 'failed';
  const saidPass = r.said >= 0.5;
  const right = saidPass === !!r.point.passed;
  const cls = right ? 'down' : 'up';
  setNote(`<b>${r.point.name}</b> revised <b>${fmt1(r.point.x)}h</b> and actually <b>${truth}</b>.
    The curve gave <b>${pct(r.said)}</b> chance of passing — <span class="${cls}">${right ? 'the right call' : 'the wrong call'}</span>,
    so it nudged the curve their way.`);
}
function finish() {
  playing = false;
  $('#playBtn').textContent = 'Start over';
  const got = P.correct(trainer.tip, trainer.sharp);
  setNote(`<b>Done.</b> The curve now calls <b>${got} of 40</b> right, tipping over at <b>${fmt1(trainer.tip)}h</b> — as good as this shape gets. It never saw the whole class at once; it just kept stepping downhill.`);
  lesson.invalidate();
}
function pump() {
  if (!playing) return;
  const now = performance.now();
  const dt = now - lastFrame; lastFrame = now;
  stepClock += dt;
  while (stepClock >= pace && playing) { stepClock -= pace; doStep(); if (trainer.done) break; }
  if (playing) requestAnimationFrame(pump);
}

/* --- act 5: valley -------------------------------------------------------- */

$('#vTip').addEventListener('input', (e) => {
  rolling = false; $('#rollBtn').textContent = 'Let it roll downhill';
  setValleyTip(+e.target.value);
});
$('#rollBtn').addEventListener('click', rollDownhill);
$('#vLeft').addEventListener('click', () => setValleyTip(state.vTip - 0.5));
$('#vRight').addEventListener('click', () => setValleyTip(state.vTip + 0.5));

/* --- pointer -------------------------------------------------------------- */

function localPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', (e) => {
  if (!lesson.step.panels?.includes('curve')) return;
  const { x, y } = localPos(e);
  if (Math.hypot(plot.sx(state.curve.tip) - x, plot.sy(0.5) - y) < 18) {
    state.dragging = 'tip';
    canvas.setPointerCapture(e.pointerId);
    lesson.invalidate();
  }
});
canvas.addEventListener('pointermove', (e) => {
  const { x, y } = localPos(e);
  const s = lesson.step;

  if (state.dragging === 'tip') {
    state.curve.tip = clamp(plot.ix(x), TIP_DOM[0], TIP_DOM[1]);
    syncCurve();
    lesson.invalidate();
    return;
  }

  // tooltip on nearest student, in whichever plot the step draws
  const activePlot = plot;
  const near = nearestPoint(x, y, activePlot);
  if (near !== state.hovered) { state.hovered = near; lesson.invalidate(); }
  if (near) {
    const { tip, sharp } = state.curve;
    const extra = s.panels?.includes('curve') || s.panels?.includes('valley')
      ? `<span>curve says ${pct(P.chance(tip, sharp, near.x))} pass</span>` : '';
    showTip(activePlot.sx(near.x), activePlot.sy(dotY(near)),
      `<strong>${near.name}</strong><span>${fmt1(near.x)} h · scored ${near.score.toFixed(0)} · ${near.passed ? 'passed' : 'failed'}</span>${extra}`);
  } else hideTip();
});
const endDrag = () => { if (state.dragging) { state.dragging = null; lesson.invalidate(); } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', () => { state.hovered = null; hideTip(); lesson.invalidate(); });

canvas.addEventListener('click', () => {
  if (lesson.step.label === 'The question') { state.revealed = true; lesson.invalidate(); }
});

/* --- table ---------------------------------------------------------------- */

$('#tableBtn').addEventListener('click', () => {
  const tv = $('#tableView');
  const open = tv.hidden;
  if (open) buildTable();
  tv.hidden = !open;
  $('#tableBtn').setAttribute('aria-expanded', String(open));
  $('#tableBtn').textContent = open ? 'Hide the numbers' : 'Show the numbers';
});

/* --- go ------------------------------------------------------------------- */

syncCurve();
lesson.start();
