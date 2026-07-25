# Machines That Learn

Interactive lessons that build machine learning from the ground up, for students
aged roughly 13–18 with no maths background.

Each lesson follows the same shape: **the learner attempts the problem by hand
and struggles, then has to predict what the machine will do before it is allowed
to show them.** Gradient descent means nothing to someone who has not personally
failed to fit a line — and a demonstration teaches nothing to someone who has
not bet on the outcome.

## How a lesson is laid out

**Slides on the left, the picture on the right, and neither ever covers the
other.**

Each of the six acts is a short run of **slides** — two or three sentences, a
Continue button, a progress bar. The picture changes with the slide, so what is
on screen only ever illustrates the sentence being read. Controls appear when a
slide asks you to use them and stay hidden when it does not, so you are never
invited to read and fiddle at the same time.

When a question needs pictures, they take over the *visual* panel at full size,
keyed A / B / C to the buttons in the slide. When a question tells you to go and
try something first, the live chart and its controls are right there, unobscured.

Concretely, that means every lesson holds its payoff shut behind **four
checkpoints**. Before training runs, the reader picks which of three charts they
think the machine will land on. Every option — right or wrong — has its own
written reply explaining what that answer would have meant, and several of the
wrong ones send you off to prove it yourself:

> *"It can do exactly this — and you can make it. Drag **step size** to its
> maximum, press restart, and watch it thrash."*

Progress is kept per browser and shown on the hub. Only a first-time-correct
answer earns its point; getting there in the end still counts, in amber.
Nothing is ever locked behind a score.

## Run it

**Double-click `start.bat`.** It serves the folder and opens your browser. Keep
that window open while you use the lessons.

> **Do not open `index.html` by double-clicking it.** The page will load but
> every lesson will be blank. This is not a bug: the lessons are ES modules, and
> browsers block `file://` pages from fetching scripts —
> *"Access to script … from origin 'null' has been blocked by CORS policy"*.
> The old single-file demos worked on double-click because their JS was inlined;
> this one is split across `src/`, so it has to be served over HTTP.

Equivalent manual options — any static server works, there is no build step and
no dependencies:

```bash
python -m http.server 8000     # then open http://localhost:8000
npx serve                      # or
php -S localhost:8000
```

Or open the folder in VS Code and use **Live Server**.

## Test

```bash
npm test          # or: node tests/run-all.mjs
```

120 tests across 6 suites, plain `node:assert` — no framework, because the model
layer is pure functions. They cover more than correctness: many tests **pin the
numbers the lessons' pacing depends on** — that training converges, that it
converges *visibly* in the first pass, that the descent path stays inside the
chart the final act draws, that k-NN's small-k really overfits, that no straight
line can crack the neural-network data. If you retune anything, these are what
tell you the demo still reads well.

Two worth knowing about:

- `network.test.mjs` checks backprop against a finite-difference gradient, so
  the network's maths is verified rather than assumed.
- `teach.test.mjs` tests the **teaching content**, not just the code. It reads
  the checkpoints out of the lesson sources and refuses a question with two
  right answers, an option with no explanation, a duplicate id that would
  silently swallow a score, a lesson that never says its own real name, or a
  checkpoint defined but never actually posed. Adding a question with a missing
  `why` fails the build.

## Deploy

It is a static folder. Drag it to Netlify, or:

```bash
npx vercel deploy          # or
gh-pages -d .              # or just rsync it to any web root
```

**Embedding in an LMS:** each lesson is a self-contained page and works fine in
an `<iframe>`. Steps are deep-linkable — `linear-regression.html#step-4` opens
directly on the training act.

## Layout

```
index.html               lesson hub
lessons/                 one lesson = markup + its scene code
  linear-regression.html + .js
  logistic-regression.html + .js
  k-nearest-neighbours.html + .js
  support-vector-machine.html + .js
  neural-network.html + .js
src/
  styles/theme.css       design tokens, light + dark
  styles/app.css         layout and components
  core/plot.js           canvas charting layer (scales, axes, marks, regions)
  core/diagram.js        the closing act's loop diagram — ideas, not data
  lesson/shell.js        act + slide sequencing, theme, redraw loop
  lesson/teach.js        checkpoints, scoring, the recap panel
  ml/                    the models — pure, no DOM, testable
    linreg.js  logistic.js  knn.js  svm.js  network.js
    points2d.js          shared 2-D data (blobs, rings) for the last three
tests/                   model + teaching tests, and run-all.mjs
docs/DESIGN.md           why the colours, the numbers and the questions are what they are
```

The split that matters: **`src/ml/` never touches the DOM and `src/core/` never
knows what a regression is.** A lesson file is the only place the two meet. That
is what makes the next four lessons cheap to write.

## Adding a lesson

1. Write the model in `src/ml/`, as pure functions. Test it.
2. Copy `lessons/linear-regression.html`, keep the shell, change the panels.
   Keep the slide hooks: `#beatDots`, `#briefHead`, `#briefBody`, `#quiz` and
   `#advanceBtn` inside `.slide`; `#cands` inside the canvas wrap;
   `#panel-recap` in the rail; `#score` in the footer.
3. Write the acts as an array of step objects. Each carries `beats: [...]` —
   the slides — and one `draw()` that gets a `Plot` and consults
   `lesson.beatIndex` to decide how much to show. `shell.js` handles the rest.
4. Call `attach(lesson, { id, total, recap })` once. A slide becomes a question
   just by carrying `ask: CHECKS.x`; Continue stays shut until it is answered.
5. Add a card to `index.html` with `data-lesson="<id>"` so the hub can report
   progress.

Two rules that `npm test` enforces, so you may as well know them up front:
**every option needs a `why`, including the wrong ones**, and a picture goes on
all options or none — a lone illustrated option reads as a hint. Acts must be
split into at least two slides, and no slide may run past ~700 characters: if
it does, it has drifted back into being the old sidebar.

Before picking any colour, read `docs/DESIGN.md`. The palette is validated, not
chosen by eye, and the validator is a script you can re-run.

## The five lessons

They are meant to be taken in order — each one leans on the last.

| # | Lesson | The idea | The turn it takes | The misconception it hunts |
|---|---|---|---|---|
| 1 | Drawing a line | Linear regression | You fail to fit a line by hand, then watch gradient descent do it | that squaring the misses is a computational trick |
| 2 | Drawing a boundary | Logistic regression | Same students, new question. A hard cutoff fails on the muddle → an S-curve of *confidence* | that "61% likely" is a prediction rather than a rate |
| 3 | Asking the neighbours | k-NN | The odd one out: **nothing is trained at all**. The examples *are* the model | that 100% on your own data is a good score |
| 4 | The widest street | SVM | Many lines separate the data — pick the one with most clearance. Only a few points decide it | that every example contributes to the answer |
| 5 | Stacking the pieces | Neural network | No straight line can work. Stack simple line-detectors and bend them into a loop | that a stuck model just needs more training |

Lessons 1, 2 and 5 all end on the same picture — wrongness is a landscape, and
the machine walks downhill. Lesson 3 pointedly has no landscape, and lesson 4
climbs to a peak instead. That contrast is deliberate.

Every lesson closes with a **So what?** act: the plain words mapped onto the
real ones (*typical miss* → **loss**, *step size* → **learning rate**), and four
places the idea already turns up in the reader's life. The real vocabulary is
withheld until then on purpose — a name is only useful once you have the thing
it names.

### Earlier prototypes

Six first-generation single-file demos remain in the repo root. They are **not**
dead weight — four of them (logistic regression, k-NN, SVM, MLP) are the working
specification for lessons 2–5, and `emergence-of-intelligence.html` and
`neuron_garden_apple_glass.html` have no equivalent here at all.

Each carries a ~5 MB base64 background image, ~32 MB in total, so exclude them
from the deploy (or move them to `archive/`) before publishing. Retire each one
as its replacement lesson lands — that is what happened to the linear-regression
prototype.
