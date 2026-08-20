/**
 * visuals -- animated diagrams, written as inline SVG.
 *
 * WHY NOT STOCK IMAGES
 *
 * Every one of these has to say something specific and true about *this*
 * module: a stack of convolutions narrowing to one summary, a frozen tower with
 * one unlocked layer, a vocabulary with a hole in it. No stock library has that, and a decorative photo of a
 * server rack would be worse than the text it replaced.
 *
 * Inline SVG also means: no download, no CDN, no licence question, works
 * offline, scales to any screen, and recolours with the theme. Each one is a
 * few dozen lines and animates with CSS only -- no animation library.
 *
 * Where a *video* would genuinely beat a diagram, there is a `<VideoSlot>`
 * instead, which renders a placeholder until a file is dropped in. See
 * VIDEOS.md for what to generate and the prompts to generate it with.
 */

import { useEffect, useState } from 'react';

/* ------------------------------------------------------------------ CNN ---- */

/**
 * A photo going through the convolution stack and coming out as 2,048 numbers.
 *
 * Deliberately NOT a lesson in how convolution works -- that is a different
 * module, and this one has ten steps to get through. What it has to say is the
 * single structural fact the rest of the flow depends on: **the picture gets
 * smaller at every step, the description gets richer, and the naming happens
 * only at the very end.** Hold on to that and "freeze everything except the
 * last bit" stops sounding arbitrary.
 */
export function CnnAnatomy() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPhase((p) => (p + 1) % 5), 1500);
    return () => clearInterval(t);
  }, []);

  // Width shrinks, filter count grows. These are ResNet-50's actual shapes.
  const stages = [
    { px: 54, filters: 64, label: '112x112' },
    { px: 42, filters: 256, label: '56x56' },
    { px: 30, filters: 1024, label: '14x14' },
    { px: 20, filters: 2048, label: '7x7' },
  ];

  return (
    <figure className="viz">
      <svg viewBox="0 0 472 150" role="img" aria-label="A photo passing through convolution layers and becoming a list of numbers">
        {/* the photo */}
        <g transform="translate(8, 22)">
          <rect width="66" height="66" rx="7" fill="#1c2033" stroke="rgba(255,255,255,.16)" />
          <circle cx="33" cy="27" r="14" fill="#ff9f0a" opacity=".85" />
          <path d="M9 58 Q33 34 57 58 Z" fill="#30d158" opacity=".7" />
          <text x="33" y="86" textAnchor="middle" fill="#9aa0b5" fontSize="9.5">your photo</text>
        </g>

        {/* the convolution stages, drawn as stacks of feature maps */}
        {stages.map((st, i) => {
          const x = 92 + i * 70;
          const on = phase > i;
          const top = 22 + (66 - st.px) / 2;
          return (
            <g key={st.label} transform={`translate(${x}, 0)`}>
              {[2, 1, 0].map((d) => (
                <rect
                  key={d}
                  x={d * 3}
                  y={top - d * 3}
                  width={st.px}
                  height={st.px}
                  rx="3"
                  fill={on ? '#2f3557' : '#232842'}
                  stroke="rgba(255,255,255,.1)"
                  style={{ transition: `fill .4s ease ${i * 80}ms` }}
                />
              ))}
              <text x={st.px / 2} y="104" textAnchor="middle" fill="#6b7288" fontSize="8.5">
                {st.label}
              </text>
              <text
                x={st.px / 2}
                y="116"
                textAnchor="middle"
                fill={on ? '#64d2ff' : '#3d4260'}
                fontSize="8.5"
                style={{ transition: 'fill .4s ease' }}
              >
                {st.filters} filters
              </text>
            </g>
          );
        })}

        {/* the summary vector */}
        <g transform="translate(378, 0)">
          {Array.from({ length: 9 }).map((_, i) => (
            <rect
              key={i}
              x={i * 9}
              y={40}
              width="7"
              height={phase > 3 ? 10 + ((i * 41) % 30) : 4}
              rx="2"
              fill="#ff9f0a"
              opacity={phase > 3 ? 0.9 : 0.3}
              style={{ transition: `all .45s ease ${i * 35}ms` }}
            />
          ))}
          <text x="40" y="104" textAnchor="middle" fill="#9aa0b5" fontSize="9.5">2,048 numbers</text>
          <text x="40" y="116" textAnchor="middle" fill="#ff9f0a" fontSize="8.5">the summary</text>
        </g>
      </svg>
      <figcaption>
        Small filters slide over the picture looking for one thing at a time —
        edges first, then textures, then whole parts — and each layer works on
        what the layer below it found. What comes out is one list of 2,048
        numbers describing the photo, and <b>that list is what fine-tuning
        reuses</b>. Only the naming step after it gets replaced.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------ data volume -- */

/**
 * Lab A's diagram: the same model, taught from one example versus many.
 *
 * "A small dataset fine-tunes badly and a big one fine-tunes well" is the
 * lesson this whole module is built around, and until now Lab A pointed at a
 * `data-volume` visual that was never in the registry -- so the step quietly
 * rendered nothing where its illustration belonged. This is that missing
 * picture.
 *
 * No accuracy figures appear here, on purpose. The student is about to measure
 * them, and printing a number they have not produced yet is exactly the habit
 * the rest of the module refuses.
 */
export function DataVolume() {
  const rows = [
    {
      title: 'One photo per species',
      dots: 1,
      note: 'It learns that photo — the light, the leaf behind it, the angle.',
      tone: '#ff453a',
    },
    {
      title: 'Ten photos per species',
      dots: 10,
      note: 'The accidents differ between photos, so what is left is the species.',
      tone: '#ff9f0a',
    },
    {
      title: 'A hundred per species',
      dots: 26,
      note: 'Enough that memorising is harder than actually learning.',
      tone: '#30d158',
    },
  ];

  return (
    <figure className="viz">
      <svg viewBox="0 0 360 176" role="img" aria-label="One example per class versus many examples per class">
        {rows.map((r, i) => (
          <g key={r.title} transform={`translate(12, ${i * 56 + 14})`}>
            <text x="0" y="10" fontSize="10.5" fill="#eef1f8">{r.title}</text>
            <g transform="translate(0, 17)">
              {Array.from({ length: r.dots }).map((_, d) => (
                <circle
                  key={d}
                  cx={(d % 13) * 11 + 4}
                  cy={Math.floor(d / 13) * 11 + 4}
                  r="3.4"
                  fill={r.tone}
                  opacity={0.5 + 0.5 * (d / Math.max(1, r.dots))}
                />
              ))}
            </g>
            <text x="162" y="24" fontSize="8.8" fill="#9aa0b5">{r.note}</text>
          </g>
        ))}
      </svg>
      <figcaption>
        Same model, same frozen layers, same twelve species. The only thing
        changing is how many examples of each one it gets to study — and that is
        the only thing you are going to change in this lab.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------- freezing ---- */

/** The stack, with everything locked except the last row. */
export function FreezeDiagram() {
  const rows = [
    { name: 'Early convolutions — edges, colours', locked: true },
    { name: 'Middle convolutions — textures', locked: true },
    { name: 'Late convolutions — whole parts', locked: true },
    { name: 'Pooling — the 2,048-number summary', locked: true },
    { name: 'What to call it', locked: false },
  ];
  return (
    <figure className="viz">
      <svg viewBox="0 0 340 190" role="img" aria-label="Four frozen layers and one that is retrained">
        {rows.map((r, i) => (
          <g key={r.name} transform={`translate(20, ${i * 34 + 8})`}>
            <rect
              width="300" height="26" rx="6"
              fill={r.locked ? '#1c2033' : 'rgba(255,159,10,.16)'}
              stroke={r.locked ? 'rgba(255,255,255,.1)' : '#ff9f0a'}
              className={r.locked ? '' : 'viz-pulse'}
            />
            <text x="12" y="17" fontSize="11" fill={r.locked ? '#9aa0b5' : '#eef1f8'}>
              {r.locked ? '🔒' : '🔓'} {r.name}
            </text>
            <text x="288" y="17" fontSize="9.5" textAnchor="end" fill={r.locked ? '#6b7288' : '#ff9f0a'}>
              {r.locked ? 'frozen' : 'learning'}
            </text>
          </g>
        ))}
      </svg>
      <figcaption>
        Four fifths of the model never moves. Only the bottom row is replaced —
        a few thousand numbers out of twenty-five million.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------ vocabulary gap ---- */

/** The words it has, and the hole where the one you wanted should be. */
export function VocabularyGap({ wanted = 'Monarch butterfly' }) {
  const has = ['butterfly', 'moth', 'lacewing', 'dragonfly', 'bee'];
  return (
    <figure className="viz">
      <div className="viz-words">
        {has.map((w) => <span key={w} className="viz-word">{w}</span>)}
        <span className="viz-word missing">{wanted}</span>
      </div>
      <figcaption>
        The five it offered are real words it was taught. The struck-through one
        is not in there — and no amount of asking will put it there.
      </figcaption>
    </figure>
  );
}

/* --------------------------------------------- confidence vs correctness --- */

export function ConfidenceVsCorrect() {
  return (
    <figure className="viz">
      <svg viewBox="0 0 340 120" role="img" aria-label="High confidence on a wrong answer">
        <rect x="20" y="24" width="300" height="24" rx="6" fill="#232842" />
        <rect x="20" y="24" width="264" height="24" rx="6" fill="#ff453a" opacity=".8" />
        <text x="28" y="41" fontSize="11" fill="#fff">Lotus</text>
        <text x="312" y="41" fontSize="11" fill="#fff" textAnchor="end">88%</text>

        <text x="20" y="72" fontSize="11" fill="#9aa0b5">…on a photograph of a mushroom.</text>
        <text x="20" y="94" fontSize="12.5" fill="#ffd60a" fontWeight="700">
          Being sure and being right are not the same thing.
        </text>
      </svg>
      <figcaption>
        A classifier always returns a distribution over its own classes. If the
        right answer is not among them, the number tells you nothing.
      </figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------ video slot --- */

/**
 * A place a generated clip should go.
 *
 * Renders the placeholder — with the prompt used to generate it — until the
 * file exists at `/video/<name>.mp4`. That way the slot is visible in the flow
 * and nobody has to remember where the videos were supposed to land.
 */
export function VideoSlot({ name, title, poster = null, children }) {
  const [exists, setExists] = useState(null);
  const src = `/video/${name}.mp4`;

  useEffect(() => {
    let alive = true;
    fetch(src, { method: 'HEAD' })
      .then((r) => alive && setExists(r.ok))
      .catch(() => alive && setExists(false));
    return () => { alive = false; };
  }, [src]);

  if (exists) {
    return (
      <figure className="viz">
        <video src={src} poster={poster || undefined} controls playsInline style={{ width: '100%', borderRadius: 12 }} />
        <figcaption>{title}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="viz viz-empty">
      <div className="viz-slot">
        <div style={{ fontSize: '1.6rem' }}>🎬</div>
        <b>{title}</b>
        <span className="small muted">
          Drop a clip at <code>public/video/{name}.mp4</code> and it appears here.
        </span>
        {children && <span className="small muted viz-prompt">{children}</span>}
      </div>
    </figure>
  );
}

/* ----------------------------------------------------------------- registry */

export const VISUALS = {
  'cnn-anatomy': CnnAnatomy,
  'data-volume': DataVolume,
  'freeze-diagram': FreezeDiagram,
  'vocabulary-gap': VocabularyGap,
  'confidence-vs-correct': ConfidenceVsCorrect,
};

export function Visual({ name, ...props }) {
  const Cmp = VISUALS[name];
  return Cmp ? <Cmp {...props} /> : null;
}
