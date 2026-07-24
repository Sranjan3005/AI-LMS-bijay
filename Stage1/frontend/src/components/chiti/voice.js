// voice.js — Chiti's speech, via the browser's built-in Web Speech API.
// Free, no API key, works offline. Browsers block speech until the user has
// interacted with the page, so we queue the first line and flush it on the
// first gesture.
//
// `onBoundary` fires per word while speaking — the renderers use it to drive
// mouth/head movement, which is what sells the character as actually talking.

const MUTE_KEY = 'sutra_chiti_muted';

let unlocked = false;
let pending = null;          // {text, opts} queued before the first gesture
let currentUtterance = null;

export function isMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}
export function setMuted(m) {
  try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch { /* ignore */ }
  if (m) stop();
}

function synth() {
  return typeof window !== 'undefined' ? window.speechSynthesis : null;
}
export function isSupported() {
  return !!synth() && typeof window.SpeechSynthesisUtterance === 'function';
}

// Prefer an Indian-English voice, then any English one — Chiti should sound
// local to the students using it.
function pickVoice() {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices() || [];
  if (!voices.length) return null;
  return (
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => /en[-_]IN/i.test(v.lang)) ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang?.startsWith('en')) ||
    voices[0]
  );
}

export function stop() {
  const s = synth();
  try { s?.cancel(); } catch { /* ignore */ }
  currentUtterance = null;
}

/**
 * Speak a line.
 * @param {string} text
 * @param {{onBoundary?:Function, onStart?:Function, onEnd?:Function, rate?:number}} opts
 */
export function speak(text, opts = {}) {
  if (!text || !isSupported() || isMuted()) { opts.onEnd?.(); return () => {}; }

  if (!unlocked) {           // no user gesture yet — remember the latest line
    pending = { text, opts };
    return () => { pending = null; };
  }

  const s = synth();
  try { s.cancel(); } catch { /* ignore */ }

  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = opts.rate ?? 0.98;   // a touch slower — these are 11-15 year olds
  u.pitch = opts.pitch ?? 1.08; // slightly bright, friendly-robot
  u.volume = 1;

  u.onstart = () => opts.onStart?.();
  u.onboundary = (e) => opts.onBoundary?.(e);
  u.onend = () => { currentUtterance = null; opts.onEnd?.(); };
  u.onerror = () => { currentUtterance = null; opts.onEnd?.(); };

  currentUtterance = u;
  try { s.speak(u); } catch { opts.onEnd?.(); }
  return () => { try { s.cancel(); } catch { /* ignore */ } };
}

// Call once from a real user gesture (click/keydown) to satisfy autoplay rules.
export function unlockVoice() {
  if (unlocked || !isSupported()) return;
  unlocked = true;
  // Some engines need a priming utterance before they'll speak.
  try {
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    synth().speak(u);
  } catch { /* ignore */ }
  if (pending) {
    const { text, opts } = pending;
    pending = null;
    speak(text, opts);
  }
}

// Voice lists load asynchronously in Chrome; warm them early.
export function warmVoices() {
  const s = synth();
  if (!s) return;
  try { s.getVoices(); s.addEventListener?.('voiceschanged', () => s.getVoices(), { once: true }); } catch { /* ignore */ }
}

export function isSpeaking() {
  return !!currentUtterance;
}
