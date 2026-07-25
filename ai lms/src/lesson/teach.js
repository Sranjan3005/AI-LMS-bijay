/* =========================================================================
   The teaching layer.

   A demonstration teaches almost nothing until the learner has committed to
   an answer. Watching a line snap into place is entertainment; predicting
   where it will land, being wrong, and finding out why is learning.

   So every lesson gates its payoff behind a checkpoint: a question posed over
   the chart, answered by clicking a *picture* of what the learner thinks will
   happen. Every option — right or wrong — has its own written reply, because
   "incorrect" teaches nobody anything.

   Nothing here knows about any particular model.
   ========================================================================= */

import { Plot } from '../core/plot.js';

/* =========================================================================
   Progress — what this learner has answered, across visits
   ========================================================================= */

const STORE_KEY = 'ai-lms:progress';

const readAll = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {}; }
  catch { return {}; }
};

const writeAll = (data) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
};

export class Progress {
  /** @param {string} lessonId @param {number} total how many checkpoints this lesson has */
  constructor(lessonId, total) {
    this.lessonId = lessonId;
    this.total = total;
    const all = readAll();
    this.marks = all[lessonId]?.marks ?? {};   // { checkpointId: 'first' | 'later' }
    this.done = all[lessonId]?.done ?? false;
  }

  /** Record an answer. Only the *first* attempt at a checkpoint can earn it. */
  record(id, correct) {
    if (this.marks[id] === 'first') return;         // already earned, never demote
    if (this.marks[id] === undefined) this.marks[id] = correct ? 'first' : 'later';
    else if (correct) this.marks[id] = 'later';     // got there in the end
    this._flush();
  }

  finish() { this.done = true; this._flush(); }

  /** Checkpoints answered correctly at the first attempt. */
  get earned() { return Object.values(this.marks).filter((m) => m === 'first').length; }
  /** Checkpoints answered correctly at all. */
  get solved() { return Object.values(this.marks).length; }

  _flush() {
    const all = readAll();
    all[this.lessonId] = { marks: this.marks, done: this.done, total: this.total };
    writeAll(all);
  }

  /** Every lesson's stored progress, for the hub. */
  static all() { return readAll(); }

  static reset() { writeAll({}); }
}

/* =========================================================================
   Ask — a question posed inside the slide

   The question's words go in the reading column. Its candidate pictures go in
   the visual panel, full size, keyed A / B / C to the buttons. An earlier
   version floated the whole thing over the chart, which put the explanation on
   top of the very thing being explained and squeezed three charts into
   thumbnails. Both halves now have the room they need.
   ========================================================================= */

const KEYS = 'ABCD';

const KICKER = {
  predict: 'Predict first',
  check: 'Quick check',
  recall: 'One last thing',
};

export class Ask {
  /**
   * @param {{slot: HTMLElement, stage: HTMLElement, progress: Progress,
   *          onDone?: () => void}} cfg
   *   slot  — where the question's words go, inside the slide
   *   stage — where the candidate pictures go, over the visual panel
   */
  constructor({ slot, stage, progress, onDone }) {
    this.slot = slot;
    this.stage = stage;
    this.progress = progress;
    this.onDone = onDone;
    this.open = false;
    this._plots = [];
    this._spec = null;
    this._onAnswer = null;
  }

  /** True once this checkpoint has been answered in this browser. */
  answered(id) { return this.progress.marks[id] !== undefined; }

  /**
   * Pose a checkpoint into the current slide.
   *
   * @param {{
   *   id: string,
   *   kind?: 'predict'|'check'|'recall',
   *   question: string,
   *   note?: string,
   *   options: Array<{ label: string, ok?: boolean, why: string, paint?: (plot: Plot) => void }>,
   * }} spec
   * @param {(r: {index: number, correct: boolean}) => void} [onAnswer]
   */
  pose(spec, onAnswer) {
    this._spec = spec;
    this._onAnswer = onAnswer;
    this.open = true;

    this._buildQuestion(spec);
    this._buildCandidates(spec);

    // If they have already answered this one, show it resolved rather than
    // making them re-take a quiz they came back to skip past.
    const prior = this.progress.marks[spec.id];
    if (prior) {
      const right = spec.options.findIndex((o) => o.ok);
      this._resolve(right, { replay: true, earned: prior === 'first' });
    }
  }

  /** Clear the question and give the visual panel back. */
  clear() {
    if (!this.open) return;
    this.open = false;
    this.slot.innerHTML = '';
    this.slot.hidden = true;
    this.stage.innerHTML = '';
    this.stage.hidden = true;
    this.stage.parentElement?.classList.remove('is-comparing');
    this._plots = [];
    this._spec = null;
  }

  /** Re-measure the candidate charts (theme flip, resize). */
  repaint() { if (this.open) this._paintAll(); }

  /* --- internals ------------------------------------------------------- */

  _buildQuestion(spec) {
    const kind = spec.kind ?? 'predict';
    this.slot.hidden = false;
    this.slot.innerHTML = `
      <p class="quiz__kicker quiz__kicker--${kind}">${KICKER[kind]}</p>
      <p class="quiz__q">${spec.question}</p>
      ${spec.note ? `<p class="quiz__note">${spec.note}</p>` : ''}
      <div class="quiz__opts" role="group">
        ${spec.options.map((o, i) => `
          <button class="qopt" type="button" data-i="${i}">
            <span class="qopt__key" aria-hidden="true">${KEYS[i]}</span>
            <span>${o.label}</span>
          </button>`).join('')}
      </div>
      <div class="quiz__reply" role="status" hidden></div>`;

    this.slot.querySelectorAll('.qopt').forEach((b) => {
      b.addEventListener('click', () => this._pick(+b.dataset.i));
    });
  }

  _buildCandidates(spec) {
    const withPics = spec.options.some((o) => o.paint);
    if (!withPics) {
      this.stage.hidden = true;
      this.stage.innerHTML = '';
      this.stage.parentElement?.classList.remove('is-comparing');
      return;
    }

    // The candidates replace the live chart rather than sitting on top of it —
    // otherwise the real answer shows through the gaps between them.
    this.stage.parentElement?.classList.add('is-comparing');
    this.stage.hidden = false;
    this.stage.innerHTML = spec.options.map((o, i) => `
      <div class="cand" data-i="${i}">
        <div class="cand__top">
          <span class="cand__key">${KEYS[i]}</span>
          <span class="cand__label">${o.label}</span>
        </div>
        <div class="cand__pic"><canvas></canvas></div>
      </div>`).join('');

    this._plots = [...this.stage.querySelectorAll('.cand__pic canvas')]
      .map((c) => new Plot(c, { margin: { t: 10, r: 10, b: 10, l: 10 } }));

    requestAnimationFrame(() => this._paintAll());
  }

  _paintAll() {
    const opts = this._spec?.options ?? [];
    opts.forEach((o, i) => {
      const pl = this._plots[i];
      if (!pl || !o.paint) return;
      pl.measure().clear();
      if (pl.w > 0) o.paint(pl);
    });
  }

  _pick(i) {
    const spec = this._spec;
    const firstTry = !this.answered(spec.id);
    this.progress.record(spec.id, !!spec.options[i].ok);
    this.onDone?.();
    this._resolve(i, { firstTry });
  }

  /** Mark every option — the whole landscape, not just whether this pick won. */
  _resolve(i, { firstTry = false, replay = false, earned = false } = {}) {
    const spec = this._spec;
    const correct = !!spec.options[i].ok;

    this.slot.querySelectorAll('.qopt').forEach((b) => {
      const j = +b.dataset.i;
      b.classList.add('qopt--resolved');
      b.classList.toggle('qopt--right', !!spec.options[j].ok);
      b.classList.toggle('qopt--chosen', j === i);
      b.disabled = true;
    });

    this.stage.querySelectorAll('.cand').forEach((c) => {
      const j = +c.dataset.i;
      c.classList.toggle('cand--right', !!spec.options[j].ok);
      c.classList.toggle('cand--chosen', j === i);
      c.classList.toggle('cand--dim', !spec.options[j].ok && j !== i);
    });

    const reply = this.slot.querySelector('.quiz__reply');
    const verdict = replay
      ? (earned ? 'You had this one.' : 'The answer, from last time.')
      : correct
        ? (firstTry ? 'Yes — exactly that.' : 'Yes, that is the one.')
        : 'Not quite — and this is the interesting part.';

    reply.className = `quiz__reply quiz__reply--${correct ? 'yes' : 'no'}`;
    reply.innerHTML = `
      <p class="quiz__verdict quiz__verdict--${correct ? 'yes' : 'no'}">${verdict}</p>
      <p class="quiz__why">${spec.options[i].why}</p>`;
    reply.hidden = false;

    this._onAnswer?.({ index: i, correct, replay });
  }
}

/* =========================================================================
   Recap — the closing act, built from a spec rather than hand-written HTML
   ========================================================================= */

/**
 * Renders the "you now know this" panel: the plain words mapped onto the real
 * ones, and where the idea actually lives in the world.
 *
 * The real vocabulary is deliberately withheld until here. A fifteen-year-old
 * told "this is logistic regression" on slide one has learnt a label; told it
 * on the last slide, they have learnt a thing and *then* its name — which is
 * the order names are actually useful in.
 *
 * @param {HTMLElement} el
 * @param {{terms: Array<[string,string,string]>, uses: string[]}} spec
 */
export function renderRecap(el, { terms, uses }) {
  el.innerHTML = `
    <div class="recap">
      <div class="recap__block">
        <div class="card__label">The words the grown-ups use</div>
        <table class="recap__terms">
          <thead><tr><th>You called it</th><th>Its real name</th></tr></thead>
          <tbody>
            ${terms.map(([ours, real, gloss]) => `
              <tr><td>${ours}</td><td><b>${real}</b><span>${gloss}</span></td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="recap__block">
        <div class="card__label">Where you have already met this</div>
        <ul class="recap__uses">${uses.map((u) => `<li>${u}</li>`).join('')}</ul>
      </div>
    </div>`;
}

/* =========================================================================
   attach — one call that gives a lesson its whole teaching layer
   ========================================================================= */

/**
 * Wires checkpoints, the score strip and the recap panel onto a Lesson.
 *
 * @param {import('./shell.js').Lesson} lesson
 * @param {{
 *   id: string,
 *   total: number,
 *   recap?: Parameters<typeof renderRecap>[1],
 * }} cfg
 * @returns {{progress: Progress, ask: Ask, gate: Function}}
 */
export function attach(lesson, { id, total, recap }) {
  const scoreEl = document.querySelector('#score');
  const progress = new Progress(id, total);
  const ask = new Ask({
    slot: document.querySelector('#quiz'),
    stage: document.querySelector('#cands'),
    progress,
    onDone: () => renderScore(scoreEl, progress),
  });

  lesson.progress = progress;
  lesson.ask = ask;

  // A beat carrying `ask` becomes a question slide: the words drop into the
  // slide, the pictures take over the visual panel, and Continue stays shut
  // until an answer is in. A prediction you can skip is not a prediction.
  lesson.onBeat = (beat) => {
    ask.clear();
    if (!beat?.ask) return;

    lesson.hold(true);
    ask.pose(beat.ask, (r) => {
      lesson.hold(false);
      beat.answered?.(r);
      renderScore(scoreEl, progress);
      lesson.invalidate();
    });
  };

  renderScore(scoreEl, progress);
  if (recap) renderRecap(document.querySelector('#panel-recap'), recap);
  window.addEventListener('resize', () => ask.repaint());

  return { progress, ask };
}

/**
 * The star strip shown in the lesson footer.
 * @param {HTMLElement} el @param {Progress} p
 */
export function renderScore(el, p) {
  if (!el) return;
  const pips = Array.from({ length: p.total }, (_, i) => {
    const state = i < p.earned ? 'won' : i < p.solved ? 'part' : 'open';
    return `<span class="pip pip--${state}"></span>`;
  }).join('');
  el.innerHTML = `<span class="pips" role="img"
      aria-label="${p.earned} of ${p.total} checkpoints answered correctly first time">${pips}</span>`;
  el.title = `${p.earned} of ${p.total} right first time`;
}
