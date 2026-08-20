// capability.js — decide whether this device should run the 3D Chiti or the
// lightweight 2D rig. The platform runs on low-end school laptops, phones and
// tablets, so 3D is opt-in-by-capability, never assumed.
//
// A student/teacher can always override from the Chiti settings toggle; the
// choice is remembered.

const KEY = 'sutra_chiti_renderer';   // 'auto' | '3d' | 'svg'

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) return false;
    // Software renderers (SwiftShader/llvmpipe) report as WebGL but crawl.
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    if (/swiftshader|llvmpipe|software|microsoft basic/i.test(renderer)) return false;
    return true;
  } catch {
    return false;
  }
}

// Conservative scoring — when in doubt, fall back to the 2D rig.
export function detectRenderer() {
  if (typeof window === 'undefined') return 'svg';

  // ?chiti=3d / ?chiti=svg — force a mode. Handy for testing, and for a teacher
  // pinning the light renderer on a specific lab machine. Sticky once used.
  try {
    const q = new URLSearchParams(window.location.search).get('chiti');
    if (q === '3d' || q === 'svg') { setRendererPreference(q); return q; }
  } catch { /* ignore */ }

  const override = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  if (override === '3d' || override === 'svg') return override;
  // Respect the OS "reduce motion" setting — accessibility first.
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return 'svg';
  if (!hasWebGL()) return 'svg';

  const mem = navigator.deviceMemory;              // GB, Chromium only
  const cores = navigator.hardwareConcurrency;     // logical cores
  if (typeof mem === 'number' && mem < 3) return 'svg';
  if (typeof cores === 'number' && cores <= 2) return 'svg';

  // Very small viewports get the 2D rig — a 3D canvas isn't worth the battery
  // on a phone in portrait, where the character is tiny anyway.
  if (Math.min(window.innerWidth, window.innerHeight) < 380) return 'svg';

  // Save-Data / slow connection → keep the 464KB model off the wire.
  const conn = navigator.connection;
  if (conn?.saveData) return 'svg';
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return 'svg';

  return '3d';
}

export function setRendererPreference(v) {
  try { localStorage.setItem(KEY, v); } catch { /* storage unavailable */ }
}
export function getRendererPreference() {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
}

// Pixel-ratio cap: sharp enough to look good, cheap enough for weak GPUs.
export const DPR_CAP = [1, 1.5];
