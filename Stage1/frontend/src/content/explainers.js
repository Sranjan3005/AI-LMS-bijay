/**
 * explainers.js — original, grade 6–8 "Theory" content for the Sutra flow.
 * All text is our own (safe for commercial use). `video` is an OPTIONAL YouTube
 * EMBED url (https://www.youtube.com/embed/<id>); leave '' until an embed-enabled
 * video is approved so we never ship a dead player.
 */

export const EXPLAINERS = {
  classification: {
    eyebrow: 'Theory · Classification',
    title: 'Sorting things into the right box',
    color: '#00C7BE',
    open: 'classification',
    openLabel: 'Train a classifier',
    lede: 'Classification is how an AI answers a "which one is it?" question — cat or dog, spam or safe, ripe or unripe. Instead of predicting a number, it picks a label.',
    video: '',
    sections: [
      { h: 'It learns from examples', p: 'You show the model lots of examples that are already labelled — hundreds of photos tagged "cat" or "dog". It hunts for patterns that separate the groups: pointy ears, whisker shape, tail length. Nobody writes those rules by hand; the model discovers them.' },
      { h: 'It draws a boundary', p: 'Imagine plotting every example on a graph. The model draws a line (a "decision boundary") with cats on one side and dogs on the other. A new photo gets a label based on which side it lands on.' },
      { h: 'Accuracy vs. a lucky guess', p: 'If 9 of 10 messages are safe, a lazy model that always says "safe" is right 90% of the time — but useless for catching spam! So we look at which mistakes it makes, not just the overall score.' },
    ],
    keypoints: [
      'Classification predicts a category (a label), not a number.',
      'It learns the separating pattern from labelled examples.',
      'A high accuracy score can still hide a biased or lazy model.',
      'Balanced data (equal examples per class) helps it learn fairly.',
    ],
  },

  neural: {
    eyebrow: 'Theory · Neural Networks',
    title: 'A team of tiny decision-makers',
    color: '#0A84FF',
    open: 'neural',
    openLabel: 'Train a neural net',
    lede: 'A neural network is a stack of very simple units ("neurons") that pass signals to each other. On their own each one is almost silly — together they can recognise handwriting, faces and speech.',
    video: '',
    sections: [
      { h: 'One neuron is simple', p: 'A neuron takes some numbers in, multiplies each by a "weight" (how much it cares about that input), adds them up, and fires if the total is big enough. That is it. The magic is in the weights.' },
      { h: 'Layers build up ideas', p: 'Stack neurons in layers. The first layer notices edges, the next combines edges into shapes, the next combines shapes into "this looks like a 7". Each layer builds on the one before.' },
      { h: 'Learning = tuning the weights', p: 'At first the weights are random and the network guesses badly. Every time it is wrong, it nudges the weights a tiny bit to be less wrong next time. Do that thousands of times and it gets good — that nudging is "training".' },
    ],
    keypoints: [
      'A neuron just weighs its inputs and fires — the weights hold the knowledge.',
      'Layers turn simple features into complex ideas, step by step.',
      'Training = repeatedly nudging weights to reduce mistakes.',
      'More and cleaner data usually means a smarter network.',
    ],
  },

  agentic: {
    eyebrow: 'Theory · Agentic AI',
    title: 'Giving an AI a to-do list',
    color: '#FF375F',
    open: 'agentic',
    openLabel: 'Open the studio',
    lede: 'An AI "agent" does not just answer once — it takes a goal, breaks it into steps, uses tools (like search or a calculator), checks its own work, and keeps going until the job is done.',
    video: '',
    sections: [
      { h: 'Nodes and pipelines', p: 'In the studio you build a flow out of blocks called nodes: one reads text, one searches the web, one summarises, one decides what to do next. You wire them together like a flowchart, and information flows from block to block until an answer pops out the end.' },
      { h: 'Tools make it powerful', p: 'A plain chatbot only knows what it was trained on. An agent can use tools — look something up, run code, read a document — so it works with fresh, real information instead of guessing.' },
      { h: 'Deciding and looping', p: 'A "decider" node lets the flow branch: if the answer looks good, finish; if not, try again a different way. That loop — try, check, improve — is what makes an agent feel smart.' },
    ],
    keypoints: [
      'An agent plans steps toward a goal instead of answering once.',
      'You build it by wiring nodes (blocks) into a pipeline.',
      'Tools (search, code, documents) let it use real information.',
      'Decider/loop nodes let it check and improve its own work.',
    ],
  },

  ethics: {
    eyebrow: 'Theory · Responsible AI',
    title: 'Is it fair? And who is responsible?',
    color: '#FF453A',
    open: 'ethics',
    openLabel: 'Enter the Ethics Arena',
    lede: 'AI learns from data made by people — so it can quietly copy our mistakes and unfairness. Being a good AI builder means asking hard questions before you ship something.',
    video: '',
    sections: [
      { h: 'Bias in, bias out', p: 'If a hiring AI only ever saw resumes from one kind of person, it "learns" that is what a good candidate looks like — and rejects everyone else. The model was not born unfair; it copied unfair data. Spotting where the data is skewed is the first job.' },
      { h: 'Fairness and privacy', p: 'Fairness asks: does this work equally well for everyone? Privacy asks: whose data is this, and did they agree to it being used? A face-recognition demo is fun — until it is scanning people who never consented.' },
      { h: 'Accountability', p: 'When an AI gets something important wrong — a loan, a diagnosis, a grade — a person must be answerable, able to explain the decision and fix it. "The computer decided" is never a good enough answer.' },
    ],
    keypoints: [
      'AI copies patterns in its data — including unfair ones.',
      'Ask: does it work fairly for everyone? (fairness)',
      'Ask: whose data is this, and did they consent? (privacy)',
      'A human must stay answerable for important decisions.',
    ],
  },
};
