import {
  createContext, useContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import * as voice from '../voice.js';

/**
 * ChitiProvider -- the guide's speech + caption state for the whole flow.
 *
 * Deliberately narrower than the main app's ChitiProvider: no 3D renderer, no
 * mood/action system. It owns exactly the thing the main app's coach panel is
 * currently missing, which is that **it speaks**.
 *
 * The one rule that matters:
 *   `say()` is keyed. React re-renders constantly; speech must not. A line only
 *   speaks when its `key` changes, so a component can call say() in an effect
 *   without guarding it and still not stutter.
 */

const ChitiContext = createContext(null);

const FALLBACK = {
  caption: '', sentence: '', speaking: false, muted: false, voiceQuality: 'none',
  say: () => {}, hush: () => {}, setMuted: () => {}, suggestion: null,
  suggest: () => {}, clearSuggestion: () => {},
};

export const useChiti = () => useContext(ChitiContext) || FALLBACK;

export function ChitiProvider({ children }) {
  const [caption, setCaption] = useState('');
  const [sentence, setSentence] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMutedState] = useState(() => voice.isMuted());
  const [suggestion, setSuggestion] = useState(null);
  const [quality, setQuality] = useState('none');

  const lastKey = useRef(null);
  const cancelRef = useRef(() => {});

  useEffect(() => {
    voice.warmVoices();
    // Voice list is async in Chrome, so re-read quality once it has settled.
    const t = setTimeout(() => setQuality(voice.voiceQuality()), 400);
    setQuality(voice.voiceQuality());

    // Autoplay policy: the first real gesture unlocks speech and flushes any
    // line that was queued before it.
    const unlock = () => voice.unlockVoice();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      cancelRef.current();
    };
  }, []);

  /** Stop talking immediately, keep the caption on screen. */
  const hush = useCallback(() => {
    cancelRef.current();
    voice.stop();
    setSpeaking(false);
  }, []);

  /**
   * Speak a line and show it as a caption.
   * @param {string} text
   * @param {{key?:string, force?:boolean}} opts  `key` dedupes; `force` overrides.
   */
  const say = useCallback((text, opts = {}) => {
    if (!text) return;
    const key = opts.key ?? text;
    if (!opts.force && lastKey.current === key) return;
    lastKey.current = key;

    cancelRef.current();
    setCaption(text);
    setSentence('');
    setSpeaking(true);

    // Captions are the source of truth. If speech is muted or unsupported the
    // caption still renders -- a student on a silent laptop misses nothing.
    cancelRef.current = voice.speakSentences(text, {
      onSentence: (s) => setSentence(s),
      onEnd: () => { setSpeaking(false); setSentence(''); },
    });
  }, []);

  const setMuted = useCallback((m) => {
    voice.setMuted(m);
    setMutedState(m);
    if (m) hush();
  }, [hush]);

  /**
   * Offer a next step as a real button.
   * @param {{label:string, action:string, onRun:Function}|null} s
   */
  const suggest = useCallback((s) => setSuggestion(s), []);
  const clearSuggestion = useCallback(() => setSuggestion(null), []);

  const value = useMemo(() => ({
    caption, sentence, speaking, muted, voiceQuality: quality,
    say, hush, setMuted, suggestion, suggest, clearSuggestion,
  }), [caption, sentence, speaking, muted, quality, say, hush, setMuted,
    suggestion, suggest, clearSuggestion]);

  return <ChitiContext.Provider value={value}>{children}</ChitiContext.Provider>;
}
