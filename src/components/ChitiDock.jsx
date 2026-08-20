import { Volume2, VolumeX, Pause } from 'lucide-react';
import { useChiti } from '../lib/chiti/ChitiProvider.jsx';
import { useLesson } from '../lib/chiti/LessonProvider.jsx';
import { resolve } from '../lib/chiti/lesson.js';

/**
 * ChitiDock -- the guide, pinned to the bottom of every step.
 *
 * The rule this component exists to enforce: **the caption is the deliverable,
 * the audio is the bonus.** Every line is readable with the sound off, on a
 * muted laptop, on a Chromebook whose only voice is a flat robot. Audio never
 * gates anything and never blocks the Next button.
 *
 * `sentence` is the clause currently being spoken; it is highlighted inside the
 * full caption so a student can follow along, and it simply does not appear
 * when speech is off.
 */
export default function ChitiDock() {
  const {
    caption, sentence, speaking, muted, setMuted, hush, suggestion, voiceQuality,
  } = useChiti();
  const { beat, index, total, advance, waiting } = useLesson();

  if (!caption) return null;

  // Split the caption so the live sentence can be emphasised without
  // re-rendering the text into a different order.
  const at = sentence ? caption.indexOf(sentence) : -1;
  const before = at > 0 ? caption.slice(0, at) : '';
  const after = at >= 0 ? caption.slice(at + sentence.length) : '';

  return (
    <div className="chiti-dock">
      <div className="chiti-inner">
        <div className={`chiti-avatar${speaking ? ' talking' : ''}`} aria-hidden="true">🤖</div>

        <div className="chiti-body">
          <div className="chiti-name">Chiti</div>
          <p className="chiti-caption">
            {at >= 0 ? (
              <>
                <span className="muted">{before}</span>
                <span className="live">{sentence}</span>
                <span className="muted">{after}</span>
              </>
            ) : caption}
          </p>

          {beat?.ask && <div className="chiti-ask">{resolve(beat.ask)}</div>}

          {waiting && (
            <div className="chiti-wait"><span className="dot" />{waiting}</div>
          )}

          {beat && !waiting && (
            <div className="chiti-suggest">
              <button type="button" className="btn primary" onClick={advance}>
                {beat.cta || 'Go on'} →
              </button>
            </div>
          )}

          {total > 0 && (
            <div className="chiti-progress" aria-label={`Beat ${index + 1} of ${total}`}>
              {Array.from({ length: total }).map((_, i) => (
                <span key={i} className={`chiti-pip${i === index ? ' on' : i < index ? ' done' : ''}`} />
              ))}
            </div>
          )}

          {suggestion && (
            <div className="chiti-suggest">
              <button type="button" className="btn good" onClick={suggestion.onRun}>
                {suggestion.label}
              </button>
            </div>
          )}

          {muted && (
            <div className="chiti-insight">
              Sound is off — Chiti still writes everything down here.
            </div>
          )}
          {!muted && voiceQuality === 'generic' && (
            <div className="chiti-insight">
              No Indian-English voice on this device, so Chiti sounds a bit flat.
              The captions are the same either way.
            </div>
          )}
        </div>

        <div className="chiti-tools">
          {speaking && (
            <button type="button" className="icon-btn" onClick={hush} title="Stop talking" aria-label="Stop talking">
              <Pause size={15} />
            </button>
          )}
          <button
            type="button"
            className="icon-btn"
            onClick={() => setMuted(!muted)}
            title={muted ? 'Turn Chiti’s voice on' : 'Mute Chiti'}
            aria-label={muted ? 'Unmute Chiti' : 'Mute Chiti'}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
