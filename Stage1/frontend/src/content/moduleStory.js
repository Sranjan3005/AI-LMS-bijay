// moduleStory.js
// ─────────────────────────────────────────────────────────────────────────────
// The narrative layer that sits ABOVE the existing lessons/labs. It changes
// nothing about how activities run — it only wraps each module in a "case file"
// and gives it a place in one story: you are raising Chiti, a robot that boots
// up knowing nothing and gains one new ability per module.
//
// Keys match module titles (`m.t`) in StudentHome PHASES and flowTargets.js.
//
// Shape:
//   codename   short mission name (kid-facing, replaces the dry module title)
//   ability    { id, name, emoji }  the power Chiti unlocks by finishing the module
//   hook       the situation — why this matters, in a kid's world
//   stakes     what goes wrong if the mission fails (gives the work a stake)
//   chapters   one per activity type; `beat` is the in-story reason to open it
//   reward     the line shown on the StoryBeat screen when the module completes
// ─────────────────────────────────────────────────────────────────────────────

// The ordered spine — used to draw "what Chiti can do so far" and to grow the
// avatar. Order MUST match the learning flow.
export const ABILITY_SPINE = [
  { id: 'brain',      name: 'A brain',      emoji: '🧠', module: 'Understanding AI' },
  { id: 'maths',      name: 'Number sense', emoji: '🔢', module: 'Maths for AI' },
  { id: 'senses',     name: 'Senses',       emoji: '👁', module: 'Data & Analysis' },
  { id: 'predict',    name: 'Prediction',   emoji: '📈', module: 'Linear Regression' },
  { id: 'judge',      name: 'Judgement',    emoji: '⚖️', module: 'Classification' },
  { id: 'depth',      name: 'Deep thought', emoji: '🌀', module: 'Neural Networks' },
  { id: 'eyes',       name: 'Eyes',         emoji: '🤖', module: 'Computer Vision' },
  { id: 'hands',      name: 'Hands',        emoji: '🦾', module: 'Agentic Flow Studio' },
  { id: 'conscience', name: 'A conscience', emoji: '❤️', module: 'AI Ethics Arena' },
];

export const STORY = {
  'Understanding AI': {
    codename: 'Boot Sequence',
    ability: { id: 'brain', name: 'A brain', emoji: '🧠' },
    hook: "Chiti just switched on for the very first time. Right now it only follows fixed rules — and it's about to find out that rules alone make a pretty clumsy robot.",
    stakes: "Until Chiti understands what learning even means, it can't do anything on its own.",
    chapters: [
      { ty: 'theory', beat: "Teach Chiti the big idea: learn from examples, not just rules." },
      { ty: 'demo',   beat: "Watch Chiti follow if-else rules in a busy market — and crash. Then watch it learn." },
      { ty: 'hands',  beat: "Your turn: sort the world into AI and not-AI so Chiti knows the difference." },
      { ty: 'assign', beat: "Prove Chiti learned it — the first checkpoint." },
    ],
    reward: "Chiti booted up its very first ability.",
  },
  'Maths for AI': {
    codename: 'The Fare Meter',
    ability: { id: 'maths', name: 'Number sense', emoji: '🔢' },
    hook: "Chiti climbs into an auto-rickshaw and is asked one question: what should the fare be? It has no idea — numbers are just squiggles to it. Time to give Chiti number sense.",
    stakes: "Every prediction Chiti ever makes rests on one line: y = mx + c. No maths, no models.",
    chapters: [
      { ty: 'theory', beat: "Show Chiti why slope means 'how fast things change'." },
      { ty: 'demo',   beat: "Set the base fare and rate — watch the prediction line draw itself." },
      { ty: 'hands',  beat: "Drag the slope and intercept until the line fits. Feel the error drop." },
      { ty: 'assign', beat: "Read a graph and predict the next value — Chiti's number test." },
    ],
    reward: "Chiti can read numbers and graphs now.",
  },
  'Data & Analysis': {
    codename: 'The Friday Canteen Mystery',
    ability: { id: 'senses', name: 'Senses', emoji: '👁' },
    hook: "Every Friday the school canteen throws away 40 plates of food and nobody knows why. The principal hands Chiti six months of sale logs — but Chiti can't yet tell a signal from noise.",
    stakes: "If Chiti can't find the pattern in the data, the canteen cuts the menu for everyone.",
    chapters: [
      { ty: 'theory', beat: "Open the file. Teach Chiti what a row, a feature and a label are." },
      { ty: 'demo',   beat: "Someone already made charts — but one of them is lying. Spot it." },
      { ty: 'hands',  beat: "Your turn: pick the chart that shows the Friday spike." },
      { ty: 'assign', beat: "File your report to the principal — name the cause." },
    ],
    reward: "Chiti can sense patterns in data now.",
  },
  'Linear Regression': {
    codename: 'How Much?',
    ability: { id: 'predict', name: 'Prediction', emoji: '📈' },
    hook: "A kid runs a lemonade stand and wants to know how many cups they'll sell tomorrow. Chiti has senses now — but guessing a number is a new skill. Teach it to predict how much.",
    stakes: "Guess too low and the stand runs dry; guess too high and the lemonade spoils.",
    chapters: [
      { ty: 'theory', beat: "Show Chiti how a best-fit line turns dots into a prediction." },
      { ty: 'demo',   beat: "Pick a real problem and train Chiti to predict a number." },
      { ty: 'hands',  beat: "Feed Chiti your own data and watch its guesses sharpen." },
      { ty: 'assign', beat: "Ship a working predictor and explain why it works." },
    ],
    reward: "Chiti can predict how much now.",
  },
  'Classification': {
    codename: 'Which One?',
    ability: { id: 'judge', name: 'Judgement', emoji: '⚖️' },
    hook: "The inbox is full of spam and the recycling bin is a mess. Chiti can predict numbers — but sorting things into the right group is a different power. Give Chiti judgement.",
    stakes: "One wrong call and real mail goes to spam, or the plastic ends up in the wrong bin.",
    chapters: [
      { ty: 'theory', beat: "Teach Chiti to draw a boundary between two groups." },
      { ty: 'demo',   beat: "Pick a problem — spam, waste, mushrooms — and train the sorter." },
      { ty: 'hands',  beat: "Make your own labelled examples and test Chiti's judgement." },
      { ty: 'assign', beat: "Build a classifier and defend exactly where it fails." },
    ],
    reward: "Chiti can judge which group things belong to now.",
  },
  'Neural Networks': {
    codename: 'Learning to Learn',
    ability: { id: 'depth', name: 'Deep thought', emoji: '🌀' },
    hook: "Some patterns are too tangled for a single straight line. Chiti needs to stack simple ideas into deeper ones — it's time to teach Chiti to learn how to learn.",
    stakes: "Without depth, Chiti stays stuck on the easy problems and fails the hard ones.",
    chapters: [
      { ty: 'theory', beat: "Show Chiti how neurons and layers build up complex ideas." },
      { ty: 'demo',   beat: "Pick a scenario and watch Chiti's accuracy climb as it learns." },
      { ty: 'hands',  beat: "Train Chiti on your own examples, layer by layer." },
      { ty: 'assign', beat: "Tune the network and explain what each change did." },
    ],
    reward: "Chiti can think in layers now.",
  },
  'Computer Vision': {
    codename: 'Opening Its Eyes',
    ability: { id: 'eyes', name: 'Eyes', emoji: '🤖' },
    hook: "Chiti has a brain but no eyes — the world is still just numbers to it. Today Chiti opens its eyes and learns to turn pictures into things it can actually understand.",
    stakes: "A self-driving robot that can't see a stop sign is a very dangerous robot.",
    chapters: [
      { ty: 'theory', beat: "Explain how a picture becomes numbers Chiti can read." },
      { ty: 'demo',   beat: "Run real vision in your browser — detect, trace, read digits." },
      { ty: 'hands',  beat: "Draw or upload your own images and watch Chiti see them." },
      { ty: 'assign', beat: "Build an image classifier and report its blind spots." },
    ],
    reward: "Chiti opened its eyes.",
  },
  'Agentic Flow Studio': {
    codename: 'Off the Leash',
    ability: { id: 'hands', name: 'Hands', emoji: '🦾' },
    hook: "Chiti can see, think and judge — but it still waits for you. Now you give Chiti tools and let it act on its own, wiring one node to the next to solve a whole task.",
    stakes: "Give a robot hands and no plan and it makes a mess. Your job is to wire the plan.",
    chapters: [
      { ty: 'theory', beat: "Learn what agents, nodes and tools actually are." },
      { ty: 'demo',   beat: "Watch a ready-made agent read, summarise and decide — live." },
      { ty: 'hands',  beat: "Wire your first agent, node by node, in the studio." },
      { ty: 'assign', beat: "Capstone: build a news fact-checking agent." },
    ],
    reward: "Chiti can act on its own now.",
  },
  'AI Ethics Arena': {
    codename: 'The Hard Call',
    ability: { id: 'conscience', name: 'A conscience', emoji: '❤️' },
    hook: "Chiti is powerful now — and that's exactly the problem. A model Chiti built just got a real person wrong. The last thing to teach Chiti is the hardest: judgement about right and wrong.",
    stakes: "A smart robot with no conscience doesn't just fail — it hurts people. This is the part that matters most.",
    chapters: [
      { ty: 'theory', beat: "Meet the four pillars: bias, fairness, accountability, privacy." },
      { ty: 'demo',   beat: "Work the Emotion-Detector case where the model gets people wrong." },
      { ty: 'hands',  beat: "Investigate manipulated media as the Deepfake Detective." },
      { ty: 'assign', beat: "Argue a real dilemma from your assigned stakeholder's side." },
    ],
    reward: "Chiti has a conscience now. Your robot is complete.",
  },
};

// Convenience: the story for a module row (or a safe default so nothing breaks
// if a module is added to PHASES before its story is written).
export function storyFor(moduleTitle) {
  return STORY[moduleTitle] || {
    codename: moduleTitle,
    ability: null,
    hook: '',
    stakes: '',
    chapters: [],
    reward: `Chiti finished ${moduleTitle}.`,
  };
}

// The in-story beat for one chapter of a module (by activity type).
export function beatFor(moduleTitle, subType) {
  const s = STORY[moduleTitle];
  return s?.chapters.find(c => c.ty === subType)?.beat || '';
}
