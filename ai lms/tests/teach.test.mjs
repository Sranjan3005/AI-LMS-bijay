/* Teaching-layer tests. Run: node tests/teach.test.mjs
 *
 * Two halves:
 *   1. Progress — the scoring rules, which decide what the hub reports.
 *   2. The checkpoints themselves, read out of the lesson sources. These are
 *      content tests: they catch a question with two right answers, a missing
 *      explanation, or a duplicate id that would silently swallow a score.
 */

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let pass = 0;
const test = (name, fn) => {
  try { fn(); pass++; console.log(`  ok    ${name}`); }
  catch (e) { console.error(`  FAIL  ${name}\n        ${e.message}`); process.exitCode = 1; }
};

console.log('\nteach\n');

/* --- a localStorage good enough to exercise Progress ---------------------- */

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

const { Progress } = await import('../src/lesson/teach.js');

const fresh = (id = 'demo', total = 4) => new Progress(id, total);

/* --- Progress ------------------------------------------------------------- */

test('a fresh lesson has nothing earned', () => {
  store.clear();
  const p = fresh();
  assert.equal(p.earned, 0);
  assert.equal(p.solved, 0);
  assert.equal(p.done, false);
});

test('right first time earns the point', () => {
  store.clear();
  const p = fresh();
  p.record('q1', true);
  assert.equal(p.earned, 1);
  assert.equal(p.solved, 1);
});

test('wrong first time never earns the point, even once solved', () => {
  store.clear();
  const p = fresh();
  p.record('q1', false);
  assert.equal(p.earned, 0, 'a wrong first answer must not earn');
  assert.equal(p.solved, 1, 'but it counts as attempted');
  p.record('q1', true);
  assert.equal(p.earned, 0, 'getting there later must not backfill the point');
  assert.equal(p.solved, 1);
});

test('an earned point is never demoted by a later wrong answer', () => {
  store.clear();
  const p = fresh();
  p.record('q1', true);
  p.record('q1', false);
  assert.equal(p.earned, 1);
});

test('answers survive a reload', () => {
  store.clear();
  const a = fresh('lesson-x', 4);
  a.record('q1', true);
  a.record('q2', false);
  a.finish();

  const b = new Progress('lesson-x', 4);
  assert.equal(b.earned, 1);
  assert.equal(b.solved, 2);
  assert.equal(b.done, true);
});

test('lessons do not read each other’s scores', () => {
  store.clear();
  const a = fresh('lesson-a');
  a.record('q1', true);
  const b = fresh('lesson-b');
  assert.equal(b.earned, 0);
  assert.equal(new Progress('lesson-a', 4).earned, 1);
});

test('Progress.all reports every lesson, and reset clears them', () => {
  store.clear();
  fresh('one').record('q1', true);
  fresh('two').record('q1', true);
  assert.deepEqual(Object.keys(Progress.all()).sort(), ['one', 'two']);
  Progress.reset();
  assert.deepEqual(Progress.all(), {});
});

test('a wrecked store does not throw', () => {
  store.clear();
  store.set('ai-lms:progress', '{not json');
  assert.doesNotThrow(() => fresh().earned);
  assert.equal(fresh().earned, 0);
});

/* --- the checkpoints, read out of the lessons ----------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
const lessonDir = join(here, '..', 'lessons');
const lessonFiles = readdirSync(lessonDir).filter((f) => f.endsWith('.js')).sort();

/** Line endings in this repo are mixed; every pattern below assumes LF. */
const read = (f) => readFileSync(join(lessonDir, f), 'utf8').replace(/\r\n/g, '\n');

/**
 * Pull each `id: 'x', kind: 'y', ... options: [...]` block out of a lesson.
 * Deliberately textual: the lessons import DOM modules and cannot be loaded
 * here, but their checkpoint content is still worth pinning.
 */
function checkpointsIn(src) {
  const out = [];
  const idRe = /\n\s{4}id: '([^']+)',/g;
  let m;
  while ((m = idRe.exec(src))) {
    const start = m.index;
    // the block runs to the closing "  }," at this indent level
    const end = src.indexOf('\n  },', start);
    const body = src.slice(start, end === -1 ? src.length : end);
    out.push({
      id: m[1],
      body,
      kind: (/\n\s{4}kind: '([^']+)'/.exec(body) ?? [])[1],
      question: (/\n\s{4}question: '((?:[^'\\]|\\.)*)'/.exec(body) ?? [])[1],
      correct: (body.match(/\n\s{8}ok: true,/g) ?? []).length,
      options: (body.match(/\n\s{6}\{\n/g) ?? []).length,
      whys: (body.match(/\n\s{8}why: `/g) ?? []).length,
      paints: (body.match(/\n\s{8}paint: /g) ?? []).length,
    });
  }
  return out;
}

const allCheckpoints = [];
for (const f of lessonFiles) {
  const src = read(f);
  for (const c of checkpointsIn(src)) allCheckpoints.push({ ...c, file: f });
}

test('every lesson poses exactly four checkpoints', () => {
  for (const f of lessonFiles) {
    const n = allCheckpoints.filter((c) => c.file === f).length;
    assert.equal(n, 4, `${f} has ${n}`);
  }
});

test('checkpoint ids are unique across the whole course', () => {
  const ids = allCheckpoints.map((c) => c.id);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, [], `duplicate ids: ${dupes.join(', ')}`);
});

test('every checkpoint has exactly one right answer', () => {
  for (const c of allCheckpoints) {
    assert.equal(c.correct, 1, `${c.file} ${c.id} marks ${c.correct} options correct`);
  }
});

test('every checkpoint offers two or more options', () => {
  for (const c of allCheckpoints) {
    assert.ok(c.options >= 2, `${c.file} ${c.id} has ${c.options} options`);
  }
});

test('every option explains itself — wrong ones included', () => {
  for (const c of allCheckpoints) {
    assert.equal(c.whys, c.options,
      `${c.file} ${c.id}: ${c.options} options but ${c.whys} explanations`);
  }
});

test('a picture is either on every option or on none', () => {
  for (const c of allCheckpoints) {
    assert.ok(c.paints === 0 || c.paints === c.options,
      `${c.file} ${c.id}: ${c.paints} of ${c.options} options have a picture, which reads as a hint`);
  }
});

test('each lesson gates its machine act with a prediction', () => {
  for (const f of lessonFiles) {
    const kinds = allCheckpoints.filter((c) => c.file === f).map((c) => c.kind);
    assert.ok(kinds.filter((k) => k === 'predict').length >= 2,
      `${f} has only ${kinds.filter((k) => k === 'predict').length} predictions`);
  }
});

test('each lesson closes with a transfer question', () => {
  for (const f of lessonFiles) {
    const kinds = allCheckpoints.filter((c) => c.file === f).map((c) => c.kind);
    assert.equal(kinds.at(-1), 'recall', `${f} ends on '${kinds.at(-1)}'`);
  }
});

test('every lesson declares a recap panel and a "So what?" act', () => {
  for (const f of lessonFiles) {
    const src = read(f);
    assert.ok(src.includes("label: 'So what?'"), `${f} has no closing act`);
    assert.ok(/recap:\s*\{/.test(src), `${f} passes no recap to attach()`);
    assert.ok(/terms:\s*\[/.test(src) && /uses:\s*\[/.test(src), `${f} recap is missing terms or uses`);
  }
});

test('every lesson names the real vocabulary at the end', () => {
  // The words the interface deliberately avoids until the closing act. If a
  // lesson never lands its real name, the student leaves without the label.
  const wanted = {
    'linear-regression.js': ['Linear regression', 'Gradient descent', 'Learning rate'],
    'logistic-regression.js': ['Logistic regression', 'sigmoid', 'Log loss'],
    'k-nearest-neighbours.js': ['k-nearest neighbours', 'Overfitting', 'Cross-validation'],
    'support-vector-machine.js': ['Support vector machine', 'margin', 'Support vectors'],
    'neural-network.js': ['neural network', 'hidden layer', 'Backpropagation'],
  };
  for (const [file, words] of Object.entries(wanted)) {
    const src = read(file);
    for (const w of words) {
      assert.ok(src.toLowerCase().includes(w.toLowerCase()), `${file} never says "${w}"`);
    }
  }
});

test('the count passed to attach() matches the checkpoints written', () => {
  for (const f of lessonFiles) {
    const src = read(f);
    const declared = +(/total:\s*(\d+),/.exec(src) ?? [])[1];
    const actual = allCheckpoints.filter((c) => c.file === f).length;
    assert.equal(declared, actual, `${f} declares total ${declared} but defines ${actual}`);
  }
});

test('every checkpoint defined is actually posed by a slide', () => {
  for (const f of lessonFiles) {
    const src = read(f);
    const names = [...src.matchAll(/\n {2}(\w+): \{\n {4}id: '/g)].map((m) => m[1]);
    for (const n of names) {
      assert.ok(src.includes(`ask: CHECKS.${n}`), `${f}: CHECKS.${n} is never posed`);
    }
  }
});

/* --- the slides ----------------------------------------------------------- */

/** Each `beats: [ … ]` array, split into its individual beat objects. */
function beatsIn(src) {
  const out = [];
  const re = /\n {4}beats: \[\n([\s\S]*?)\n {4}\],/g;
  let m;
  while ((m = re.exec(src))) {
    // leading \n so the first beat, which sits flush against `beats: [`, counts
    const body = `\n${m[1]}`;
    out.push({
      body,
      count: (body.match(/\n {6}\{\n/g) ?? []).length,
      texts: [...body.matchAll(/\n {8}text: `([\s\S]*?)`,\n/g)].map((t) => t[1]),
      asks: (body.match(/\n {8}ask: CHECKS\./g) ?? []).length,
    });
  }
  return out;
}

const allActs = [];
for (const f of lessonFiles) {
  for (const b of beatsIn(read(f))) allActs.push({ ...b, file: f });
}

test('every act is broken into slides', () => {
  for (const f of lessonFiles) {
    const acts = allActs.filter((a) => a.file === f);
    assert.equal(acts.length, 6, `${f} has ${acts.length} acts with beats`);
  }
});

test('no act dumps everything on one slide', () => {
  for (const a of allActs) {
    assert.ok(a.count >= 2, `${a.file}: an act has only ${a.count} slide(s)`);
  }
});

test('no slide is a wall of text', () => {
  // The whole point of splitting acts into slides is that a reader is handed a
  // little at a time. A slide over ~700 characters of markup has drifted back
  // into being the old sidebar.
  for (const a of allActs) {
    for (const t of a.texts) {
      assert.ok(t.length < 700, `${a.file}: a slide runs to ${t.length} characters`);
    }
  }
});

test('every slide says something', () => {
  for (const a of allActs) {
    for (const t of a.texts) {
      assert.ok(t.replace(/<[^>]*>/g, '').trim().length > 60,
        `${a.file}: a slide has almost no copy`);
    }
  }
});

test('questions are spread across the lesson, never stacked back to back', () => {
  for (const a of allActs) {
    assert.ok(a.asks <= 1, `${a.file}: one act poses ${a.asks} questions`);
  }
});

test('no lesson still uses the old single-body act format', () => {
  for (const f of lessonFiles) {
    const src = read(f);
    assert.ok(!/\n {4}body: `/.test(src), `${f} still has an act-level body`);
    assert.ok(!/\bgate\(CHECKS\./.test(src), `${f} still calls the removed gate()`);
  }
});

test('the shell is wired for slides on every page', () => {
  const pages = readdirSync(lessonDir).filter((f) => f.endsWith('.html'));
  assert.equal(pages.length, 5);
  for (const p of pages) {
    const html = readFileSync(join(lessonDir, p), 'utf8');
    for (const hook of ['id="advanceBtn"', 'id="beatDots"', 'id="quiz"', 'id="cands"', 'class="slide"']) {
      assert.ok(html.includes(hook), `${p} is missing ${hook}`);
    }
    // the overlay that used to cover the chart must be gone for good
    assert.ok(!html.includes('id="ask"'), `${p} still has the old overlay`);
    // reading column before the picture, so the DOM order matches the teaching order
    assert.ok(html.indexOf('<aside class="rail">') < html.indexOf('<section class="stage">'),
      `${p} still puts the chart before the slides`);
  }
});

console.log(`\n  ${pass} passed\n`);
