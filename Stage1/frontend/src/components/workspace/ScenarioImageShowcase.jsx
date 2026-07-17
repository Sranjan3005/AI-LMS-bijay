import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, LabelList } from 'recharts';
import { ShieldAlert, ShieldCheck, Eye, EyeOff, Link2, AlertTriangle } from 'lucide-react';

/**
 * ScenarioImageShowcase — "look at the real data before the numbers".
 *
 * For the image-flavoured classification scenarios we show the ACTUAL sample
 * images bundled in /public/datasets (see ATTRIBUTIONS.md) instead of jumping
 * straight to an abstract chart:
 *   • Mushroom (Forest Forager): mixed grid → "show only dangerous" filter → a
 *     weightage chart of edible vs poisonous.
 *   • Trash Can: a Good-data vs Bad-data split so students see what quality means.
 *   • Spam Catcher: real-looking message cards with the spammy features flagged.
 * Renders nothing for scenarios without a showcase.
 */

const CONFIG = {
  'The Forest Forager': {
    mode: 'mushroom',
    heading: '🍄 The real mushrooms in this dataset',
    blurb: 'Before the numbers — look at the actual data. Some of these are a tasty dinner; some can kill you. Could you tell them apart from a photo alone? That is exactly the problem the classifier has to solve.',
    // Colour-controlled groups so we can show that colour ≠ safety, and so the
    // biased "Red = Danger" variant can reveal the spurious correlation.
    groups: [
      { key: 'mushroom/red_poison',   color: 'Red',   danger: true },
      { key: 'mushroom/red_safe',     color: 'Red',   danger: false },
      { key: 'mushroom/brown_poison', color: 'Brown', danger: true },
      { key: 'mushroom/brown_safe',   color: 'Brown', danger: false },
    ],
  },
  'The Smart Trash Can': {
    mode: 'split',
    heading: '🗑️ Good data vs bad data',
    blurb: 'A vision model is only as good as the photos it learns from. Clear, well-lit shots teach it the real thing; blurry, dark or cluttered ones just confuse it. Same object — very different data quality.',
    good: { key: 'trash/good', label: 'Good data', tone: 'good', hint: 'Sharp, well-lit, one item, plain background.' },
    bad: { key: 'trash/bad', label: 'Bad data', tone: 'danger', hint: 'Blurry, dark, cluttered piles, many things at once.' },
  },
  'The Spam Catcher': { mode: 'spam' },
};

// Does this scenario have a real-image showcase? (used to replace the abstract
// parallel-coordinates chart on image-flavoured classification scenarios).
export const hasImageShowcase = (title) => Boolean(CONFIG[title]);

// Per-variant views for the Trash Can — so "Pristine" shows ONLY clean data,
// "The Real World" ONLY messy data, and "Mostly Plastic" an imbalance. When no
// variant is selected (collection page / scenario level) we fall back to the
// good-vs-bad comparison in CONFIG.
const TRASH_VARIANTS = {
  pristine: { kind: 'single', key: 'trash/good', tone: 'good',
    heading: '🗑️ Pristine data — spotless & studio-lit',
    blurb: 'Every photo is sharp, centred and perfectly lit. A model trained only on these looks brilliant… because it has only ever seen a photoshoot.' },
  realworld: { kind: 'single', key: 'trash/bad', tone: 'danger',
    heading: '🗑️ Real-world data — messy & unpredictable',
    blurb: 'Crushed cans, curry-stained paper, poor lighting — waste as it actually arrives. This is the data that reveals whether the model truly learned.' },
  biased: { kind: 'biased', key: 'trash/good', tone: 'warn',
    heading: '🗑️ Biased data — almost all one kind',
    blurb: 'Nearly every photo is the same category (plastic bottles), with barely any of the rest. The model becomes an expert at the common thing and a beginner at everything else.' },
};

const SPAM_SAMPLES = [
  { spam: true, text: 'WINNER!! You have been selected for a FREE $1000 gift card. Click http://bit.ly/x2f to claim NOW!!!', flags: ['ALL CAPS', '“FREE”', 'link', 'urgency', '!!!'] },
  { spam: true, text: 'URGENT: your account will be suspended. Verify your password here → secure-login.co', flags: ['urgency', 'link', 'asks for password'] },
  { spam: true, text: 'Congratulations! U have WON 2 tickets. Txt WIN to 85233 to receive. Std rates apply.', flags: ['prize', 'premium SMS', 'txt-speak'] },
  { spam: false, text: 'Hey, are we still meeting for the science project at 4pm today?', flags: ['normal words', 'a question', 'no links'] },
  { spam: false, text: 'Mom said dinner is ready, come downstairs.', flags: ['casual', 'personal', 'short'] },
  { spam: false, text: "Don't forget your calculator for tomorrow's test.", flags: ['reminder', 'no caps', 'no links'] },
];

// Per-variant message sets — each Spam Catcher variant teaches a different trap,
// so each shows different messages. `trap: true` marks a message the naive model
// gets WRONG (the whole point of that variant). Falls back to the balanced mix.
const SPAM_VARIANTS = {
  balanced: {
    heading: '✉️ Balanced data — a fair mix',
    blurb: 'Equal numbers of obvious spam and normal messages, each with clear tell-tale features. The easiest data to learn from — and a model trained here does well.',
    samples: SPAM_SAMPLES,
  },
  caps: {
    heading: '✉️ The ALL-CAPS trap',
    blurb: 'Here the ONLY clue the model is given is how much SHOUTING there is. It happily learns “ALL CAPS = spam” — until a genuinely excited real message gets wrongly flagged.',
    samples: [
      { spam: true, text: 'WINNER!!! CLAIM YOUR FREE PRIZE NOW — LIMITED TIME!!!', flags: ['ALL CAPS', '“FREE”', '!!!'] },
      { spam: true, text: 'URGENT!!! VERIFY YOUR ACCOUNT IMMEDIATELY OR LOSE ACCESS', flags: ['ALL CAPS', 'urgency'] },
      { spam: false, text: 'hey, are we still on for 4pm today?', flags: ['no caps', 'a question'] },
      { spam: false, text: 'WE WON THE MATCH!!! SO HAPPY RIGHT NOW 🎉', flags: ['ALL CAPS', 'genuine'], trap: true },
    ],
  },
  sarcasm: {
    heading: '✉️ The polite-spam trap',
    blurb: 'Now the spam is written politely and formally, while the real messages are the loud, excited ones. A model that learned “caps & !!! = spam” now gets it exactly backwards.',
    samples: [
      { spam: true, text: 'Dear valued customer, kindly verify your account at your earliest convenience via the secure portal.', flags: ['polite', 'formal', 'link'] },
      { spam: true, text: 'Good afternoon. You may be eligible for a complimentary reward. Please review the attached details.', flags: ['formal', 'no caps', 'no !!!'] },
      { spam: false, text: 'OMG we WON!!! 🎉🎉 I still can’t believe it!!', flags: ['ALL CAPS', '!!!', 'genuine'], trap: true },
      { spam: false, text: 'GUYS the trip is CONFIRMED!!! so hyped!!!', flags: ['ALL CAPS', '!!!', 'genuine'], trap: true },
    ],
  },
};

const TONE = {
  good: { fg: '#4ade80', bd: 'rgba(48,209,88,.45)', bg: 'rgba(48,209,88,.09)' },
  danger: { fg: '#ff6b6b', bd: 'rgba(255,69,58,.5)', bg: 'rgba(255,69,58,.09)' },
};

const src = (rel) => `/datasets/${rel}`;

function Panel({ heading, blurb, children }) {
  return (
    <div style={{ gridColumn: '1 / -1', background: 'rgba(10,14,26,0.55)', border: '1px solid var(--glass-border)', borderRadius: 16, padding: 20 }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem' }}>{heading}</h3>
      {blurb && <p style={{ margin: '0 0 16px', color: 'var(--text-secondary)', fontSize: '.92rem', lineHeight: 1.6 }}>{blurb}</p>}
      {children}
    </div>
  );
}

function SplitColumn({ c, manifest }) {
  const files = manifest[c.key] || [];
  const t = TONE[c.tone];
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 14, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: t.fg, fontWeight: 700 }}>
        {c.tone === 'good' ? <ShieldCheck size={17} /> : <AlertTriangle size={17} />} {c.label}
      </div>
      <div style={{ fontSize: '.8rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{c.hint}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8 }}>
        {files.map(f => <Thumb key={f} rel={f} tone={c.tone} />)}
      </div>
    </div>
  );
}

function Thumb({ rel, badge, tone }) {
  const t = TONE[tone] || {};
  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: `1px solid ${t.bd || 'var(--glass-border)'}`, aspectRatio: '1 / 1', background: '#0a0e1a' }}>
      <img src={src(rel)} alt={badge} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {badge && (
        <span style={{ position: 'absolute', left: 6, bottom: 6, fontSize: '.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(5,6,15,.8)', color: t.fg || '#fff', border: `1px solid ${t.bd || 'transparent'}` }}>
          {badge}
        </span>
      )}
    </div>
  );
}

export default function ScenarioImageShowcase({ scenario, variant }) {
  const cfg = CONFIG[scenario?.title];
  const [manifest, setManifest] = useState(null);
  const [dangerOnly, setDangerOnly] = useState(false);

  useEffect(() => {
    if (!cfg || cfg.mode === 'spam') return;
    let alive = true;
    fetch('/datasets/manifest.json').then(r => r.json()).then(m => { if (alive) setManifest(m); }).catch(() => {});
    return () => { alive = false; };
  }, [cfg]);

  if (!cfg) return null;

  /* ── Spam: variant-specific message sets (text cards, no images) ── */
  if (cfg.mode === 'spam') {
    const sv = (variant && SPAM_VARIANTS[variant]) || {
      heading: '✉️ Real messages the filter has to sort',
      blurb: "Spam detectors don't read like humans — they hunt for tell-tale features. Here are real-style messages; the flagged chips are the clues a model actually learns.",
      samples: SPAM_SAMPLES,
    };
    return (
      <Panel heading={sv.heading} blurb={sv.blurb}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
          {sv.samples.map((m, i) => {
            const t = m.spam ? TONE.danger : TONE.good;
            return (
              <div key={i} style={{ background: t.bg, border: `1px solid ${m.trap ? 'rgba(255,159,10,.55)' : t.bd}`, borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: t.fg, fontWeight: 700, fontSize: '.82rem' }}>
                  {m.spam ? <ShieldAlert size={15} /> : <ShieldCheck size={15} />} {m.spam ? 'SPAM' : 'Not spam'}
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '.9rem', lineHeight: 1.5, color: '#e8eaf2' }}>{m.text}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {m.flags.map(f => (
                    <span key={f} style={{ fontSize: '.7rem', padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      {/link/i.test(f) && <Link2 size={11} />}{f}
                    </span>
                  ))}
                </div>
                {m.trap && (
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '.76rem', color: '#ffcf70' }}>
                    <AlertTriangle size={13} /> A naive model flags this wrongly — that&apos;s the trap.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    );
  }

  if (!manifest) return null;

  /* ── Trash: variant-specific quality view, or the good-vs-bad comparison ── */
  if (cfg.mode === 'split') {
    const vv = variant && TRASH_VARIANTS[variant];
    if (vv) {
      const files = manifest[vv.key] || [];
      // "biased" repeats the majority class to convey lopsided volume.
      const tiles = vv.kind === 'biased' ? [...files, ...files] : files;
      return (
        <Panel heading={vv.heading} blurb={vv.blurb}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
            {tiles.map((f, i) => <Thumb key={`${f}-${i}`} rel={f} tone={vv.tone} />)}
          </div>
          {vv.kind === 'biased' && (
            <p style={{ marginTop: 12, color: '#ffcf70', fontSize: '.88rem', lineHeight: 1.5 }}>
              ⚠️ …and almost nothing from the other categories. Imbalance hides inside the overall accuracy score — always check accuracy <b>per category</b>.
            </p>
          )}
        </Panel>
      );
    }
    return (
      <Panel heading={cfg.heading} blurb={cfg.blurb}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14 }}>
          <SplitColumn c={cfg.good} manifest={manifest} />
          <SplitColumn c={cfg.bad} manifest={manifest} />
        </div>
      </Panel>
    );
  }

  /* ── Mushroom: colour-controlled groups, variant-aware ── */
  const items = cfg.groups.flatMap(g => (manifest[g.key] || []).map(rel => ({ rel, color: g.color, danger: g.danger })));
  const badgeFor = (m) => `${m.color === 'Red' ? '🔴' : '🟤'} ${m.danger ? '☠️ Poison' : '✅ Safe'}`;

  // "Red = Danger" variant: the data only ever pairs red↔poison and brown↔safe,
  // so the model learns the lazy colour shortcut — and fails the real exceptions.
  if (variant === 'biased') {
    const learned = items.filter(m => (m.color === 'Red') === m.danger);
    const exceptions = items.filter(m => (m.color === 'Red') !== m.danger);
    return (
      <Panel heading="🍄 Biased data — “Red = Danger”"
        blurb="In THIS dataset every poisonous mushroom happens to be red, and every safe one brown. So the model takes the lazy shortcut — it learns “red = danger” instead of the real warning signs.">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
          {learned.map(m => <Thumb key={m.rel} rel={m.rel} tone={m.danger ? 'danger' : 'good'} badge={badgeFor(m)} />)}
        </div>
        {exceptions.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '18px 0 8px', color: '#ffcf70', fontWeight: 600, fontSize: '.9rem' }}>
              <AlertTriangle size={16} /> …but the real forest also has these — and the biased model gets every one WRONG:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10 }}>
              {exceptions.map(m => <Thumb key={m.rel} rel={m.rel} tone={m.danger ? 'danger' : 'good'} badge={badgeFor(m)} />)}
            </div>
          </>
        )}
      </Panel>
    );
  }

  // Diverse / general: colour ≠ safety, with a danger filter + weightage chart.
  const dangerCount = items.filter(m => m.danger).length;
  const shown = dangerOnly ? items.filter(m => m.danger) : items;
  const chartData = [
    { name: 'Poisonous ☠️', count: dangerCount, fill: '#ff453a' },
    { name: 'Edible ✅', count: items.length - dangerCount, fill: '#30d158' },
  ];

  return (
    <Panel heading={cfg.heading}
      blurb="Look closely: some red mushrooms are perfectly safe, and some brown ones are deadly. Colour alone can’t tell you — which is exactly why the model has to learn the subtler features.">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setDangerOnly(v => !v)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: dangerOnly ? TONE.danger.bg : 'rgba(255,255,255,.05)', border: `1px solid ${dangerOnly ? TONE.danger.bd : 'var(--glass-border)'}`, color: dangerOnly ? TONE.danger.fg : 'var(--text-secondary)', borderRadius: 999, padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '.85rem' }}>
          {dangerOnly ? <Eye size={15} /> : <EyeOff size={15} />}
          {dangerOnly ? 'Showing dangerous only' : '☠️ Filter: show only dangerous'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(110px,1fr))', gap: 10, marginBottom: 20 }}>
        {shown.map(m => (
          <Thumb key={m.rel} rel={m.rel} tone={m.danger ? 'danger' : 'good'} badge={badgeFor(m)} />
        ))}
      </div>

      <div style={{ fontSize: '.8rem', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-secondary)', marginBottom: 6 }}>
        Their weightage in the dataset
      </div>
      <div style={{ width: '100%', height: 120 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 40, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#cdd1e0', fontSize: 13 }} axisLine={false} tickLine={false} />
            <Bar dataKey="count" radius={[0, 8, 8, 0]}>
              {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              <LabelList dataKey="count" position="right" fill="#fff" fontSize={13} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
