/* =========================================================================
   Lesson shell — step navigation, theme, resize, and the redraw loop.
   Knows nothing about any particular lesson's content.
   ========================================================================= */

const THEME_KEY = 'ai-lms:theme';

/* --- theme ---------------------------------------------------------------- */

export function initTheme(button) {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) document.documentElement.dataset.theme = saved;

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () =>
    document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && systemDark.matches);

  const paint = () => { button.textContent = isDark() ? 'Light' : 'Dark'; };
  paint();

  button.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);
    paint();
    emit();
  });

  // follow the OS only while the user has not chosen explicitly
  systemDark.addEventListener('change', () => {
    if (!document.documentElement.dataset.theme) { paint(); emit(); }
  });

  const listeners = new Set();
  const emit = () => listeners.forEach((f) => f());
  return { onChange: (f) => listeners.add(f) };
}

/* --- steps ---------------------------------------------------------------- */

/**
 * One slide. An act is a short sequence of these, and only one is on screen at
 * a time — the reader is never handed a wall of text, and the picture beside
 * them only ever illustrates the sentence currently being read.
 *
 * @typedef {Object} Beat
 * @property {string} [head]        optional slide heading
 * @property {string} text          slide copy (HTML)
 * @property {string[]} [panels]    control cards to reveal on this slide
 * @property {Object} [ask]         a question, posed inline (see teach.js)
 * @property {string} [cta]         label for the advance button
 * @property {boolean} [hold]       advance only once the beat says so
 * @property {() => void} [enter]
 * @property {() => void} [exit]
 *
 * @typedef {Object} Step
 * @property {string} label   short name for the act rail
 * @property {string} title   stage heading
 * @property {string} sub     stage subheading
 * @property {string} brief   slide-panel heading
 * @property {Beat[]} beats
 * @property {() => void} [enter]
 * @property {() => void} [exit]
 * @property {() => void} draw
 */

export class Lesson {
  /**
   * @param {{steps: Step[], els: Record<string, HTMLElement>, onStep?: (i:number)=>void,
   *          onBeat?: (b:Beat, i:number)=>void}} cfg
   */
  constructor({ steps, els, onStep, onBeat }) {
    this.steps = steps;
    this.els = els;
    this.onStep = onStep;
    this.onBeat = onBeat;
    this.index = -1;
    this.beatIndex = 0;
    this.seen = new Set();
    this._raf = null;
    this._dirty = true;

    this._buildRail();
    this._wireNav();
    this._wireResize();

    window.addEventListener('hashchange', () => {
      const i = this._fromHash();
      if (i !== null && i !== this.index) this.go(i);
    });
  }

  /** Step index encoded in the URL, or null. Lets an LMS deep-link a step. */
  _fromHash() {
    const m = /^#step-(\d+)$/.exec(location.hash);
    if (!m) return null;
    const i = +m[1] - 1;
    return i >= 0 && i < this.steps.length ? i : null;
  }

  /** Open the step named in the URL, falling back to the first. */
  start() { this.go(this._fromHash() ?? 0); }

  get step() { return this.steps[this.index]; }

  _buildRail() {
    this.els.steps.innerHTML = '';
    this.buttons = this.steps.map((s, i) => {
      const b = document.createElement('button');
      b.className = 'step';
      b.type = 'button';
      b.innerHTML = `<span class="step__num">${i + 1}</span><span>${s.label}</span>`;
      b.addEventListener('click', () => this.go(i));
      this.els.steps.append(b);
      return b;
    });
  }

  _wireNav() {
    // Back and Next walk beats, not acts: the reader moves one idea at a time
    // and crosses into the next act only after finishing this one.
    this.els.prev.addEventListener('click', () => this.back());
    this.els.next.addEventListener('click', () => this.forward());
    this.els.advance?.addEventListener('click', () => this.forward());

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea, button')) return;
      if (e.key === 'ArrowRight') this.forward();
      if (e.key === 'ArrowLeft') this.back();
    });
  }

  /* --- beats ------------------------------------------------------------ */

  get beats() { return this.step?.beats ?? []; }
  get beat() { return this.beats[this.beatIndex]; }
  get atLastBeat() { return this.beatIndex >= this.beats.length - 1; }
  get atEnd() { return this.index === this.steps.length - 1 && this.atLastBeat; }

  /** Next slide, rolling into the next act at the end of this one. */
  forward() {
    if (this._held) return;
    if (!this.atLastBeat) return this.goBeat(this.beatIndex + 1);
    if (this.index < this.steps.length - 1) return this.go(this.index + 1);
    // past the last slide of the last act — send them back to pick another
    location.href = '../index.html';
  }

  /** Previous slide, rolling back into the previous act's last slide. */
  back() {
    if (this.beatIndex > 0) return this.goBeat(this.beatIndex - 1);
    if (this.index > 0) return this.go(this.index - 1, -1);
  }

  /** Hold the advance button shut — used while a question is unanswered. */
  hold(on) {
    this._held = on;
    this.els.next.disabled = on || this.atEnd;
    if (this.els.advance) this.els.advance.disabled = on;
  }

  goBeat(j) {
    const beats = this.beats;
    const next = Math.max(0, Math.min(beats.length - 1, j));
    if (next === this.beatIndex && this._beatPainted) return;

    this.beat?.exit?.();
    this.beatIndex = next;
    this._beatPainted = true;
    const b = this.beat;
    if (!b) return;

    this.els.briefHead.textContent = b.head ?? this.step.brief;
    this.els.briefBody.innerHTML = b.text ?? '';

    // only the control cards this beat asks for
    for (const [name, el] of Object.entries(this.els.panels ?? {})) {
      el.hidden = !(b.panels ?? []).includes(name);
    }

    this._paintBeatDots();
    this.hold(false);
    if (this.els.advance) {
      this.els.advance.textContent = this.atEnd
        ? 'Finish — back to the lessons'
        : b.cta ?? (this.atLastBeat ? 'Next part →' : 'Continue →');
      this.els.advance.hidden = false;
    }
    this.els.prev.disabled = this.index === 0 && this.beatIndex === 0;
    this.els.next.disabled = this.atEnd;

    b.enter?.();
    this.onBeat?.(b, next);
    this.invalidate();
  }

  _paintBeatDots() {
    const el = this.els.beatDots;
    if (!el) return;
    el.innerHTML = this.beats.map((_, i) => {
      const s = i < this.beatIndex ? 'done' : i === this.beatIndex ? 'now' : 'todo';
      return `<span class="bdot bdot--${s}"></span>`;
    }).join('');
    el.setAttribute('aria-label', `Slide ${this.beatIndex + 1} of ${this.beats.length}`);
  }

  _wireResize() {
    const ro = new ResizeObserver(() => this.invalidate());
    ro.observe(this.els.canvasWrap);
    window.addEventListener('resize', () => this.invalidate());
  }

  /** @param {number} i act index @param {1|-1} land 1 = first beat, -1 = last */
  go(i, land = 1) {
    const next = Math.max(0, Math.min(this.steps.length - 1, i));
    if (next === this.index) return;
    if (this._fromHash() !== next) {
      history.replaceState(null, '', `#step-${next + 1}`);
    }

    this.beat?.exit?.();
    this.step?.exit?.();
    if (this.index >= 0) this.seen.add(this.index);
    this.index = next;

    const s = this.step;
    this.els.stageTitle.textContent = s.title;
    this.els.stageSub.textContent = s.sub;

    this.buttons.forEach((b, j) => {
      b.classList.toggle('step--done', this.seen.has(j) && j !== next);
      if (j === next) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });

    this.els.progress.textContent = `Part ${next + 1} of ${this.steps.length}`;

    s.enter?.();
    this.onStep?.(next);

    this.beatIndex = -1;
    this._beatPainted = false;
    this.goBeat(land === -1 ? s.beats.length - 1 : 0);

    this.buttons[next].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  /** Mark the canvas as needing a repaint on the next frame. */
  invalidate() {
    this._dirty = true;
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      if (!this._dirty) return;
      this._dirty = false;
      this.step?.draw();
    });
  }

  /** Repaint every frame while `pred` holds — used during animation. */
  animateWhile(pred) {
    const tick = () => {
      if (!pred()) return;
      this.step?.draw();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

/* --- small DOM helpers ---------------------------------------------------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Wire a range input to a live readout + change handler. */
export function slider(input, readout, fmt, onInput) {
  const sync = () => {
    if (readout) readout.textContent = fmt(+input.value);
    onInput(+input.value);
  };
  input.addEventListener('input', sync);
  return { sync, set: (v) => { input.value = v; sync(); } };
}

/** Wire a group of buttons as a single-choice segmented control. */
export function segmented(root, onPick) {
  const btns = $$('button', root);
  btns.forEach((b) => b.addEventListener('click', () => {
    btns.forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    onPick(b.dataset.value);
  }));
  return {
    set(v) {
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
    },
  };
}
