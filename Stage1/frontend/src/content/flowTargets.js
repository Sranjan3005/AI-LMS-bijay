// Per-module submodule wiring — which named activity each theory / demonstration /
// hands-on click opens. Keys match module titles (`m.t`) in StudentHome PHASES.
//
// Target shapes handled by App.jsx `openSub()`:
//   { view, params }  → direct route; `params` are deep-link props threaded by
//                       App.jsx (initialStep, initialScenario, initialView…)
//   { content }       → ExplainerPage article from content/explainers.js
//   { assignments }   → AssignmentsView filtered by module_key
//   { open }          → module's primary workspace (fallback only)
//
// NOTE: `initialScenario` deep links join on the exact `title` returned by
// GET /scenarios/ — keep in sync with backend seed_scenarios.py.

export const FLOW = {
  'Understanding AI': {
    theory: { view: 'emergence_lesson' },
    demo:   { view: 'breaking_point' },     // rules work → rules break → it learns
    hands:  { view: 'spot_the_ai' },
  },
  'Maths for AI': {
    theory: { view: 'maths_lesson', params: { initialStep: 0 } },
    demo:   { view: 'maths_lesson', params: { initialStep: 5 } },   // auto-rickshaw y=mx+c playground
    hands:  { view: 'linear_regression_lesson' },                   // manual-fit sliders + error meter
  },
  'Data & Analysis': {
    theory: { view: 'data_analysis', params: { initialStep: 0 } },
    demo:   { view: 'chart_detective' },
    hands:  { view: 'chart_picker' },
    hands2: { view: 'term_match' },          // extra hands-on row: AI vocabulary game
  },
  'Linear Regression': {
    theory: { view: 'linear_regression_lesson' },
    demo:   { view: 'lab', params: { initialCategory: 'REGRESSION', initialScenario: 'The Lemonade Stand' } },
    hands:  { view: 'lab', params: { initialCategory: 'REGRESSION', initialScenario: 'The Study Score Predictor' } },
  },
  'Classification': {
    theory: { content: 'classification' },
    demo:   { view: 'lab', params: { initialCategory: 'CLASSIFICATION', initialScenario: 'The Spam Catcher' } },
    hands:  { view: 'lab', params: { initialCategory: 'CLASSIFICATION', initialScenario: 'The Smart Trash Can' } },
  },
  'Neural Networks': {
    theory: { content: 'neural' },
    demo:   { view: 'lab', params: { initialCategory: 'NEURAL_NETWORK', initialScenario: 'The Self-Driving Eye' } },
    hands:  { view: 'lab', params: { initialCategory: 'NEURAL_NETWORK', initialScenario: 'The Emotion Reader' } },
  },
  'Computer Vision': {
    theory: { view: 'computer_vision_lesson' },
    demo:   { view: 'cv_playground' },       // in-browser object detection / edges / digit reader
    hands:  { view: 'lab', params: { initialCategory: 'COMPUTER_VISION', initialScenario: 'The Handwriting Decoder' } },
  },
  'Agentic Flow Studio': {
    theory: { content: 'agentic' },
    demo:   { view: 'agentic', params: { initialView: 'explore', autoLaunchId: 'smart-cafe' } },
    hands:  { view: 'agentic', params: { initialView: 'workspace' } },
  },
  'AI Ethics Arena': {
    theory: { content: 'ethics' },
    demo:   { view: 'ethics_level_1' },      // the Emotion-Detector dilemma
    hands:  { view: 'ethics_level_4' },      // Deepfake Detective
  },
};

// A submodule row → its target. `hands2` supports a second hands-on row.
export function subTarget(m, s) {
  if (s.ty === 'assign') return { assignments: m.open };
  const key = s.ty === 'hands' && s.alt ? 'hands2' : s.ty;
  return FLOW[m.t]?.[key] || { open: m.open };
}

// The module-footer "Open <module>" button. Foundations modules have no
// workspace of their own (the old dashboard hub is retired), so open theory.
export function moduleOpenTarget(m) {
  if (m.open === 'foundations') return FLOW[m.t]?.theory || { open: m.open };
  return { open: m.open };
}
