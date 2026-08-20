// nodeInfo.js — one student-friendly "what does this node do?" line per node
// type. Shown by the ⓘ button on each node card (and as sidebar tooltips).

export const NODE_INFO = {
  // Inputs (senses)
  textInput:       'Starting point. Type the text you want the pipeline to work on (max 100 words).',
  documentReader:  'Upload a PDF or Word file and it pulls out the text for the next nodes to use.',
  visionScanner:   'Upload an image, PDF or document. Images are described by AI; files have their text extracted.',
  speechToText:    'Upload an audio file and it converts spoken words into text.',

  // Processing (brains)
  customizer:      'A general AI brain. Write an instruction (a prompt) and it transforms whatever text comes in.',
  objectDetection: 'Finds and labels the objects/animals in an uploaded image. Detection runs live in your browser.',
  summarizer:      'Shortens the incoming text into 2–3 clear sentences a student can read at a glance.',
  sentimentRadar:  'Reads the mood of the text and reports Positive, Negative or Neutral with a confidence score.',
  webSearch:       'Answers a question from the AI’s own knowledge (kept safe — no live internet in the sandbox).',

  // Routing (logic)
  decider:         'A gate. It checks a TRUE/FALSE condition on the input and sends the flow down only one branch.',
  merger:          'Joins several incoming branches back into one combined stream of text.',

  // Outputs (actions)
  display:         'Shows the final result on screen — the end of the pipeline.',
  chartGenerator:  'Turns the incoming data into a bar, line or pie chart.',
  messenger:       'An action node that “sends” the result as a message/alert (e.g. notify the rangers).',
};

export const nodeInfoFor = (type) => NODE_INFO[type] || '';
