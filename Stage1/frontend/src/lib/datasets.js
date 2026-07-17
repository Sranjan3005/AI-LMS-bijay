// Shared access to the bundled sample-image dataset (public/datasets/).
// One cached fetch of the manifest, plus the scenario→folder mapping used to
// preview real dataset images on scenario cards and in showcases.

let _manifest = null;

export function loadManifest() {
  if (!_manifest) {
    _manifest = fetch('/datasets/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return _manifest;
}

// Scenario title → dataset folders whose images preview that scenario.
export const SCENARIO_PREVIEWS = {
  'The Forest Forager':      ['mushroom/red_poison', 'mushroom/brown_safe', 'mushroom/red_safe', 'mushroom/brown_poison'],
  'The Smart Trash Can':     ['trash/good', 'trash/bad'],
  'The Self-Driving Eye':    ['signs'],
  'The Handwriting Decoder': ['handwriting'],
  'The Digit Detective':     ['handwriting'],
  'The Edge Explorer':       ['edge'],
};

export const previewFolders = (title) => SCENARIO_PREVIEWS[title] || [];

// Pick up to `max` image paths for a scenario, interleaving its folders so the
// strip shows variety (e.g. one poisonous, one edible, …).
export async function previewImages(title, max = 4) {
  const folders = previewFolders(title);
  if (!folders.length) return [];
  const m = await loadManifest();
  const lists = folders.map((f) => m[f] || []);
  const out = [];
  for (let i = 0; out.length < max; i++) {
    let added = false;
    for (const l of lists) {
      if (l[i]) { out.push(l[i]); added = true; if (out.length >= max) break; }
    }
    if (!added) break;
  }
  return out;
}
