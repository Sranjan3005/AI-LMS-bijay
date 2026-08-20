import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectRenderer } from './capability';
import * as voice from './voice';

/**
 * ChitiProvider — the character "director".
 *
 * It owns WHAT Chiti is doing, never HOW he's drawn. Renderers (3D / SVG)
 * subscribe to this state, so swapping the art is a one-file change.
 *
 *   const chiti = useChiti();
 *   chiti.perform('celebrate', { say: 'You did it!' });
 *   chiti.react('correct');
 *   chiti.present({ say: '...', action: 'wave' });   // full-screen beat
 *   chiti.dismiss();
 *
 * State:
 *   action   semantic action name (renderers map it to clips/poses)
 *   mood     'neutral' | 'happy' | 'sad' | 'surprised' | 'angry'
 *   mode     'hidden' | 'companion' (corner) | 'stage' (full screen)
 *   speaking whether he's mid-sentence (drives mouth movement)
 *   caption  the current line, shown as a speech bubble (also for muted/deaf users)
 */

const ChitiContext = createContext(null);

export const useChiti = () => useContext(ChitiContext) || FALLBACK;

// No-op shape so components never crash if used outside the provider.
const FALLBACK = {
  action: 'idle', mood: 'neutral', mode: 'hidden', speaking: false, caption: '',
  renderer: 'svg', muted: false, intensity: 0,
  perform: () => {}, react: () => {}, present: () => {}, dismiss: () => {},
  say: () => {}, setMuted: () => {}, toCompanion: () => {},
};

// Semantic reactions → action + mood. Renderers translate `action` into their
// own vocabulary (a GLTF clip, or an SVG pose).
const REACTIONS = {
  correct:   { action: 'thumbsup', mood: 'happy' },
  wrong:     { action: 'no',       mood: 'sad' },
  celebrate: { action: 'dance',    mood: 'happy' },
  unlock:    { action: 'jump',     mood: 'happy' },
  greet:     { action: 'wave',     mood: 'happy' },
  think:     { action: 'think',    mood: 'neutral' },
  point:     { action: 'point',    mood: 'neutral' },
  agree:     { action: 'yes',      mood: 'happy' },
  surprised: { action: 'jump',     mood: 'surprised' },
  idle:      { action: 'idle',     mood: 'neutral' },
  walk:      { action: 'walking',  mood: 'neutral' },
};

// One-shot actions return to idle when they finish.
const ONE_SHOT = new Set(['thumbsup', 'no', 'yes', 'jump', 'wave', 'point']);
const ONE_SHOT_MS = 2200;

export function ChitiProvider({ children }) {
  const [action, setAction] = useState('idle');
  const [mood, setMood] = useState('neutral');
  const [mode, setMode] = useState('hidden');
  const [caption, setCaption] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [intensity, setIntensity] = useState(0);   // 0..1 mouth openness, per word
  const [muted, setMutedState] = useState(voice.isMuted());
  const [renderer, setRenderer] = useState('svg');

  const revertTimer = useRef(null);
  const stopSpeech = useRef(null);
  const silentTimer = useRef(null);    // muted "talking" simulation
  const silentPulse = useRef(null);
  const captionTimer = useRef(null);

  // Decide the renderer once on mount (after the DOM exists, for the WebGL probe).
  useEffect(() => {
    setRenderer(detectRenderer());
    voice.warmVoices();
  }, []);

  // Browsers require a user gesture before speech — unlock on the first one.
  useEffect(() => {
    const unlock = () => voice.unlockVoice();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const clearSilent = () => {
    clearTimeout(silentTimer.current); silentTimer.current = null;
    clearInterval(silentPulse.current); silentPulse.current = null;
  };

  useEffect(() => () => {
    clearTimeout(revertTimer.current);
    clearTimeout(captionTimer.current);
    clearSilent();
    voice.stop();
  }, []);

  const say = useCallback((text, opts = {}) => {
    clearSilent();
    clearTimeout(captionTimer.current);
    stopSpeech.current?.();
    setCaption(text || '');
    if (!text) { setSpeaking(false); setIntensity(0); return; }

    const finish = () => {
      setSpeaking(false);
      setIntensity(0);
      opts.onEnd?.();
      // Let the line linger, then clear it so the bubble doesn't sit forever.
      captionTimer.current = setTimeout(() => setCaption(''), 6000);
    };

    // Muted or unsupported: still "talk" — mouth moves, caption reads. This is
    // the normal case in a classroom, so it has to look just as alive.
    if (voice.isMuted() || !voice.isSupported()) {
      setSpeaking(true);
      silentPulse.current = setInterval(() => setIntensity(0.3 + Math.random() * 0.7), 130);
      const words = text.split(/\s+/).length;
      const dur = Math.min(9000, 700 + words * 260);
      silentTimer.current = setTimeout(() => { clearSilent(); finish(); }, dur);
      return;
    }

    setSpeaking(true);
    stopSpeech.current = voice.speak(text, {
      // Pulse the mouth on each word — cheap, convincing lip movement.
      onBoundary: () => setIntensity(0.35 + Math.random() * 0.65),
      onEnd: finish,
    });
  }, []);

  // Do an action (optionally with a line). One-shots auto-return to idle.
  const perform = useCallback((nextAction, opts = {}) => {
    clearTimeout(revertTimer.current);
    setAction(nextAction);
    if (opts.mood) setMood(opts.mood);
    if (opts.say) say(opts.say);
    if (ONE_SHOT.has(nextAction)) {
      revertTimer.current = setTimeout(() => {
        setAction('idle');
        if (opts.mood) setMood('neutral');
      }, opts.holdMs || ONE_SHOT_MS);
    }
  }, [say]);

  // Semantic shortcut: chiti.react('correct')
  const react = useCallback((name, opts = {}) => {
    const r = REACTIONS[name] || REACTIONS.idle;
    perform(r.action, { mood: r.mood, ...opts });
  }, [perform]);

  // Take over the screen for a story beat.
  const present = useCallback(({ say: line, action: act = 'wave', mood: m = 'happy', holdMs } = {}) => {
    setMode('stage');
    perform(act, { mood: m, say: line, holdMs });
  }, [perform]);

  // Shrink to the corner companion.
  const toCompanion = useCallback(() => setMode('companion'), []);

  const dismiss = useCallback(() => {
    clearTimeout(revertTimer.current);
    clearTimeout(captionTimer.current);
    clearSilent();
    voice.stop();
    setSpeaking(false);
    setIntensity(0);
    setCaption('');
    setMode('hidden');
    setAction('idle');
    setMood('neutral');
  }, []);

  const setMuted = useCallback((m) => {
    voice.setMuted(m);
    setMutedState(m);
    if (m) { clearSilent(); setSpeaking(false); setIntensity(0); }
  }, []);

  const value = useMemo(() => ({
    action, mood, mode, caption, speaking, intensity, muted, renderer,
    perform, react, present, dismiss, say, setMuted, toCompanion,
    setRenderer,
  }), [action, mood, mode, caption, speaking, intensity, muted, renderer,
       perform, react, present, dismiss, say, setMuted, toCompanion]);

  return <ChitiContext.Provider value={value}>{children}</ChitiContext.Provider>;
}
