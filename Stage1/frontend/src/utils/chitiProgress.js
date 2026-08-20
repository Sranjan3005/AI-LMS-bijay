// chitiProgress.js
// Derives "what Chiti can do so far" from the same activity/progress data the
// dashboard already fetches. A module's ability is unlocked once the student has
// opened all three of its core activities (theory/demo/hands) — the same rule
// that unlocks the module's assignment server-side.

import { ABILITY_SPINE } from '../content/moduleStory';

// Map ability spine → the module_key used by the backend activity API.
// (StudentHome PHASES use `open` as the module_key.)
const MODULE_KEY = {
  'Understanding AI': 'foundations',
  'Maths for AI': 'foundations',
  'Data & Analysis': 'data',
  'Linear Regression': 'regression',
  'Classification': 'classification',
  'Neural Networks': 'neural',
  'Computer Vision': 'vision',
  'Agentic Flow Studio': 'agentic',
  'AI Ethics Arena': 'ethics',
};

const CORE = ['theory', 'demo', 'hands'];

// activity: { module_key: [subtypes opened] } from GET /assignments/activity/
export function unlockedAbilities(activity = {}) {
  return ABILITY_SPINE.filter((a) => {
    // 'foundations' covers two abilities; both count once its trio is opened.
    const key = MODULE_KEY[a.module];
    const opened = activity[key] || [];
    return CORE.every((c) => opened.includes(c));
  }).map((a) => a.id);
}

// Ordered list with an `unlocked` flag — for rendering the ability rail.
export function abilityState(activity = {}) {
  const unlocked = new Set(unlockedAbilities(activity));
  return ABILITY_SPINE.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}

// The next ability Chiti is working toward (first still-locked), or null if done.
export function nextAbility(activity = {}) {
  const unlocked = new Set(unlockedAbilities(activity));
  return ABILITY_SPINE.find((a) => !unlocked.has(a.id)) || null;
}
