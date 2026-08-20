// voice.js -- Chiti's speech, via the browser's built-in Web Speech API.
//
// Ported verbatim in behaviour from Stage1/frontend/src/components/chiti/voice.js
// so that porting this module back into the main app is a delete, not a merge.
// Two additions this module needs:
//   * `speakSentences()` -- speaks a long line one sentence at a time, so a step
//     transition can interrupt cleanly at a sentence boundary rather than
//     chopping a word in half.
//   * `voiceQuality()` -- reports whether we actually found a decent en-IN voice,
//     because on Chromebooks and Safari we usually do not, and the UI should be
//     able to lean on captions instead of pretending.
//
// Browsers block speech until the user has interacted with the page, so the
// first line is queued and flushed on the first gesture.

const MUTE_KEY = 'sutra_chiti_muted';

// Default speaking rate. 1.0 is the browser's idea of neutral, which in
// practice sounds like a station announcement -- fine for one line, tiring
// across a forty-beat lesson. 1.18 reads as a person explaining something they
// know well, and still lands under the caption's reading speed so the two do
// not desync. Callers can still override per line.
const RATE = 1.18;

let unlocked = false;
let pending = null; // {text, opts} queued before the first gesture
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

// Prefer an Indian-English voice, then any English one -- Chiti should sound
// local to the students using it.
function pickVoice() {
  const s = synth();
  if (!s) return null;
  const voices = s.getVoices() || [];
  if (!voices.length) return null;
  return (
    voices.find((v) => v.name.includes('Neerja') && v.name.includes('Online'))
    || voices.find((v) => v.name.includes('Neerja') && v.name.includes('Neural'))
    || voices.find((v) => v.name.includes('Neerja'))
    || voices.find((v) => v.lang === 'en-IN' && v.name.includes('Neural'))
    || voices.find((v) => v.lang === 'en-IN')
    || voices.find((v) => v.lang === 'en-GB')
    || voices.find((v) => v.lang?.startsWith('en'))
    || voices[0]
  );
}

/**
 * How good is the voice we are actually going to get?
 *
 * Web Speech quality is entirely at the mercy of the machine. Windows/Edge has
 * en-IN Neerja; most Chromebooks, Android and Safari do not, and fall back to a
 * flat default. The flow uses this to decide whether to keep captions expanded
 * by default rather than quietly sounding bad.
 *
 * @returns {'neural'|'regional'|'generic'|'none'}
 */
export function voiceQuality() {
  if (!isSupported()) return 'none';
  const v = pickVoice();
  if (!v) return 'none';
  if (/Neerja|Neural|Online|Natural/i.test(v.name)) return 'neural';
  if (v.lang === 'en-IN') return 'regional';
  return 'generic';
}

export function stop() {
  const s = synth();
  try { s?.cancel(); } catch { /* ignore */ }
  currentUtterance = null;
}

function sanitizeForSpeech(text) {
  if (!text) return '';
  let s = text;
  // Emoji and symbol ranges -- these should never be read aloud.
  s = s.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{1F512}\u{1F513}]/gu,
    '',
  );
  s = s.replace(/\bAI\b/g, 'A I');
  // Percentages read better spoken out than as a bare symbol.
  s = s.replace(/(\d)\s*%/g, '$1 percent');
  s = s.replace(/[*_~`]/g, '');
  return s.trim();
}

/**
 * Speak a line.
 * @param {string} text
 * @param {{onBoundary?:Function, onStart?:Function, onEnd?:Function, rate?:number, pitch?:number}} opts
 * @returns {Function} cancel
 */
export function speak(text, opts = {}) {
  if (!text || !isSupported() || isMuted()) { opts.onEnd?.(); return () => {}; }

  if (!unlocked) { // no user gesture yet -- remember the latest line
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
  u.rate = opts.rate ?? RATE;
  u.pitch = opts.pitch ?? 1.0;
  u.volume = 1;

  u.onstart = () => opts.onStart?.();
  u.onboundary = (e) => opts.onBoundary?.(e);
  u.onend = () => { currentUtterance = null; opts.onEnd?.(); };
  u.onerror = () => { currentUtterance = null; opts.onEnd?.(); };

  currentUtterance = u;
  try { s.speak(u); } catch { opts.onEnd?.(); }
  return () => { try { s.cancel(); } catch { /* ignore */ } };
}

/** Split on sentence enders, keeping the punctuation. */
export function toSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Speak a multi-sentence line one sentence at a time.
 *
 * Worth the extra plumbing for two reasons: a step transition can cancel at a
 * sentence boundary instead of mid-word, and `onSentence` lets the caption track
 * what is currently being said rather than dumping the whole paragraph at once.
 *
 * @param {string} text
 * @param {{onSentence?:(s:string,i:number)=>void, onEnd?:Function, rate?:number}} opts
 * @returns {Function} cancel
 */
export function speakSentences(text, opts = {}) {
  const parts = toSentences(text);
  if (!parts.length) { opts.onEnd?.(); return () => {}; }

  let cancelled = false;
  let cancelCurrent = () => {};

  const run = (i) => {
    if (cancelled || i >= parts.length) { if (!cancelled) opts.onEnd?.(); return; }
    opts.onSentence?.(parts[i], i);
    cancelCurrent = speak(parts[i], {
      rate: opts.rate,
      onBoundary: opts.onBoundary,
      onEnd: () => run(i + 1),
    });
  };
  run(0);

  return () => { cancelled = true; cancelCurrent(); stop(); };
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
  try {
    s.getVoices();
    s.addEventListener?.('voiceschanged', () => s.getVoices(), { once: true });
  } catch { /* ignore */ }
}

export function isSpeaking() {
  return !!currentUtterance;
}
