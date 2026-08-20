import { GraduationCap, TrendingDown, Target, Lightbulb } from 'lucide-react';

/**
 * TrainingReport — what the student's model actually learned, in numbers.
 *
 * Every figure here was measured by lib/cv/digitTrainer.js on a held-out test
 * split: train a fresh classifier head on one dataset, then score it against all
 * three. Nothing is authored — if a clean-trained model happens to do fine on
 * noisy digits, this panel says so, because that would be the truth about the
 * data.
 *
 * The matrix is the lesson: read a ROW to see one model meeting three different
 * worlds, and the diagonal to see how flattering "test on your own data" is.
 */

const LABELS = {
  clean: 'Clean digits',
  messy: 'Messy scribbles',
  noisy: 'Noisy input',
};

const pct = (v) => `${Math.round(v * 100)}%`;

function toneFor(value) {
  if (value >= 0.85) return { fg: '#4ade80', bg: 'rgba(48,209,88,.14)', bd: 'rgba(48,209,88,.45)' };
  if (value >= 0.6) return { fg: '#ffcf70', bg: 'rgba(255,159,10,.13)', bd: 'rgba(255,159,10,.42)' };
  return { fg: '#ff6b6b', bg: 'rgba(255,69,58,.13)', bd: 'rgba(255,69,58,.45)' };
}

/** Turn the measured numbers into a sentence, without overselling them. */
function verdict(variant, accuracy) {
  const own = accuracy[variant];
  const others = Object.entries(accuracy).filter(([k]) => k !== variant);
  if (!others.length || own == null) return null;

  const [worstName, worstValue] = others.reduce((a, b) => (b[1] < a[1] ? b : a));
  const drop = own - worstValue;

  if (drop >= 0.15) {
    return `Your model scores ${pct(own)} on the ${LABELS[variant].toLowerCase()} it grew up on, but only ${pct(worstValue)} on ${LABELS[worstName].toLowerCase()} — a drop of ${Math.round(drop * 100)} points. It didn't learn "what a digit is". It learned "what a digit looks like in THIS dataset".`;
  }
  if (drop >= 0.05) {
    return `Your model scores ${pct(own)} on its own data and ${pct(worstValue)} on ${LABELS[worstName].toLowerCase()}. A modest gap — this training set generalised better than most, but it still has a favourite kind of input.`;
  }
  return `Your model holds up across all three datasets (worst case ${pct(worstValue)} on ${LABELS[worstName].toLowerCase()}). That is the goal: performance that doesn't depend on which data it happened to meet first.`;
}

function Bar({ name, value, isOwn }) {
  const tone = toneFor(value);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '.92rem' }}>
        <span style={{ color: isOwn ? '#fff' : 'var(--text-secondary)', fontWeight: isOwn ? 700 : 500 }}>
          {LABELS[name] || name}
          {isOwn && <span style={{ color: '#4ade80', fontSize: '.76rem', marginLeft: 8 }}>← trained on this</span>}
        </span>
        <span style={{ color: tone.fg, fontWeight: 700, fontFamily: 'monospace' }}>{pct(value)}</span>
      </div>
      <div style={{ height: 9, borderRadius: 999, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
        <div style={{ width: `${value * 100}%`, height: '100%', borderRadius: 999, background: tone.fg, transition: 'width .6s ease' }} />
      </div>
    </div>
  );
}

export default function TrainingReport({ variant, matrix, compact = false }) {
  if (!matrix || !matrix[variant]) return null;

  const own = matrix[variant];
  const testNames = Object.keys(own.accuracy);
  const trainNames = Object.keys(matrix);
  const line = verdict(variant, own.accuracy);

  return (
    <div style={{
      background: 'rgba(0,0,0,.32)', borderRadius: compact ? 12 : 16, padding: compact ? 14 : 26,
      border: '1px solid rgba(255,255,255,.07)', marginBottom: compact ? 10 : 24,
    }}>
      <h3 style={{
        fontSize: compact ? '1rem' : '1.5rem', color: 'var(--accent-purple)', marginTop: 0, marginBottom: compact ? 4 : 6,
        display: 'flex', alignItems: 'center', gap: compact ? 6 : 10,
      }}>
        <GraduationCap size={compact ? 18 : 26} /> {compact ? 'Model Report' : 'What your model actually learned'}
      </h3>
      {!compact && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '.95rem', lineHeight: 1.6, marginTop: 0, marginBottom: 22 }}>
          Trained on {own.trainedOn} real images from the <strong>{LABELS[variant] || variant}</strong> dataset,
          then tested on images it had never seen from all three. These are measured scores.
        </p>
      )}

      {/* Row view: one model, three worlds */}
      <div style={{ marginBottom: compact ? 10 : 26 }}>
        {!compact && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', textTransform: 'uppercase',
            letterSpacing: '.09em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 12,
          }}>
            <Target size={15} /> How your model scores on each dataset
          </div>
        )}
        {testNames.map((name) => (
          <Bar key={name} name={name} value={own.accuracy[name]} isOwn={name === variant} />
        ))}
      </div>

      {line && (
        <div style={{
          padding: compact ? '8px 10px' : '16px 18px', borderRadius: compact ? 8 : 12, marginBottom: compact ? 0 : 26,
          background: 'rgba(178,0,255,.08)', borderLeft: '4px solid var(--accent-purple)',
          color: '#e8eaf2', fontSize: compact ? '.85rem' : '1.02rem', lineHeight: compact ? 1.4 : 1.65,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d9a8ff', fontWeight: 700, marginBottom: 4, fontSize: compact ? '.75rem' : '.86rem' }}>
            <TrendingDown size={compact ? 13 : 16} /> The verdict
          </div>
          {line}
        </div>
      )}

      {/* The full matrix — hidden in compact mode */}
      {!compact && trainNames.length > 1 && (
        <>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, fontSize: '.78rem', textTransform: 'uppercase',
            letterSpacing: '.09em', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 12,
          }}>
            <Lightbulb size={15} /> Every combination — train on one, test on another
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 6, minWidth: 460 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', color: 'var(--text-secondary)', fontSize: '.78rem', fontWeight: 600, padding: '0 8px' }}>
                    trained ↓ / tested →
                  </th>
                  {testNames.map((name) => (
                    <th key={name} style={{ color: 'var(--text-secondary)', fontSize: '.8rem', fontWeight: 600, padding: '0 8px' }}>
                      {LABELS[name] || name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trainNames.map((trained) => (
                  <tr key={trained}>
                    <td style={{
                      color: trained === variant ? '#fff' : 'var(--text-secondary)',
                      fontWeight: trained === variant ? 700 : 500, fontSize: '.86rem', padding: '0 8px', whiteSpace: 'nowrap',
                    }}>
                      {LABELS[trained] || trained}
                      {trained === variant && <span style={{ color: '#4ade80', marginLeft: 6 }}>★</span>}
                    </td>
                    {testNames.map((tested) => {
                      const value = matrix[trained]?.accuracy?.[tested];
                      if (value == null) return <td key={tested} />;
                      const tone = toneFor(value);
                      const diagonal = trained === tested;
                      return (
                        <td key={tested} style={{
                          textAlign: 'center', padding: '11px 14px', borderRadius: 10,
                          background: tone.bg, border: `1px solid ${diagonal ? tone.fg : tone.bd}`,
                          color: tone.fg, fontWeight: 700, fontFamily: 'monospace', fontSize: '1.02rem',
                        }}>
                          {pct(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '.88rem', lineHeight: 1.65, marginTop: 14, marginBottom: 0 }}>
            The diagonal is every model marking its own homework — always the flattering number. The
            off-diagonal cells are the honest ones, and they are what a model meets the day it leaves
            the lab. Any real report that quotes only the diagonal is telling you half the story.
          </p>
        </>
      )}
    </div>
  );
}
