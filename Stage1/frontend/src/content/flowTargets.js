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
    theory: { view: 'what_is_ai' },         // engaging "what is AI" + Teach-the-Machine
    demo:   { view: 'breaking_point' },      // rules work → rules break → it learns (reinforcement)
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
    demo:   { view: 'lab', params: { modelType: 'REGRESSION' } },        // pick a regression scenario & train
    hands:  { view: 'data_lab', params: { modelType: 'REGRESSION' } },   // bring your own data
  },
  'Classification': {
    theory: { content: 'classification' },
    demo:   { view: 'lab', params: { modelType: 'CLASSIFICATION' } },
    hands:  { view: 'data_lab', params: { modelType: 'CLASSIFICATION' } },
  },
  'Neural Networks': {
    theory: { content: 'neural' },
    demo:   { view: 'lab', params: { modelType: 'NEURAL_NETWORK' } },
    hands:  { view: 'data_lab', params: { modelType: 'NEURAL_NETWORK' } },
  },
  'Computer Vision': {
    theory: { view: 'computer_vision_lesson' },
    demo:   { view: 'cv_playground' },       // in-browser object detection / edges / digit reader
    hands:  { view: 'lab', params: { modelType: 'COMPUTER_VISION' } },   // draw/upload & train (canvas input)
    hands2: { view: 'teach_machine' },       // few-shot transfer learning: 6 photos, webcam/upload, live predict
  },
  'Agentic Flow Studio': {
    theory: { content: 'agentic' },
    demo:   { view: 'agentic', params: { initialView: 'explore' } },          // pre-built scenarios gallery (the 3 cards)
    hands:  { view: 'agentic', params: { initialView: 'build_wizard' } },     // "What do you want to build?" first
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
