/* =========================================================================
   Lesson — How a machine learns to draw a line.

   Five acts, in this order and for this reason:
     1  a question the data can answer but a human cannot eyeball
     2  the learner fits a line by hand, and struggles
     3  the struggle gets a number: squared miss
     4  the machine does the same thing, but with a rule
     5  why that rule works: wrongness is a valley

   Act 2 exists so act 4 lands. Watching gradient descent means nothing until
   you have personally failed to do it by hand.
   ========================================================================= */

import { Plot, ticks, clamp, lerp } from '../src/core/plot.js';
import { loopDiagram } from '../src/core/diagram.js';
import { makeClass, Problem, Trainer } from '../src/ml/linreg.js';
import { Lesson, initTheme, $, slider, segmented } from '../src/lesson/shell.js';
import { attach } from '../src/lesson/teach.js';

/* --- state ---------------------------------------------------------------- */

const X_DOM = [0, 10.2];
const Y_DOM = [0, 100];
const TILT_DOM = [-2, 12];
const LEVEL_DOM = [20, 100];
const ASK_HOURS = 6;

const P = new Problem(makeClass());
const BEST = P.bestFit();
const FLAT = P.flat();
const BEST_MISS = P.rmse(BEST.m, BEST.c);

const canvas = $('#canvas');
const wrap = $('#canvasWrap');
const tipEl = $('#tip');
const plot = new Plot(canvas);

const state = {
  user: { m: 0, c: FLAT.c },
  userBestMiss: Infinity,
  showSquares: false,
  showBest: false,
  hovered: null,        // nearest student under the pointer
  dragging: null,       // 'level' | 'tilt'
  revealed: false,      // act 1: the answer for the asked student
  marked: false,        // act 1: Nour has been introduced
};

// Starts at a plainly-wrong flat 50 rather than the class average, so both
// tilt and height visibly have ground to cover and the line is seen to both
// rise and steepen. These four numbers are pinned by tests/linreg.test.mjs.
const TRAIN_OPTS = { lr: 0.012, epochs: 5, decay: 0.85, start: { m: 0, c: 50 } };

let trainer = new Trainer(P, TRAIN_OPTS);
let playing = false;
let pace = 220;
let stepClock = 0;
let lastFrame = 0;

/* --- helpers -------------------------------------------------------------- */

const fmt1 = (v) => v.toFixed(1);
const model = () => state.user;
const missOf = (mm) => P.rmse(mm.m, mm.c);

function setLegend(items) {
  $('#legend').innerHTML = items.map((it) => {
    if (it.scale) {
      const bar = `linear-gradient(90deg, ${it.scale.join(',')})`;
      return `<span class="legend__item"><span style="width:76px;height:10px;border-radius:3px;background:${bar};border:1px solid var(--border)"></span>${it.label}</span>`;
    }
    const cls = it.kind === 'line' ? 'legend__swatch legend__swatch--line'
      : it.kind === 'dash' ? 'legend__swatch legend__swatch--dash'
      : 'legend__swatch';
    return `<span class="legend__item"><span class="${cls}" style="--_c:${it.color}"></span>${it.label}</span>`;
  }).join('');
}

function describe(text) { canvas.setAttribute('aria-label', text); }

/**
 * The commentary strip welded under the chart.
 * The content is wrapped in a span because the strip is a flex container:
 * bare text nodes around <b> would each become separate flex items and the
 * spaces between them would collapse ("This tilt istoo flat").
 */
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

/** Nearest student to a pointer position, within a forgiving radius. */
function nearestPoint(px, py, radius = 26) {
  let best = null, bestD = radius * radius;
  for (const p of P.pts) {
    const dx = plot.sx(p.x) - px, dy = plot.sy(p.y) - py;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

/* --- shared marks --------------------------------------------------------- */

function drawStudents(pl, { dim = false, active = null } = {}) {
  const t = pl.t;
  for (const p of P.pts) {
    const isActive = active && p.id === active.id;
    const isHover = state.hovered && p.id === state.hovered.id;
    if (isActive) continue;
    pl.dot(p.x, p.y, {
      r: isHover ? 6.5 : 5,
      fill: t.d1,
      alpha: dim ? 0.35 : 1,
    });
  }
  if (active) {
    const px = pl.sx(active.x), py = pl.sy(active.y);
    pl.ctx.save();
    pl.ctx.beginPath();
    pl.ctx.arc(px, py, 14, 0, Math.PI * 2);
    pl.ctx.strokeStyle = t.d1;
    pl.ctx.lineWidth = 2;
    pl.ctx.stroke();
    pl.ctx.restore();
    pl.dot(active.x, active.y, { r: 7, fill: t.d1 });
  }
}

/** Vertical stick from each student to the line: the miss, one per student. */
function drawMisses(pl, mm) {
  const t = pl.t;
  for (const p of P.pts) {
    const yhat = P.predict(mm.m, mm.c, p.x);
    pl.segment(p.x, p.y, p.x, yhat, { color: t.d2, width: 1.5, alpha: 0.5 });
  }
}

/** Each miss as a square whose area is the squared error. */
function drawSquares(pl, mm) {
  const t = pl.t;
  pl.clip(() => {
    for (const p of P.pts) {
      const yhat = P.predict(mm.m, mm.c, p.x);
      const py = pl.sy(p.y), pyh = pl.sy(yhat);
      const side = Math.abs(pyh - py);
      if (side < 1) continue;
      const px = pl.sx(p.x);
      // grow away from the line so squares do not cover it
      const left = yhat > p.y ? px : px - side;
      const top = Math.min(py, pyh);
      pl.ctx.save();
      pl.ctx.fillStyle = t.d2wash;
      pl.ctx.strokeStyle = t.d2;
      pl.ctx.globalAlpha = 0.75;
      pl.ctx.lineWidth = 1;
      pl.ctx.fillRect(left, top, side, side);
      pl.ctx.strokeRect(left + 0.5, top + 0.5, side - 1, side - 1);
      pl.ctx.restore();
    }
  });
}

function drawUserLine(pl, mm, { label = 'Your line', color } = {}) {
  const t = pl.t;
  const col = color ?? t.d2;
  const y0 = P.predict(mm.m, mm.c, X_DOM[0]);
  const y1 = P.predict(mm.m, mm.c, X_DOM[1]);
  pl.segment(X_DOM[0], y0, X_DOM[1], y1, { color: col, width: 2.5 });
  if (label) {
    const ly = clamp(P.predict(mm.m, mm.c, X_DOM[1] - 0.35), Y_DOM[0] + 8, Y_DOM[1] - 6);
    pl.label(label, X_DOM[1] - 0.35, ly, { color: col, align: 'right', dy: -12, size: 12.5 });
  }
}

function drawBestLine(pl) {
  const t = pl.t;
  const y0 = P.predict(BEST.m, BEST.c, X_DOM[0]);
  const y1 = P.predict(BEST.m, BEST.c, X_DOM[1]);
  pl.segment(X_DOM[0], y0, X_DOM[1], y1, { color: t.d3, width: 2, dash: [7, 5] });
  pl.label('Best possible', X_DOM[0] + 0.3, P.predict(BEST.m, BEST.c, X_DOM[0] + 0.3), {
    color: t.d3, align: 'left', dy: 15, size: 12.5,
  });
}

function frameScatter(pl) {
  pl.frame({
    xTicks: ticks(0, 10, 1),
    yTicks: ticks(0, 100, 20),
    xLabel: 'Hours revised',
    yLabel: 'Exam score',
  });
}

/** The two grab handles that make the line directly draggable. */
function drawHandles(pl, mm) {
  const t = pl.t;
  const hx = X_DOM[1] - 1.6;
  const pts = [
    { x: P.center, y: mm.c, key: 'level' },
    { x: hx, y: P.predict(mm.m, mm.c, hx), key: 'tilt' },
  ];
  for (const h of pts) {
    if (h.y < Y_DOM[0] || h.y > Y_DOM[1]) continue;
    const px = pl.sx(h.x), py = pl.sy(h.y);
    pl.ctx.save();
    pl.ctx.beginPath();
    pl.ctx.arc(px, py, 8, 0, Math.PI * 2);
    pl.ctx.fillStyle = t.surface;
    pl.ctx.fill();
    pl.ctx.strokeStyle = t.d2;
    pl.ctx.lineWidth = state.dragging === h.key ? 3.5 : 2.5;
    pl.ctx.stroke();
    pl.ctx.restore();
  }
  pl.label('drag', pl.sx(hx), pl.sy(P.predict(mm.m, mm.c, hx)) + 21, {
    color: t.muted, size: 11, weight: 500, align: 'center', space: true,
  });
}

/* --- stat tiles ----------------------------------------------------------- */

/** @param mm the model the hero tile should describe — the one on screen. */
function updateStats(mm, { aKey = 'Your best', aVal } = {}) {
  $('#statMiss').textContent = fmt1(missOf(mm));
  $('#statAKey').textContent = aKey;
  $('#statA').textContent = aVal ?? (state.userBestMiss === Infinity ? '—' : fmt1(state.userBestMiss));
  $('#statB').textContent = fmt1(BEST_MISS);
}

/* --- table view ----------------------------------------------------------- */

function buildTable() {
  const mm = model();
  const rows = P.pts.map((p) => {
    const yhat = P.predict(mm.m, mm.c, p.x);
    return `<tr><td>${p.name}</td><td>${p.x.toFixed(1)}</td><td>${p.y.toFixed(1)}</td>
            <td>${yhat.toFixed(1)}</td><td>${(p.y - yhat).toFixed(1)}</td></tr>`;
  }).join('');
  $('#tableView').innerHTML = `
    <table>
      <caption class="visually-hidden">Every student, with the current line's prediction and miss</caption>
      <thead><tr><th>Student</th><th>Hours</th><th>Score</th><th>Line says</th><th>Miss</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* =========================================================================
   Act 1 — the question
   ========================================================================= */

function drawAsk() {
  const pl = plot.measure().setDomain(X_DOM, Y_DOM);
  pl.clear();
  frameScatter(pl);

  const t = pl.t;

  // Nour arrives on the second slide, not the first: the reader gets to take
  // the data in before being handed the problem with it.
  if (state.marked) {
    pl.clip(() => {
      pl.segment(ASK_HOURS, Y_DOM[0], ASK_HOURS, Y_DOM[1], {
        color: t.muted, width: 1.5, dash: [5, 5], alpha: 0.8,
      });
    });
  }

  drawStudents(pl);

  if (state.marked) {
    if (state.revealed) {
      const y = P.predict(BEST.m, BEST.c, ASK_HOURS);
      pl.dot(ASK_HOURS, y, { r: 7, fill: t.d2 });
      pl.label(`about ${Math.round(y)}`, ASK_HOURS, y, {
        color: t.d2, dx: 13, dy: -13, size: 13,
      });
    } else {
      pl.chip('? ', pl.sx(ASK_HOURS), pl.top + 14, { color: t.muted });
    }
    pl.label('Nour revised 6 hours', pl.sx(ASK_HOURS), pl.top + 38, {
      color: t.ink2, size: 12.5, align: 'center', space: true,
    });
  }

  setLegend([{ label: 'One dot = one student', color: t.d1 }]);
  setNote(!state.marked
    ? 'Hover any dot to meet that student — their name, their hours, their score.'
    : state.revealed
      ? 'That guess came from the dots either side of the line — which is exactly the job you are about to hand to a machine.'
      : 'Nothing sits on the dashed line. Whatever we answer has to be worked out, not looked up.');
  describe(`Scatter plot of ${P.pts.length} students, revision hours against exam score.${state.marked ? ' A marker at 6 hours asks what score to expect.' : ''}`);
}

/* =========================================================================
   Acts 2 & 3 — fit it by hand, then measure the miss
   ========================================================================= */

function drawManual() {
  const pl = plot.measure().setDomain(X_DOM, Y_DOM);
  pl.clear();
  frameScatter(pl);
  const t = pl.t;
  const mm = model();

  if (state.showSquares) drawSquares(pl, mm);
  else drawMisses(pl, mm);

  drawStudents(pl);
  if (state.showBest) drawBestLine(pl);
  drawUserLine(pl, mm);
  drawHandles(pl, mm);

  const legend = [
    { label: 'One dot = one student', color: t.d1 },
    { label: 'Your line', color: t.d2, kind: 'line' },
    state.showSquares
      ? { label: 'Squared miss', color: t.d2soft }
      : { label: 'Miss', color: t.d2, kind: 'line' },
  ];
  if (state.showBest) legend.push({ label: 'Best possible', color: t.d3, kind: 'dash' });
  setLegend(legend);

  updateStats(mm);

  const miss = missOf(mm);
  const over = miss - BEST_MISS;
  setNote(
    over < 0.15 ? 'That is as good as a straight line can get on this class. Nobody could do better — including the machine.'
      : over < 1.2 ? `Close. You are <b>${fmt1(over)}</b> points off the best line anyone could draw.`
        : over < 4 ? `Getting there — <b>${fmt1(over)}</b> points worse than the best possible line. Try a little more tilt.`
          : `Your line is <b>${fmt1(over)}</b> points worse than the best one. Look at where the sticks are longest.`);

  describe(`Your line has a typical miss of ${fmt1(miss)} points. The best possible line misses by ${fmt1(BEST_MISS)}.`);
}

/* =========================================================================
   Act 4 — the machine's turn
   ========================================================================= */

function drawTrain() {
  plot.measure();
  const t = plot.t;
  const stripH = Math.min(150, Math.max(104, plot.h * 0.26));

  // top: the fit
  const pl = new Plot(canvas, { margin: { t: 22, r: 28, b: stripH + 58, l: 56 } });
  pl.w = plot.w; pl.h = plot.h; pl.t = t;
  pl.setDomain(X_DOM, Y_DOM);
  plot.clear();
  pl.frame({
    xTicks: ticks(0, 10, 1),
    yTicks: ticks(0, 100, 20),
    xLabel: 'Hours revised',
    yLabel: 'Exam score',
  });

  const last = trainer.last;
  const mm = { m: trainer.m, c: trainer.c };

  drawStudents(pl, { active: last?.point ?? null });

  if (state.showBest) drawBestLine(pl);

  // ghost of where the line was before this student
  if (last) {
    const g = last.from;
    pl.segment(X_DOM[0], P.predict(g.m, g.c, X_DOM[0]), X_DOM[1], P.predict(g.m, g.c, X_DOM[1]),
      { color: t.d2, width: 2, alpha: 0.24 });
  }
  drawUserLine(pl, mm, { label: "Machine's line" });

  // the miss it is reacting to
  if (last) {
    const p = last.point;
    pl.segment(p.x, p.y, p.x, last.guess, { color: t.d2, width: 2.5, dash: [4, 4] });
    pl.dot(p.x, last.guess, { r: 5, fill: t.d2 });
    // flip the callout inward near the right edge, or it gets clipped
    const nearRight = p.x > X_DOM[0] + (X_DOM[1] - X_DOM[0]) * 0.7;
    pl.label(`${last.error > 0 ? 'too high' : 'too low'} by ${Math.abs(last.error).toFixed(1)}`,
      p.x, (p.y + last.guess) / 2, {
        color: t.d2, size: 12,
        dx: nearRight ? -12 : 12,
        align: nearRight ? 'right' : 'left',
      });
  }

  // bottom: loss over steps
  const lp = new Plot(canvas, { margin: { t: plot.h - stripH, r: 28, b: 46, l: 56 } });
  lp.w = plot.w; lp.h = plot.h; lp.t = t;
  // round the top tick to something a reader can hold in their head
  const rawMax = trainer.history[0].loss;
  const mag = 10 ** Math.floor(Math.log10(rawMax));
  const maxLoss = Math.ceil(rawMax / (mag / 2)) * (mag / 2);
  lp.setDomain([0, trainer.totalSteps], [0, maxLoss]);
  lp.frame({
    xTicks: ticks(0, trainer.totalSteps, P.pts.length),
    yTicks: [0, maxLoss / 2, maxLoss],
    xLabel: 'Students seen',
    yFmt: (v) => Math.round(v),
  });
  lp.path(trainer.history.map((h) => [h.step, h.loss]), { color: t.d2, width: 2 });
  const h = trainer.history.at(-1);
  lp.dot(h.step, h.loss, { r: 4.5, fill: t.d2 });
  lp.label('wrongness', lp.left + 8, lp.top + 14, {
    color: t.muted, size: 11.5, weight: 500, space: true,
  });

  setLegend([
    { label: 'One dot = one student', color: t.d1 },
    { label: "Machine's line", color: t.d2, kind: 'line' },
    ...(state.showBest ? [{ label: 'Best possible', color: t.d3, kind: 'dash' }] : []),
  ]);

  updateStats(mm, { aKey: 'Your best' });
  describe(`Training step ${trainer.steps} of ${trainer.totalSteps}. Typical miss ${fmt1(P.rmse(trainer.m, trainer.c))} points.`);
}

/* =========================================================================
   Act 5 — the valley

   The earlier version of this act drew the full 2-D loss surface over both
   knobs. It looked handsome and taught nothing: the axes quietly stop being
   hours-and-score and become the knobs instead, which is a large abstraction
   to spring on a 13-year-old four acts deep.

   So this act holds the height still and moves ONE knob. Wrongness against
   tilt is then just a U-shaped curve — a shape every student in this age
   group already knows — with a ball on it that they push around themselves.
   The line on the real data sits alongside and moves with it, so the link
   between "a setting" and "a point on the curve" is learned by hand rather
   than asserted in a caption.
   ========================================================================= */

const VALLEY_C = BEST.c;          // height parked at its best value
let vTilt = 0;
let rolling = false;

const valleyMiss = (m) => Math.sqrt(P.mseAt(m, VALLEY_C));

function drawValley() {
  plot.measure();
  const t = plot.t;
  const gap = 26;
  const half = (plot.w - gap) / 2;

  /* ---- left: the real data and the line this tilt produces ---- */
  const dp = new Plot(canvas, { margin: { t: 26, r: 14, b: 46, l: 52 } });
  dp.w = half; dp.h = plot.h; dp.t = t;
  dp.setDomain(X_DOM, Y_DOM);
  plot.clear();
  dp.frame({
    xTicks: ticks(0, 10, 2),
    yTicks: ticks(0, 100, 20),
    xLabel: 'Hours revised',
    yLabel: 'Exam score',
  });
  for (const p of P.pts) dp.dot(p.x, p.y, { r: 4, fill: t.d1 });
  dp.clip(() => {
    dp.segment(X_DOM[0], P.predict(vTilt, VALLEY_C, X_DOM[0]),
      X_DOM[1], P.predict(vTilt, VALLEY_C, X_DOM[1]), { color: t.d2, width: 2.5 });
  });
  dp.label('the line this tilt gives', dp.left, dp.top - 12, {
    color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false,
  });

  /* ---- right: wrongness against tilt ---- */
  const top = valleyMiss(TILT_DOM[0]);
  const vp = new Plot(canvas, { margin: { t: 26, r: 22, b: 46, l: half + gap + 52 } });
  vp.w = plot.w; vp.h = plot.h; vp.t = t;
  vp.setDomain(TILT_DOM, [0, Math.ceil(top / 5) * 5]);
  vp.frame({
    xTicks: ticks(-2, 12, 2),
    yTicks: ticks(0, Math.ceil(top / 5) * 5, 5),
    xLabel: 'Tilt  (extra score per extra hour)',
    yLabel: 'Typical miss',
  });

  // the valley floor, filled so it reads as ground rather than a line chart
  const curve = [];
  for (let i = 0; i <= 160; i++) {
    const m = TILT_DOM[0] + (i / 160) * (TILT_DOM[1] - TILT_DOM[0]);
    curve.push([m, valleyMiss(m)]);
  }
  // Drawn as neutral terrain, not a data series: blue already means "a
  // student" in the panel alongside, and one hue must not mean two things.
  vp.ctx.save();
  vp.ctx.beginPath();
  vp.ctx.moveTo(vp.sx(curve[0][0]), vp.sy(curve[0][1]));
  for (const [m, y] of curve) vp.ctx.lineTo(vp.sx(m), vp.sy(y));
  vp.ctx.lineTo(vp.sx(TILT_DOM[1]), vp.sy(0));
  vp.ctx.lineTo(vp.sx(TILT_DOM[0]), vp.sy(0));
  vp.ctx.closePath();
  vp.ctx.fillStyle = t.sunken;
  vp.ctx.fill();
  vp.ctx.restore();
  vp.path(curve, { color: t.muted, width: 2.5 });
  vp.label('how wrong every tilt is', vp.left, vp.top - 12, {
    color: t.ink2, size: 12.5, space: true, baseline: 'bottom', halo: false,
  });

  // the bottom
  vp.segment(BEST.m, 0, BEST.m, valleyMiss(BEST.m), { color: t.d3, width: 1.5, dash: [5, 5] });
  vp.dot(BEST.m, valleyMiss(BEST.m), { r: 5, fill: t.d3 });
  vp.label('bottom of the valley', BEST.m, valleyMiss(BEST.m), {
    color: t.d3, dx: 11, dy: 14, size: 12,
  });

  // the ball, and which way is downhill from it
  const my = valleyMiss(vTilt);
  const slope = P.gradient(vTilt, VALLEY_C).dm;
  if (Math.abs(vTilt - BEST.m) > 0.15) {
    const dir = slope > 0 ? -1 : 1;
    const bx = vp.sx(vTilt), by = vp.sy(my);
    vp.arrow(bx + dir * 17, by + 4, bx + dir * 55, by + 4, { color: t.d2, width: 2.5 });
    vp.label('downhill', bx + dir * 36, by + 22, {
      color: t.d2, size: 12, align: 'center', space: true,
    });
  }
  vp.ctx.save();
  vp.ctx.beginPath();
  vp.ctx.arc(vp.sx(vTilt), vp.sy(my), 11, 0, Math.PI * 2);
  vp.ctx.fillStyle = t.d2;
  vp.ctx.fill();
  vp.ctx.strokeStyle = t.surface;
  vp.ctx.lineWidth = 2.5;
  vp.ctx.stroke();
  vp.ctx.restore();
  vp.label(`out by ${fmt1(my)}`, vTilt, my, {
    color: t.ink, dx: 0, dy: -24, size: 13, align: 'center',
  });

  setLegend([
    { label: 'One dot = one student', color: t.d1 },
    { label: 'Your line, and your ball', color: t.d2, kind: 'line' },
    { label: 'The best tilt', color: t.d3, kind: 'dash' },
  ]);

  updateStats({ m: vTilt, c: VALLEY_C }, { aKey: 'Best tilt', aVal: fmt1(BEST.m) });

  const away = vTilt < BEST.m ? 'too flat' : 'too steep';
  setNote(Math.abs(vTilt - BEST.m) < 0.15
    ? 'You are at the bottom. Any change in either direction makes the line worse — that is what "best" means.'
    : `This tilt is <b>${away}</b>, so the ball sits up the slope at <b>${fmt1(my)}</b> points out. Downhill is to the <b>${slope > 0 ? 'left' : 'right'}</b>.`);

  describe(`A U-shaped curve of typical miss against tilt. The current tilt of ${fmt1(vTilt)} gives a miss of ${fmt1(my)} points; the lowest point of the curve is at tilt ${fmt1(BEST.m)}.`);
}

function setValleyTilt(v) {
  vTilt = clamp(v, TILT_DOM[0], TILT_DOM[1]);
  $('#vTilt').value = vTilt;
  $('#vTiltVal').textContent = fmt1(vTilt);
  lesson.invalidate();
}

/** One downhill step, at the speed of the eye rather than the algorithm. */
function rollDownhill() {
  if (rolling) return;
  rolling = true;
  $('#rollBtn').textContent = 'Rolling…';
  const tick = () => {
    const slope = P.gradient(vTilt, VALLEY_C).dm;
    setValleyTilt(vTilt - 0.015 * slope);
    if (Math.abs(vTilt - BEST.m) > 0.02) {
      requestAnimationFrame(tick);
    } else {
      rolling = false;
      $('#rollBtn').textContent = 'Let it roll downhill';
    }
  };
  requestAnimationFrame(tick);
}

/* =========================================================================
   Act 6 — what it was, and where it lives
   ========================================================================= */

let recapClock = 0;
let recapRunning = false;

function drawRecap() {
  const pl = plot.measure();
  pl.clear();
  const active = Math.floor(recapClock / 900) % 3;
  loopDiagram(pl, [
    { k: 'Guess', v: 'start with any line at all, however bad' },
    { k: 'Measure', v: 'how far off is it? one number' },
    { k: 'Nudge', v: 'move a little the way that makes it smaller' },
  ], {
    active,
    accent: pl.t.d2,
    returnLabel: 'and again, once per student',
    caption: 'Every model in this course is this loop. Only the middle box ever changes.',
  });

  setLegend([{ label: 'The learning loop', color: pl.t.d2, kind: 'line' }]);
  setNote('You have now seen a machine do this <b>200 times</b> — 40 students, five times over — and end up within a whisker of the best line that exists.');
  describe('A three-stage loop: guess, measure how wrong, nudge in the better direction, and repeat.');
}

/* =========================================================================
   Checkpoints

   Placed at the three moments where a student can otherwise coast: just
   before the machine runs, just before the valley is revealed, and at the
   end. Each one has to be answered before the payoff appears, because a
   demonstration you have not bet on teaches nothing.
   ========================================================================= */

/** A tiny scatter of the class, shared by every predicted outcome. */
function miniScatter(pl, line) {
  pl.setDomain(X_DOM, Y_DOM);
  const t = pl.t;
  for (const p of P.pts) pl.dot(p.x, p.y, { r: 2.2, fill: t.d1, ring: false });
  if (line) {
    pl.clip(() => {
      pl.segment(X_DOM[0], line(X_DOM[0]), X_DOM[1], line(X_DOM[1]), { color: t.d2, width: 2.5 });
    });
  }
}

/** A tiny "wrongness against tilt" curve of an arbitrary shape. */
function miniCurve(pl, f) {
  pl.setDomain([0, 1], [0, 1]);
  const t = pl.t;
  const pts = [];
  for (let i = 0; i <= 60; i++) pts.push([i / 60, f(i / 60)]);
  pl.path(pts, { color: t.muted, width: 2.5 });
  pl.ctx.save();
  pl.ctx.strokeStyle = t.grid;
  pl.ctx.lineWidth = 1.5;
  pl.ctx.beginPath();
  pl.ctx.moveTo(pl.left, pl.bottom);
  pl.ctx.lineTo(pl.right, pl.bottom);
  pl.ctx.stroke();
  pl.ctx.restore();
}

const CHECKS = {
  squares: {
    id: 'lr-why-square',
    kind: 'check',
    question: 'Why square each miss, instead of just adding the gaps up?',
    options: [
      {
        label: 'Squares are easier to add up',
        why: `Adding squares is actually <em>more</em> work, not less. The reason has nothing to do with
              effort — it is about what the total number is allowed to mean.`,
      },
      {
        label: 'So a miss of &minus;10 and a miss of +10 cannot cancel out',
        ok: true,
        why: `Exactly. A line sitting 10 points <b>above</b> Ali and 10 points <b>below</b> Bea is not a
              perfect line — but plain gaps would add to zero and call it perfect. Squaring makes every
              miss count as a miss. It has a useful second effect: one <em>terrible</em> miss now hurts
              more than several small ones, so the line refuses to abandon anybody.`,
      },
      {
        label: 'Because exam scores are never negative',
        why: `Scores are never negative, true — but the <b>misses</b> are. The line sits above some
              students and below others, so the gaps come out with both signs. That sign is the whole
              problem squaring fixes.`,
      },
    ],
  },

  train: {
    id: 'lr-predict-train',
    kind: 'predict',
    question: 'It starts by guessing 50 for everyone. Where does its line finish?',
    note: 'It cannot see the chart. It only ever compares one guess against one real score, then shifts a little. Pick the picture you think it lands on.',
    options: [
      {
        label: 'Nowhere — it stays flat',
        paint: (pl) => miniScatter(pl, () => 50),
        why: `It would, if it never checked its answers. But after every single student it compares its
              guess with the real score, and any mismatch is exactly the signal it uses to move. A flat
              line at 50 is wrong for nearly everybody, so nearly every student gives it a shove.`,
      },
      {
        label: 'Close to the line you were reaching for',
        ok: true,
        paint: (pl) => miniScatter(pl, (x) => P.predict(BEST.m, BEST.c, x)),
        why: `And it gets there having <b>never seen the whole picture</b> — no scatter plot, no overview,
              just one student at a time and a rule for which way to lean. Watch the typical miss fall as
              it goes.`,
      },
      {
        label: 'Way too steep — it overshoots',
        paint: (pl) => miniScatter(pl, (x) => P.predict(BEST.m * 2.6, BEST.c + 6, x)),
        why: `It can do exactly this — and you can make it. Drag <b>step size</b> to its maximum, press
              restart, and watch it thrash. Too big a step and it leaps clean over the answer every
              time. That is why real training <em>shrinks the step</em> as it goes.`,
      },
    ],
  },

  valley: {
    id: 'lr-predict-valley',
    kind: 'predict',
    question: 'Hold the height still and turn only the tilt. What shape does "how wrong" make?',
    note: 'Across the bottom: the tilt, from very flat to very steep. Up the side: how wrong that line is.',
    options: [
      {
        label: 'Downhill — steeper is always better',
        paint: (pl) => miniCurve(pl, (x) => 0.85 - 0.7 * x),
        why: `If that were true the line would keep tilting for ever, and a student who revised 10 hours
              would be predicted to score 500. Somewhere the steepening has to start hurting again.`,
      },
      {
        label: 'A valley — bad, good, bad',
        ok: true,
        paint: (pl) => miniCurve(pl, (x) => 0.12 + 2.6 * (x - 0.45) ** 2),
        why: `Too flat misses everybody, too steep misses everybody, and there is exactly one best tilt
              in between. That <b>U</b> is the shape the machine is walking down — except that it never
              gets to see the curve. It only ever feels which way the ground slopes under its feet.`,
      },
      {
        label: 'A hill — the middle is worst',
        paint: (pl) => miniCurve(pl, (x) => 0.9 - 2.6 * (x - 0.5) ** 2),
        why: `That would mean the extremes are best: a near-vertical line and a flat line both beating
              anything sensible. Try it on the slider in a moment — drag the tilt to either end and
              watch the misses grow. The good tilt is in the middle, so the shape opens upwards.`,
      },
    ],
  },

  transfer: {
    id: 'lr-transfer',
    kind: 'recall',
    question: 'A company wants to predict a house’s price from its floor area. What has to change?',
    note: 'Same machine, different question.',
    options: [
      {
        label: 'Nothing but the labels',
        ok: true,
        why: `That is the whole trick, and it is worth sitting with. The machine never knew what "hours"
              or "score" meant — it only ever saw <b>pairs of numbers</b> and moved a line to fit them.
              Relabel the axes and the identical code predicts house prices, delivery times, or how much
              electricity a city will draw tomorrow.`,
      },
      {
        label: 'You would need a completely different method',
        why: `You would not. Look back at what the machine actually did: it read two numbers per example
              and nudged a line. It never once used the fact that they were students. Swap in floor area
              and price and it carries on quite happily.`,
      },
      {
        label: 'It only works when the answer is a mark out of 100',
        why: `Nothing in the loop mentions 100, or marks. It works on any pair of numbers where one tends
              to rise with the other — which is a very large slice of the world.`,
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
    title: 'Forty students, one question',
    sub: 'Each dot is a real student: how long they revised, and what they scored.',
    brief: 'Start with a question',
    beats: [
      {
        text: `<p>Forty students sat the same exam. For each one we know two numbers, and that is all.</p>
               <p>Across: <b>hours revised</b>. Up: <b>the score they got</b>. One dot, one student.</p>
               <p>Hover any dot to meet them.</p>`,
        enter() { state.revealed = false; state.marked = false; },
      },
      {
        head: 'Now the awkward one',
        text: `<p><b>Nour</b> revised <em>6 hours</em> — and was ill on exam day, so she never sat it.</p>
               <p>The school still has to put a fair number next to her name. What should it be?</p>`,
        enter() { state.revealed = false; state.marked = true; },
      },
      {
        head: 'Why this is not easy',
        text: `<p>Look along the dashed line. <b>No student revised exactly 6 hours</b>, so there is nothing to copy.</p>
               <p>We cannot look Nour's answer up. We need a <em>rule</em> — something that turns any number of hours into a score, including hours nobody actually did.</p>
               <p>That rule is what the rest of this lesson builds.</p>`,
        cta: 'Let me try →',
        enter() { state.revealed = true; state.marked = true; },
      },
    ],
    draw: drawAsk,
  },

  {
    label: 'Your turn',
    title: 'Draw the rule yourself',
    sub: 'Drag the line, or use the sliders. Get it as close to the dots as you can.',
    brief: 'You first, not the machine',
    beats: [
      {
        text: `<p>The simplest rule that could work is a <b>straight line</b>.</p>
               <p>Any line at all is fixed by just two numbers:</p>
               <ul><li><b>Tilt</b> — how much score one extra hour buys</li>
                   <li><b>Height</b> — where the line sits overall</li></ul>`,
        panels: ['manual'],
        enter() { state.showSquares = false; $('#displayOpts').hidden = true; },
      },
      {
        head: 'Your turn — properly',
        text: `<p>Move the two sliders, or <b>drag the line on the chart</b> directly.</p>
               <p>Each orange stick is one student's <em>miss</em> — the gap between what the line predicts and what they really scored.</p>
               <p><b>Get the sticks as short as you can.</b> Take a minute over it; the next part depends on you having felt this.</p>`,
        panels: ['manual', 'score'],
        cta: 'I have had a go →',
        enter() { recordUserBest(); },
      },
      {
        head: 'Harder than it looks',
        text: `<p>Notice the problem: fix one end and the other end drifts off. Every improvement for one student costs another student.</p>
               <p>And "that looks about right" is not something you can hand to a computer. It needs a <b>number</b>.</p>`,
        panels: ['manual', 'score'],
        enter() { recordUserBest(); },
      },
    ],
    draw: drawManual,
  },

  {
    label: 'Measuring',
    title: 'Turning "close enough" into a number',
    sub: 'Each miss becomes a square. One number then stands for the whole line.',
    brief: 'Give the struggle a number',
    beats: [
      {
        text: `<p>Watch the chart: every gap just became a <b>square standing on it</b>.</p>
               <p>A miss of 4 points makes a small square. A miss of 12 points makes a square <em>nine times</em> the area.</p>
               <p>Add all forty squares up, take the average, and the whole line has one score.</p>`,
        panels: ['manual', 'score'],
        enter() {
          state.showSquares = true;
          $('#optSquares').checked = true;
          $('#displayOpts').hidden = false;
        },
      },
      {
        ask: CHECKS.squares,
        text: `<p>Squaring looks like an odd thing to do. Adding the gaps up would be simpler.</p>`,
        panels: ['manual', 'score'],
      },
      {
        head: 'One number, and a target',
        text: `<p>That average is the machine's <b>entire idea of how wrong it is</b>. Nothing else about the students survives into it.</p>
               <p>Which means the problem has changed shape completely. It is no longer "draw a good line" — it is <em>make this one number as small as you can</em>.</p>
               <p>That is a job a machine can do.</p>`,
        panels: ['manual', 'score'],
        cta: 'Hand it over →',
      },
    ],
    draw: drawManual,
  },

  {
    label: 'The machine',
    title: 'One student at a time',
    sub: 'It starts deliberately wrong and adjusts after meeting each student.',
    brief: 'Now let the machine try',
    beats: [
      {
        text: `<p>Here is the part worth being clear about: <b>the machine cannot see this chart.</b></p>
               <p>It has no overview, no sense of the shape of the cloud. It meets <b>one student at a time</b> and knows only two things — what it guessed, and what actually happened.</p>
               <p>Its whole rule is: <em>guessed too low → tilt up a bit. Too high → tilt down a bit.</em></p>`,
        panels: ['score'],
        enter() { state.showBest = true; setNote('It begins by guessing 50 for everybody.'); },
      },
      {
        ask: CHECKS.train,
        text: `<p>It will start by predicting <b>50 for everyone</b> — a flat line straight through the middle, wrong about almost all of them.</p>`,
        panels: ['score'],
      },
      {
        head: 'Watch it go',
        text: `<p>Press <b>Start learning</b>. The strip under the chart names each student as it meets them and says which way it just leaned.</p>
               <p>Watch the <em>typical miss</em> fall as it goes. Try <b>One student</b> to take it a single step at a time.</p>`,
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
    title: 'Wrongness is a valley',
    sub: 'Hold the height still, turn one knob, and the miss traces a U.',
    brief: 'Why that rule works',
    beats: [
      {
        text: `<p>Nudging blindly cannot be enough on its own — so why does it land in the right place?</p>
               <p>Try this: keep the <b>height</b> fixed and change only the <b>tilt</b>. Too flat, the line misses everybody. Too steep, it misses everybody again.</p>
               <p>Somewhere in between is the best it gets.</p>`,
        enter() { setValleyTilt(0); },
      },
      {
        ask: CHECKS.valley,
        text: `<p>So picture a graph: <b>tilt</b> along the bottom, <b>how wrong that line is</b> up the side.</p>`,
      },
      {
        head: 'Push the ball yourself',
        text: `<p>On the right: your data and the line this tilt gives, next to the valley itself with your ball on its slope.</p>
               <p>Drag the tilt. Then press <b>Let it roll downhill</b> — that rolling is exactly what the machine was doing, one student at a time.</p>
               <p>And this is the crucial bit: <b>the machine never sees this curve.</b> It only ever feels which way the ground slopes under its feet, and steps that way.</p>`,
        panels: ['valley', 'score'],
        cta: 'So what was that? →',
      },
    ],
    exit() { rolling = false; $('#rollBtn').textContent = 'Let it roll downhill'; },
    draw: drawValley,
  },

  {
    label: 'So what?',
    title: 'You just watched the whole of machine learning',
    sub: 'Three boxes and an arrow back to the start.',
    brief: 'What you actually learned',
    beats: [
      {
        text: `<p>Strip away the students and the exam and this is what is left — and it is worth memorising the shape of it.</p>
               <p><b>Guess. Measure how wrong. Nudge. Repeat.</b></p>
               <p>Nothing in that loop is clever. It never understood revision, or exams, or Nour. It saw pairs of numbers and got slightly less wrong, two hundred times.</p>`,
      },
      {
        head: 'The words the grown-ups use',
        text: `<p>You have been using plain words for real things. Here they are with their proper names — and every one of these will turn up again.</p>`,
        panels: ['recap'],
      },
      {
        ask: CHECKS.transfer,
        text: `<p>One last question, and it is the one that matters most — because it decides whether what you just learned was about exams, or about everything.</p>`,
        panels: ['recap'],
        answered() { lesson.progress.finish(); },
      },
    ],
    enter() {
      recapRunning = true;
      recapClock = 0;
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
  steps: $('#steps'),
  prev: $('#prevBtn'),
  next: $('#nextBtn'),
  progress: $('#progress'),
  stageTitle: $('#stageTitle'),
  stageSub: $('#stageSub'),
  briefHead: $('#briefHead'),
  briefBody: $('#briefBody'),
  advance: $('#advanceBtn'),
  beatDots: $('#beatDots'),
  canvasWrap: wrap,
  panels: {
    score: $('#panel-score'),
    manual: $('#panel-manual'),
    train: $('#panel-train'),
    valley: $('#panel-valley'),
    recap: $('#panel-recap'),
  },
};

const lesson = new Lesson({ steps, els });

/* --- checkpoints ---------------------------------------------------------- */

const { ask } = attach(lesson, {
  id: 'linear-regression',
  total: 4,
  recap: {
    terms: [
      ['Drawing a line through dots', 'Linear regression', 'the oldest and most used model there is'],
      ['Typical miss', 'Loss', 'the one number a model tries to make small'],
      ['Walking downhill', 'Gradient descent', 'how nearly every AI is trained, including chatbots'],
      ['Step size', 'Learning rate', 'the setting engineers fiddle with most'],
      ['One pass through everyone', 'An epoch', 'you ran five'],
    ],
    uses: [
      '<b>Shops</b> predicting how much stock to order for next week',
      '<b>Hospitals</b> estimating how long a patient will need a bed',
      '<b>Weather services</b> turning today’s readings into tomorrow’s temperature',
      '<b>Your phone</b>, guessing battery time left from how fast the charge is dropping',
    ],
  },
});

const theme = initTheme($('#themeBtn'));
theme.onChange(() => { mapCache = null; ask.repaint(); lesson.invalidate(); });

/* --- manual controls ------------------------------------------------------ */

slider($('#tilt'), $('#tiltVal'), fmt1, (v) => {
  state.user.m = v;
  recordUserBest();
  lesson.invalidate();
});
slider($('#level'), $('#levelVal'), (v) => v.toFixed(0), (v) => {
  state.user.c = v;
  recordUserBest();
  lesson.invalidate();
});

function syncSliders() {
  $('#tilt').value = state.user.m;
  $('#tiltVal').textContent = fmt1(state.user.m);
  $('#level').value = state.user.c;
  $('#levelVal').textContent = state.user.c.toFixed(0);
}

function recordUserBest() {
  state.userBestMiss = Math.min(state.userBestMiss, missOf(state.user));
}

$('#resetLine').addEventListener('click', () => {
  state.user = { m: 0, c: FLAT.c };
  syncSliders();
  lesson.invalidate();
});

$('#snapBest').addEventListener('click', () => {
  const from = { ...state.user };
  const t0 = performance.now();
  const run = (now) => {
    const k = clamp((now - t0) / 750, 0, 1);
    const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    state.user = { m: lerp(from.m, BEST.m, e), c: lerp(from.c, BEST.c, e) };
    syncSliders();
    lesson.invalidate();
    if (k < 1) requestAnimationFrame(run);
    else recordUserBest();
  };
  requestAnimationFrame(run);
});

/* --- act 5: the valley ---------------------------------------------------- */

$('#vTilt').addEventListener('input', (e) => {
  rolling = false;
  $('#rollBtn').textContent = 'Let it roll downhill';
  setValleyTilt(+e.target.value);
});
$('#rollBtn').addEventListener('click', rollDownhill);
$('#vLeft').addEventListener('click', () => setValleyTilt(vTilt - 0.5));
$('#vRight').addEventListener('click', () => setValleyTilt(vTilt + 0.5));

$('#optSquares').addEventListener('change', (e) => {
  state.showSquares = e.target.checked;
  lesson.invalidate();
});
$('#optBest').addEventListener('change', (e) => {
  state.showBest = e.target.checked;
  lesson.invalidate();
});

/* --- training controls ---------------------------------------------------- */

segmented($('#paceSeg'), (v) => { pace = +v; });

slider($('#lr'), $('#lrVal'), (v) => v.toFixed(3), (v) => {
  trainer.lr = v;
});

$('#playBtn').addEventListener('click', () => {
  if (trainer.done) restart();
  playing = !playing;
  $('#playBtn').textContent = playing ? 'Pause' : 'Start learning';
  if (playing) {
    lastFrame = performance.now();
    stepClock = pace;
    lesson.animateWhile(() => playing);
    pump();
  }
});

$('#stepBtn').addEventListener('click', () => {
  playing = false;
  $('#playBtn').textContent = 'Start learning';
  doStep();
});

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
  const dir = r.error < 0 ? 'too low' : 'too high';
  const move = r.tilted > 0 ? 'tilts it up' : 'tilts it down';
  const cls = r.error < 0 ? 'down' : 'up';
  setNote(`<b>${r.point.name}</b> revised <b>${r.point.x.toFixed(1)}h</b> and scored <b>${r.point.y.toFixed(0)}</b>.
     The line guessed <b>${r.guess.toFixed(0)}</b> — <span class="${cls}">${dir} by ${Math.abs(r.error).toFixed(1)}</span>,
     so it ${move} a little.`);
}

function finish() {
  playing = false;
  $('#playBtn').textContent = 'Start over';
  const machine = P.rmse(trainer.m, trainer.c);
  const yours = state.userBestMiss;
  const verdict = yours === Infinity
    ? `It settled at a typical miss of <b>${fmt1(machine)}</b> points — within a whisker of the best line possible (<b>${fmt1(BEST_MISS)}</b>).`
    : machine <= yours
      ? `It settled at <b>${fmt1(machine)}</b> points. Your best by hand was <b>${fmt1(yours)}</b>. It never saw the whole picture — it just kept stepping downhill.`
      : `It settled at <b>${fmt1(machine)}</b> points — <b>you beat it</b>, at <b>${fmt1(yours)}</b>. Fair and square, on 40 students and two knobs. Now picture 40 million students and a million knobs, which is roughly what a chatbot is. That is the job you cannot do by eye, and it is the only job the machine has.`;
  setNote(`<b>Done.</b> ${verdict}`);
  lesson.invalidate();
}

function pump() {
  if (!playing) return;
  const now = performance.now();
  const dt = now - lastFrame;
  lastFrame = now;
  stepClock += dt;
  while (stepClock >= pace && playing) {
    stepClock -= pace;
    doStep();
    if (trainer.done) break;
  }
  if (playing) requestAnimationFrame(pump);
}

/* --- pointer on the canvas ------------------------------------------------ */

function localPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener('pointerdown', (e) => {
  const s = lesson.step;
  if (!s.panels?.includes('manual')) return;
  const { x, y } = localPos(e);
  const hx = X_DOM[1] - 1.6;
  const cands = [
    { key: 'level', px: plot.sx(P.center), py: plot.sy(state.user.c) },
    { key: 'tilt', px: plot.sx(hx), py: plot.sy(P.predict(state.user.m, state.user.c, hx)) },
  ];
  for (const cd of cands) {
    if (Math.hypot(cd.px - x, cd.py - y) < 18) {
      state.dragging = cd.key;
      canvas.setPointerCapture(e.pointerId);
      lesson.invalidate();
      return;
    }
  }
});

canvas.addEventListener('pointermove', (e) => {
  const { x, y } = localPos(e);
  const s = lesson.step;

  if (state.dragging) {
    const yv = clamp(plot.iy(y), Y_DOM[0], Y_DOM[1]);
    if (state.dragging === 'level') {
      state.user.c = clamp(yv, LEVEL_DOM[0], LEVEL_DOM[1]);
    } else {
      const hx = X_DOM[1] - 1.6;
      state.user.m = clamp((yv - state.user.c) / (hx - P.center), TILT_DOM[0], TILT_DOM[1]);
    }
    syncSliders();
    recordUserBest();
    lesson.invalidate();
    return;
  }

  // every scatter act: nearest-student tooltip
  const near = nearestPoint(x, y);
  if (near !== state.hovered) { state.hovered = near; lesson.invalidate(); }
  if (near) {
    const mm = model();
    const extra = s.panels?.length
      ? `<span>line says ${P.predict(mm.m, mm.c, near.x).toFixed(0)}</span>` : '';
    showTip(plot.sx(near.x), plot.sy(near.y),
      `<strong>${near.name}</strong><span>${near.x.toFixed(1)} h revised · scored ${near.y.toFixed(0)}</span>${extra}`);
  } else hideTip();
});

const endDrag = () => {
  if (state.dragging) { state.dragging = null; lesson.invalidate(); }
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('pointerleave', () => {
  state.hovered = null;
  hideTip();
  lesson.invalidate();
});

/* --- table view ----------------------------------------------------------- */

$('#tableBtn').addEventListener('click', () => {
  const tv = $('#tableView');
  const open = tv.hidden;
  if (open) buildTable();
  tv.hidden = !open;
  $('#tableBtn').setAttribute('aria-expanded', String(open));
  $('#tableBtn').textContent = open ? 'Hide the numbers' : 'Show the numbers';
});

/* --- go ------------------------------------------------------------------- */

syncSliders();
lesson.start();
