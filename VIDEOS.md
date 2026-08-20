# Where videos go, and the prompts to generate them

Drop a clip at `public/video/<name>.mp4` and the matching `<VideoSlot>` picks it
up automatically — no code change. Until then the slot shows a placeholder, so
you can always see where they belong.

**Format:** MP4 (H.264), **16:9**, **1280×720**, **no audio** (Chiti is already
speaking over it), **6–12 seconds**, silent-loopable. Keep them under 2 MB —
they load inside a lesson beat, not as a page.

**Style, for all of them:** dark background `#0b0d17`, accent orange `#ff9f0a`,
secondary blue `#64d2ff`, green `#30d158`. Flat 2D motion-graphics, no
photorealism, no stock-footage people, no text baked into the frame — captions
come from Chiti, and baked text cannot be translated later.

---

## The five that earn their place

I have deliberately **not** put a video everywhere. A diagram that animates on
its own already covers most of this, and a video the student has to wait through
is worse than a picture they can read at their own speed. These five show a
*process over time*, which is the one thing a static diagram genuinely cannot.

---

### 1. `attention` — how a Transformer looks at a picture
**Step 1, beat `what-it-is`.** Replaces nothing; sits beside the SVG.

> A dark navy canvas. A single photograph of a butterfly on a leaf fades in,
> centred. The image divides into a 14×14 grid of small squares with thin glowing
> orange borders, the split animating outward from the centre. One square on the
> butterfly's wing lights up bright orange, and thin translucent blue lines shoot
> from it to every other square simultaneously, then fade. A second square, on
> the leaf, lights up and does the same. Finally all squares pulse once together
> and collapse smoothly toward the right edge into a single vertical bar of 2,048
> tiny orange segments of varying heights. Flat 2D motion graphics, dark
> background #0b0d17, orange #ff9f0a, blue #64d2ff. No text. 10 seconds, smooth
> easing, loopable.

**Why a video:** "every patch consults every other patch, twelve times" is a
*process*. The SVG can only show before and after.

---

### 2. `vocabulary-wall` — running out of words
**Step 3, beat `the-lesson`.** The emotional beat of Act 1.

> Dark background. A wall of about forty small rounded word-chips drifts slowly
> in a loose grid, each holding a simple label like "butterfly", "moth", "bee",
> "dragonfly" — generic nouns, no proper names. A camera slowly pushes in. A new
> chip flies in from the bottom, bright orange, holding a longer scientific-style
> name, and tries to find a place in the grid. It bounces off the other chips
> three times, each bounce rippling the surrounding chips, then dims to grey and
> falls out of frame. The remaining wall closes the gap. Flat 2D, dark #0b0d17,
> orange #ff9f0a, muted grey chips. No readable text required — suggested text is
> fine as long as it is not the subject. 9 seconds.

**Why a video:** the *rejection* is the point, and rejection is motion.

---

### 3. `freeze-and-swap` — what fine-tuning actually does
**Step 4, beat `the-idea`.** The single most important idea in the module.

> A tall stack of five horizontal layered slabs, seen at a slight isometric
> angle, dark slate blue. The bottom four slabs each show a small closed padlock
> and are tinted cold grey-blue; they lock into place with a subtle click-shudder
> and then stay perfectly still for the rest of the shot. The top slab is orange,
> its padlock open. That top slab slides out to the right and dissolves into
> particles. A fresh orange slab slides in from the left to take its place, and
> pulses warmly three times as thin orange threads stitch through it. The four
> grey slabs never move at all. Flat 2D isometric motion graphics, dark #0b0d17,
> frozen layers #2f3557, active layer #ff9f0a. No text. 8 seconds.

**Why a video:** the whole lesson is *which parts move and which do not*. Nothing
communicates "did not move" like watching it not move.

---

### 4. `data-volume` — why more examples help
**Step 7, Lab A.** Play it before the first training run.

> Split screen, dark background. Left half: three small orange dots scattered on
> a plane, and a wobbly dashed boundary line drawn between them that swings
> wildly and keeps changing shape, never settling. Right half: the same plane
> fills with two hundred dots pouring in from above, and a smooth confident
> boundary curve draws itself once and stays perfectly still. Both halves animate
> at the same time so the contrast is unmissable. Flat 2D, dark #0b0d17, orange
> dots #ff9f0a, blue boundary #64d2ff. No axes, no text. 7 seconds, loopable.

**Why a video:** the unstable boundary *wobbling* is the intuition, and a still
frame just shows a line.

---

### 5. `catastrophic-forgetting` — what full fine-tuning costs
**Step 9, Lab C.** Play it after the student sees the numbers drop.

> A dense network of glowing blue nodes and edges, arranged as a brain-like
> cloud, pulsing gently and stable. A small cluster of bright orange nodes
> appears at the right edge and begins to grow, its orange spreading along the
> edges into the blue network. As the orange spreads, the blue connections it
> touches flicker, thin out, and go dark one by one. By the end the network is
> mostly orange and much sparser than it started — visibly fewer connections
> overall. Ends holding on the diminished network for a beat. Flat 2D, dark
> #0b0d17, blue #64d2ff, orange #ff9f0a. Slightly ominous pacing. No text.
> 10 seconds.

**Why a video:** forgetting is *loss over time*. A before/after pair reads as two
unrelated pictures.

---

## Already covered by animated SVG — do not commission these

These are built and in `src/components/visuals/index.jsx`:

| Visual | Shows |
|---|---|
| `cnn-anatomy` | photo → shrinking feature maps → 2,048 numbers |
| `freeze-diagram` | four locked layers, one learning |
| `vocabulary-gap` | the words it has, and the one struck through |
| `confidence-vs-correct` | an 88% bar on a wrong answer |

They cost nothing, work offline, recolour with the theme, and are readable at any
size. Only replace one if a video genuinely shows something it cannot.

---

## Adding a slot

```jsx
import { VideoSlot } from '../visuals/index.jsx';

<VideoSlot name="attention" title="How a Transformer looks at a picture">
  Prompt used: …
</VideoSlot>
```

Then a beat in `lib/chiti/lesson.js` can request it with `show: 'attention'`
once it is registered in the `VISUALS` map.

## Generating them

Any text-to-video tool will do — these are simple motion graphics, not
photorealism. The prompts are written to be tool-agnostic. If a tool struggles
with the whole shot, generate it in two halves and cut, or fall back to After
Effects / Motion Canvas, where all five are an hour's work each and will look
considerably better.

**One rule:** whatever a video shows must be true of what the code does. If the
`freeze-and-swap` clip shows four layers frozen, the code must freeze four
layers. A video is the one asset that can quietly start lying after a refactor.
