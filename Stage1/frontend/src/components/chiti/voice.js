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
    voices.find(v => v.name.includes('Neerja') && v.name.includes('Online')) ||
    voices.find(v => v.name.includes('Neerja') && v.name.includes('Neural')) ||
    voices.find(v => v.name.includes('Neerja')) ||
    voices.find(v => v.lang === 'en-IN' && v.name.includes('Neural')) ||
    voices.find(v => v.lang === 'en-IN') ||
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

function sanitizeForSpeech(text) {
  if (!text) return '';
  let s = text;
  // Remove emojis and common symbols that shouldn't be spoken
  s = s.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}👆👇👉👈🤖✨]/gu, '');
  // Fix AI pronunciation (read as "A I" instead of "aaai")
  s = s.replace(/\bAI\b/g, 'A I');
  // Remove common markdown formatting
  s = s.replace(/[\*\_~`]/g, '');
  return s.trim();
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

  const cleanText = sanitizeForSpeech(text);
  if (!cleanText) { opts.onEnd?.(); return () => {}; }

  const u = new SpeechSynthesisUtterance(cleanText);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; }
  u.rate = opts.rate ?? 1.0;    // Standard rate
  u.pitch = opts.pitch ?? 1.0;  // Standard pitch to avoid talkback robot effect
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
