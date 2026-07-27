# Design decisions

Why things are the way they are, so the next lesson does not have to re-litigate
any of it.

## Teaching shape

Every lesson runs the same six beats:

1. **A question the data can answer but the eye cannot.** Not "here is linear
   regression" — "Nour revised 6 hours, what did she score?"
2. **The learner tries by hand, and struggles.** Sliders, direct drag, a live
   score. This beat is the whole reason the lesson works.
3. **The struggle gets a number.** The vague feeling of "close enough" becomes
   one measurable quantity.
4. **The machine does it, narrated.** One step at a time, with a running plain-
   English commentary on *why* it just moved.
5. **Why that rule works.** The thing the algorithm was climbing down.
6. **So what?** The real vocabulary, and where the idea already lives in the
   reader's life.

Beat 2 is non-negotiable. Watching an optimiser converge is meaningless to
someone who has not felt the problem in their own hands first.

## Slides on the left, the picture on the right

The layout went through two bad versions before this one, and both failures are
worth recording because they are easy to repeat.

**Version one** put the chart on the left and an act's entire explanation in a
sidebar on the right. Three or four paragraphs, all the controls, all at once.
Distill's survey of interactive articles reports that *only a fraction of
readers ever touch a non-static element* — and that is exactly what a wall of
text beside a chart produces. The reader reads, or the reader plays, and mostly
they do neither properly.

**Version two** added questions in an overlay floating above the chart. Worse:
it put the explanation physically on top of the thing being explained, and
squeezed three candidate charts into 200px thumbnails. Teaching and interaction
were competing for one surface, and teaching won by covering everything.

**This version separates them in space and in time.**

- In space: **the reading column is on the left, the picture on the right**, and
  neither ever covers the other. When a prediction needs candidate charts they
  take over the *visual* panel at full size, keyed `A / B / C` to the buttons
  in the slide. Each half gets the room its job needs.
- In time: an act is a short sequence of **beats** — one slide at a time, two
  or three sentences each, with a Continue button and a progress bar. The
  picture changes with the slide, so what is on screen only ever illustrates
  the sentence currently being read.

This follows Nicky Case's "Sandbox Mode" pattern directly: *structure the
explorable so free play comes after a guided introduction to the parts.* A beat
that teaches shows no controls. A beat that says "your turn" reveals the
controls and shrinks its own copy to one line. The reader is never invited to
read and fiddle simultaneously.

`Lesson` owns the sequence; `beats` is an array on each act. Controls appear
per beat via `panels: ['manual']`, so an act reveals its instruments as it
earns them rather than dumping them on slide one.

## Checkpoints: nothing is revealed until you have bet on it

The first version of this course had all six acts and still taught badly,
because **a reader could click Next six times and never be asked anything.**
Every question mark in the prose was rhetorical. That is a documentary, not a
lesson: pleasant, forgotten by Friday.

So each lesson poses **four checkpoints**, one per beat, and Continue stays
shut until they are answered. The rules that make them work:

- **Answer by picking a picture.** Where the question is "what will happen?",
  the options are full-size charts in the visual panel, drawn with the same
  `Plot` the lesson uses. Three sentences of prose describing three outcomes is
  a reading exercise; three pictures is a prediction.
- **The live chart stays live.** Several checkpoints tell the reader to go and
  try something first — *"tick the box and drag a plant buried inside its own
  group"* — and the controls to do it are right there, unobscured. That is only
  possible because the question no longer covers them.
- **Every option gets its own written reply — wrong ones especially.** "Not
  quite" teaches nobody anything. The reply for a wrong answer says what that
  answer *would* mean, and often sends the reader off to test it: *"drag step
  size to its maximum, press restart, and watch it thrash."* Several wrong
  answers are more instructive than the right one, which is why the tests
  refuse to let an option ship without an explanation.
- **After answering, every option is marked**, not just the one picked — in the
  slide and in the picture panel together. The reader sees the whole landscape.
- **Asked once.** A checkpoint already answered in this browser shows its answer
  rather than re-quizzing — on a revisit the reader came back for the chart.

Scoring follows from the same logic: **only a first-time-correct answer earns
the point**, and no later attempt can backfill it. Getting there in the end
still counts as solved, and shows as an amber pip rather than green. Nothing is
ever hidden or locked behind a score.

### Where the four go

The placement is the same in every lesson, because the moments where a reader
can coast are the same:

| Beat | Checkpoint | What it is really for |
|---|---|---|
| Just before the machine runs | **predict** | the demonstration is worthless without a bet on it |
| At the concept most often mis-taken | **check** | catch one specific misconception, by name |
| Before the "why it works" reveal | **predict** | make them commit to the shape |
| The closing act | **recall** | transfer — can they carry it to a new problem? |

The check-beat targets a named misconception, chosen per lesson:
probability-is-not-a-prediction (lesson 2), 100%-on-your-own-data-means-nothing
(lesson 3), only-the-hard-cases-matter (lesson 4),
this-is-a-capacity-limit-not-a-training-failure (lesson 5).

### Why the real names come last

The interface says *tilt*, *typical miss*, *step size* throughout — and then
the closing act hands over **linear regression**, **loss**, **learning rate** in
a two-column table. A fifteen-year-old told "this is logistic regression" on
screen one has learnt a label. Told it on the last screen, they have learnt a
thing, and *then* its name — which is the order in which names are useful.

The closing act also answers the question every student is actually holding:
*where would I ever meet this?* Four concrete places, no hedging, and lesson 5
says plainly that this loop is what a chatbot is.

## Why act 5 shows one knob, not two

The first version of act 5 drew the full loss surface over both parameters as a
2-D heat map. It was the best-looking screen in the lesson and the least
useful one. The failure is structural, not cosmetic: **its axes silently stop
being hours-and-score and become the knobs instead.** After four acts of
looking at students, the reader is asked to accept that a single dot is now an
entire line. For the 13–18 audience that is a jump too far, landing exactly
where the payoff should be.

The replacement holds the height still and moves **one** knob. Wrongness
against tilt is then a U-shaped curve — a shape this age group has already met
in maths — with a ball on it that the student pushes themselves. The real data
and the line that tilt produces sit in a panel alongside and move with it.

The link between "a setting" and "a point on the curve" is then learned by
hand instead of asserted in a caption, which is the same reason act 2 exists.
The honest caveat (there are really two knobs, so it is a bowl rather than a
valley) costs one sentence and no comprehension.

Generalise this: **if a view needs a paragraph to explain what its axes mean,
it is the wrong view.** That rule shaped every lesson after it.

## The arc across the five lessons

The lessons are a sequence, not a menu. Each one is built to make the next one
land, and two of them exist mainly to break the pattern:

| # | Ends on | Why there |
|---|---|---|
| 1 Linear regression | wrongness is a **valley** | establishes the whole mental model |
| 2 Logistic regression | surprise is a **valley** too | same machine, new question — proves the idea transfers |
| 3 k-NN | **no valley at all** | the control case: not everything is trained |
| 4 SVM | a **peak** to climb | search, not descent — and only a few points matter |
| 5 Neural network | a valley again, **more knobs** | the payoff: same walk, bent boundary |

The closing act of each lesson draws the same **three-box loop** — guess,
measure, nudge, repeat — so the repetition is impossible to miss. Only the
middle box's caption changes: *typical miss* → *surprise* → *clearance* → *how
many landed wrong*. Lesson 3's diagram deliberately **has no return arrow**,
and the caption points at the absence.

Lesson 3 is the important one to keep. After two lessons of "start wrong, step
downhill", a learner will assume that *is* machine learning. k-NN, which stores
the examples and does all its work at question time, is the cheapest possible
correction — and it is the user's own idea from the first-generation demo (its
"Why No SGD / w / b" tab), kept because it was right.

Continuity is deliberate elsewhere too: lessons 1 and 2 use **the same forty
students**, relabelled. Nothing about the data changes; only the question does.

## Per-lesson numerical decisions

Each model has a quirk that took a sweep to settle. All are pinned by tests.

**Logistic regression** — parameterised as `sigmoid(sharpness × (hours −
tippingPoint))` rather than `sigmoid(w·x + b)`. The tipping point is readable
straight off the x-axis ("where it's a coin-flip"), and both gradients land on
the same scale. Training overshot badly at first: log-loss gradients *grow* as
the curve sharpens, so the step must decay (`lr 0.3, decay 0.8`) or sharpness
runs away past the optimum and the loss climbs back up.

**k-NN** — the cluster gap and spread are tuned so **k actually has teeth**:
k=1 overfits the stragglers, mid-k is best, k=13 over-smooths. With the blobs
any further apart, every k scored the same and the lesson's central slider
became decoration.

**SVM** — solved by **scanning the line's angle**, not by gradient descent.
Soft-margin SGD on unnormalised 0–10 coordinates was genuinely unstable
(margins oscillated, some runs failed to separate a separable set), and
Pegasos did not fix it inside a watchable number of steps. The angle scan is
exact, cannot diverge, and is *more* explainable: for a fixed direction, the
widest street is simply the gap between the two groups projected onto it.
Sweeping the angle then becomes the "machine" the lesson watches.

**Neural network** — 2 → H → 1, tanh hidden, sigmoid out, full-batch gradient
descent. Full batch (not per-sample) because the loss curve has to read as a
smooth fall on screen. Inputs are rescaled from 0–10 to about [−1, 1] inside
the model, which is what keeps the gradients sane. Backprop is checked against
a finite-difference gradient in the tests, so the maths is verified rather than
believed.

### Vocabulary

The interface never says *weight*, *bias*, *loss*, *epoch*, or *learning rate*
to the student. It says **tilt**, **height**, **typical miss**, **students
seen**, **step size**. The maths is identical; the words are ones a fifteen-year-
old already owns. Formal names belong in a follow-up lesson, once the thing
being named is already familiar.

## Why the line is anchored at *typical* hours

The model is written as

```
score = tilt × (hours − center) + height
```

not the `slope × hours + intercept` from maths class. Two reasons, one
practical and one pedagogical.

**Practical.** Hours run 0–10. In the plain form, the slope's gradient carries a
factor of *x* (up to 10) while the intercept's does not, so the two parameters
want learning rates about 40× apart. Any single rate either crawls or diverges —
the first version of this lesson did exactly that, and
`tests/linreg.test.mjs` still contains the tests that caught it. Centring makes
both gradients the same scale, and one step size works.

**Pedagogical.** "Score for a student who revised zero hours" is an
extrapolation past the edge of the data — precisely the habit a statistics
course spends a term trying to break. "Score for a typical student" is an
interpolation, and it is the number a learner can actually picture.

`Problem.toPlain()` converts back whenever the familiar form should be shown
(the map's hover tooltip does this).

## Why training starts at a flat 50

Starting at the class average would put `height` on its optimum *before the
first step*. Training would then only move in one direction, and act 5's map
would show a straight horizontal path — teaching nothing about searching a
two-dimensional surface. Starting at a plainly-wrong 50 gives both parameters
real ground to cover.

`lr 0.012 · 5 epochs · decay 0.85 · start (0, 50)` was chosen by sweeping the
grid and is pinned by tests. It lands within **0.01 points** of the exact
closed-form optimum while closing **>60% of the gap in the first epoch**, so the
demo both reads fast and finishes convincingly.

The step size decays each epoch. SGD looks at one student at a time and so never
truly settles — it orbits the answer in a noise ball whose radius scales with
the step size. Shrinking the step lets the line come to rest instead of
jittering forever. Set `decay: 1` to show a class the raw jitter.

## Colour

**Do not pick a colour by eye. Run the validator.**

The palette is three categorical slots, taken in fixed order and never cycled:

| Role | Light | Dark |
|---|---|---|
| Observations (students) | `#2a78d6` | `#3987e5` |
| The model (the line, its misses) | `#eb6834` | `#d95926` |
| The ideal (best possible fit) | `#1baf7a` | `#199e70` |

Both modes are *selected* for their own surface, not flipped. Validated for
scatter (the all-pairs case, which is stricter than adjacent-pairs):

```
worst all-pairs CVD ΔE     9.2 light · 9.4 dark   (≥8 required)
worst all-pairs normal ΔE  24.0 light · 20.9 dark (≥15 required)
```

Aqua sits at 2.74:1 on the light surface, below the 3:1 bar. That is legal here
only because **every line on every chart carries a visible direct label** — the
relief rule. If you ever remove those labels, the palette fails.

Residuals deliberately reuse the model's own hue rather than introducing a
fourth colour: a miss *belongs to* the line that produced it. The status palette
(good/warning/critical) is reserved and never used for a data series.

The valley curve in act 5 is drawn in **neutral ink, not a series colour**. It
is terrain, not data — and blue already means "a student" in the panel beside
it. One hue must never carry two meanings on one screen, even across panels,
because the shared legend below flattens them into one list.

The same three slots carry different meanings per lesson, but always **one
meaning at a time within a lesson**:

| Lesson | blue | orange | aqua |
|---|---|---|---|
| 1 Linear regression | students | the model line & its misses | the ideal fit |
| 2 Logistic regression | the S-curve | failed | passed |
| 3 k-NN | — | Dewbell flowers | Sunmoss flowers |
| 4 SVM | the street | Wheat | Barley |
| 5 Neural network | detector lines | inner core | outer ring |

Where a lesson shades whole regions (the k-NN decision map, the SVM street, the
network's boundary) it uses the **soft** variant of the same hue, never a fourth
colour — the region and its points read as one thing.

### Re-validating

```bash
node <path-to-dataviz-skill>/scripts/validate_palette.js \
  "#2a78d6,#eb6834,#1baf7a" --mode light --surface "#fcfcfb" --pairs all
```

Run it again for `--mode dark --surface "#1a1a19"` with the dark steps. Any FAIL
must be fixed before shipping; a contrast WARN obligates visible labels or the
table view.

## The page never scrolls

The lesson is an **app shell, not a document**: `.lesson` is exactly `100dvh`
with `overflow: hidden`, and the canvas takes whatever height is left after the
fixed chrome. Nothing below the fold, no hunting for the controls.

Making that hold took three things, and all three are load-bearing:

- **`min-height: 0` on every flex/grid child in the chain.** Without it a flex
  item refuses to shrink below its content and silently pushes the page taller
  — the default `min-height: auto` is the usual cause of "why does my 100vh
  layout scroll".
- **Height-based media queries**, not just width. A 1366×768 laptop has ~625px
  of content height; `@media (max-height: 860px / 780px / 700px)` progressively
  drops the subtitle, the field hints, and card padding.
- **A rail that fits, not one that scrolls.** Cards were merged (act 3's display
  toggles live inside the controls card), the stat tiles went to a single row of
  three, and the rail copy was cut roughly in half — the running commentary now
  sits under the chart, where the reader is already looking, instead of in a
  fourth rail card.

The reading column keeps `overflow-y: auto` as a last resort. At 1920×955
nothing scrolls on any slide; at 1366×625 the picture still never moves and
only the reading column can scroll, which is the one place scrolling is
ordinary — it is prose.

Splitting acts into slides bought most of that back: a slide holds two or three
sentences instead of an act's whole explanation, so the column has far less to
hold. Height queries at 860px, 780px and 700px trim slide padding, the question
note, and (below 700px) the recap table's glosses, keeping the names.

The candidate panel is `position: absolute` inside `.stage__canvas-wrap`, so it
cannot change the page height however much it contains, and it hides the live
canvas underneath rather than floating over it — otherwise the real answer
shows through the gaps between the candidates.

## Performance

MSE is a quadratic in (tilt, height), so it expands to a closed form over five
cached moments — `Problem.mseAt()`. It is what lets act 5 resample the whole
valley curve on every pointer move without thinking about it, and it will
matter more if a later lesson wants a per-pixel surface again.

## Accessibility

- Every chart has a table-view twin (**Show the numbers**).
- Identity is never colour-alone: legend always present at ≥2 series, plus
  selective direct labels.
- The canvas carries a live `aria-label` that restates the current reading in
  words, updated per step and per training step.
- Full keyboard navigation; arrow keys move between steps.
- Hit targets are forgiving — the scatter uses a nearest-point layer with a 26px
  radius rather than requiring a hit on an 8px dot.
- `prefers-reduced-motion` is honoured.
- Dark mode is a selected palette, and the explicit toggle beats the OS setting
  in both directions.
