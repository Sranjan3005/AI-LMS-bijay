// Ethics Arena completion tracking — localStorage for now (single-device
// classroom flow). Backend persistence can replace this later.
const KEY = 'sutra_ethics_completed';

export function getEthicsCompleted() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(n => Number.isInteger(n)) : [];
  } catch {
    return [];
  }
}

export function markEthicsComplete(level) {
  try {
    const done = getEthicsCompleted();
    if (!done.includes(level)) {
      localStorage.setItem(KEY, JSON.stringify([...done, level]));
    }
  } catch {
    /* storage unavailable — non-fatal */
  }
}
