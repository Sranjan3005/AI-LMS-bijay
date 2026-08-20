/**
 * lesson.js -- Chiti's script, as data.
 *
 * WHAT CHANGED AND WHY
 *
 * Until now Chiti narrated: one line per screen, read aloud, and then silence
 * while the student worked out what to do. That is a subtitle track, not a
 * teacher. A teacher says a thing, asks you to do a thing, *waits*, watches
 * whether you did it, and only then says the next thing.
 *
 * So a step is a list of BEATS. Each beat can:
 *
 *   say        what Chiti says (spoken + captioned)
 *   show       a diagram or video to display while saying it
 *   point      [spotlightId, label] -- ring the thing being talked about
 *   waitFor    an event id; the beat will NOT advance until the student
 *              actually does it. This is the whole difference.
 *   ask        a curiosity question, shown before the answer is available
 *   cta        label for the manual "go on" button when there is no waitFor
 *
 * Beats with `waitFor` are gates. Beats without advance on a click, so the
 * student sets the pace and nothing scrolls away while they are reading.
 *
 * KEEPING IT HONEST: a beat may only assert something the student has already
 * seen or is about to verify. Where a line quotes a number it is interpolated
 * from real state at render time (see `resolve`), never typed in here.
 */

/** Events a step can report. A beat's `waitFor` must be one of these. */
export const TASKS = Object.freeze({
  MODEL_LOADED: 'model_loaded',
  PHOTO_CHOSEN: 'photo_chosen',
  PREDICTED: 'predicted',
  SEARCHED_VOCAB: 'searched_vocab',
  LIBRARY_OPENED: 'library_opened',
  DATASET_CHOSEN: 'dataset_chosen',
  TRAINED: 'trained',
  SPECIALIST_PREDICTED: 'specialist_predicted',
  GUESSED: 'guessed',
  BOUNDARY_TESTED: 'boundary_tested',
  TRAINED_TWICE: 'trained_twice',
  AUGMENTED: 'augmented',
  BOTH_MODES: 'both_modes',
  COMPARED: 'compared',
  BASE_TRAINED: 'base_trained',
  ASKED_MULTIMODAL: 'asked_multimodal',
});

/**
 * The dataset each step teaches best with, and a reason a student can weigh.
 *
 * Deliberately a *reason*, not a score. "Butterflies is hardest" tells them
 * something useful about the data; "butterflies gets 76%" tells them the answer
 * to the thing they are about to measure.
 */
export const RECOMMENDED = Object.freeze({
  school: {
    id: 'flowers',
    why: 'twelve plants that look nothing like each other, so you can see this work clearly',
  },
  lab_data: {
    id: 'butterflies',
    why: 'twelve butterflies that really look alike, so you can see what more '
       + 'photos does',
  },
  lab_augment: {
    id: 'butterflies',
    why: 'hard enough that flipping and tilting has room to help',
  },
});

export const LESSONS = {
  /* ------------------------------------------------ 1. meet the generalist */
  meet: [
    {
      id: 'hello',
      say: 'Hi! I am Chiti. Today you are going to teach a computer to '
         + 'recognise something it has never seen before. But first, come and '
         + 'meet the model we start with.',
      show: 'cnn-anatomy',
      cta: 'Tell me about it',
    },
    {
      id: 'what-it-is',
      say: 'This is a CNN. It looks at your photo through lots of tiny '
         + 'windows. First it spots edges. Then patterns. Then whole things, '
         + 'like a wing or a petal. Somebody already showed it one million '
         + 'photos. That took days, and a lot of electricity.',
      show: 'cnn-anatomy',
      cta: 'So what can it do?',
    },
    {
      id: 'vocabulary',
      say: 'It can name a thousand different things. A thousand sounds like a '
         + 'lot, right? Hold on to that number. In about five minutes you are '
         + 'going to find where it runs out.',
      ask: 'A thousand names. What do you think it does if you show it '
         + 'something that is not on its list?',
      cta: 'I have a guess',
    },
    {
      id: 'load-it',
      say: 'Read its card first. Look at the part where it admits what it is '
         + 'bad at. Then press the button and I will fetch it. It runs on your '
         + 'computer. Nothing you show it ever leaves this tab.',
      point: ['load-model', 'Press this'],
      waitFor: TASKS.MODEL_LOADED,
      waiting: 'Waiting for you to load the model…',
    },
    {
      id: 'loaded',
      say: 'Done. Twenty-five million numbers, sitting in your browser, ready '
         + 'to look at anything you give them. And notice it did not download '
         + 'anything. This all works with the wifi switched off.',
      cta: "Let's try it",
    },
  ],

  /* ---------------------------------------------------------- 2. it works */
  works: [
    {
      id: 'give-photo',
      say: 'Give it a photo. Anything you like. Drop one in, or pick one from '
         + 'the Data Library at the bottom left. A flower or a butterfly makes '
         + 'the next few minutes more fun.',
      point: ['photo-drop', 'Drop a photo here'],
      waitFor: TASKS.PHOTO_CHOSEN,
      waiting: 'Waiting for a photo…',
    },
    {
      id: 'ask-it',
      say: 'Now ask it what that is.',
      point: ['predict-btn', 'Press this'],
      waitFor: TASKS.PREDICTED,
      waiting: 'Waiting for you to run it…',
    },
    {
      id: 'read-result',
      say: '{top} — and it is {confidence} sure. Notice it gave you five '
         + 'answers, not one. It never really says "this is a cat". It says '
         + '"here is how much I believe each thing I know".',
      cta: 'Fair enough',
    },
    {
      id: 'broad-strokes',
      say: 'That is what this model is good at. Big, rough answers about a '
         + 'huge number of things.',
      ask: 'So let me push it. What if you wanted the exact name?',
      cta: 'Try that',
    },
  ],

  /* ----------------------------------------------------------- 3. it fails */
  fails: [
    {
      id: 'the-question',
      say: 'It told you what kind of thing this is. But look at what it '
         + 'actually gave you. Those five words are the closest it has. Now '
         + 'think of the exact name you would write on a label.',
      show: 'vocabulary-gap',
      cta: 'I have one in mind',
    },
    {
      id: 'search-it',
      say: 'Type that word in and look for it. I want you to see it missing '
         + 'with your own eyes, not just take my word for it.',
      point: ['vocab-search', 'Type it here'],
      waitFor: TASKS.SEARCHED_VOCAB,
      waiting: 'Waiting for you to search…',
    },
    {
      id: 'the-lesson',
      say: 'It is not there. And it never will be. A model can only answer '
         + 'with words somebody taught it. And look — it did not say "I do not '
         + 'know". It cannot. It handed you its nearest word with a big number '
         + 'beside it. Those two things together look exactly like knowing.',
      show: 'vocabulary-gap',
      ask: 'So how would you give it a word it has never had?',
      cta: 'Show me',
    },
  ],

  /* ------------------------------------------------- 4. specialist school */
  school: [
    {
      id: 'the-idea',
      say: 'Here is the trick, and it is smaller than you would expect. We do '
         + 'not build a new model. We keep everything it learned about looking '
         + 'at photos. We change only the very last bit — the part that picks '
         + 'the name.',
      show: 'freeze-diagram',
      cta: 'Why does that work?',
    },
    {
      id: 'why',
      say: 'Because looking and naming are two different jobs. Edges, colours, '
         + 'patterns, shapes — it already has all of that, from a million '
         + 'pictures. It just does not have your words.',
      show: 'freeze-diagram',
      ask: 'It can already see. You are only teaching it what to call things. '
         + 'How many photos do you think that needs?',
      cta: "Let's find out",
    },
    {
      id: 'pick-data',
      say: 'Open the Data Library at the bottom left. Look inside a few boxes '
         + 'first. What is in the box decides what the model can possibly '
         + 'learn. I would start with Flowers — twelve plants that look '
         + 'nothing like each other, so you will see this work clearly.',
      point: ['bench-data', 'Drop a dataset here'],
      waitFor: TASKS.DATASET_CHOSEN,
      waiting: 'Waiting for you to choose a dataset…',
    },
    {
      id: 'train-it',
      say: 'That is its homework. Press train and watch the line. That line is '
         + 'the model getting things wrong less often, one round at a time. It '
         + 'is measured while you watch, not a cartoon.',
      point: ['bench-train', 'Now train it'],
      waitFor: TASKS.TRAINED,
      waiting: 'Waiting for the training run…',
    },
    {
      id: 'trained',
      say: 'Done — and it took about a second, because only that last bit had '
         + 'to change. Now test it. Give it a photo and see whether it can say '
         + 'the word the big model could not.',
      point: ['bench-test', 'Try it yourself'],
      waitFor: TASKS.SPECIALIST_PREDICTED,
      waiting: 'Waiting for you to test it…',
    },
    {
      id: 'the-payoff',
      say: 'Same photo. The same twenty-five million numbers doing the '
         + 'looking. All that changed is a few thousand numbers on the end — '
         + 'and now it has the word.',
      ask: 'It gained new words. Do you think it gave anything up?',
      cta: 'Find out',
    },
  ],

  /* ------------------------------------------------- 5. the two side by side */
  expert: [
    {
      id: 'same-photo',
      say: 'Put the same photo through both of them. I want the two answers on '
         + 'one screen, because comparing them is the whole point.',
      point: ['expert-drop', 'Same photo as before'],
      waitFor: TASKS.COMPARED,
      waiting: 'Waiting for you to run the specialist…',
    },
    {
      id: 'read-both',
      say: 'The big model said {generalist}. Your new one says {specialist}. '
         + 'Nothing about how the model looks at photos changed between those '
         + 'two answers. The same twenty-five million numbers did the looking '
         + 'both times.',
      cta: 'So what changed?',
    },
    {
      id: 'what-changed',
      say: 'Only the last layer. A few thousand numbers, trained in about a '
         + 'second, on the photos you chose. That is the whole difference '
         + 'between a model that has your word and one that does not.',
      show: 'freeze-diagram',
      ask: 'It gained your words. Do you think it kept everything else?',
      cta: 'Let us check',
    },
  ],

  /* -------------------------------------------------------- 6. the boundary */
  boundary: [
    {
      id: 'setup',
      say: 'Your model knows a handful of flowers and nothing else. Now I want '
         + 'you to show it something from a completely different group.',
      cta: 'Then what?',
    },
    {
      id: 'commit',
      say: 'First, decide. Pick what you think will happen. Being wrong here is '
         + 'the fastest way to remember this forever.',
      point: ['guess-box', 'Choose one'],
      waitFor: TASKS.GUESSED,
      waiting: 'Waiting for your guess…',
    },
    {
      id: 'test',
      say: 'Now drop in something it was never taught, and run it.',
      point: ['boundary-drop', 'Drop it here'],
      waitFor: TASKS.BOUNDARY_TESTED,
      waiting: 'Waiting for the test…',
    },
    {
      id: 'verdict',
      say: 'It was sure. And it was wrong. It cannot say "none of these", '
         + 'because "none of these" was never one of its choices. Being sure '
         + 'and being right are not the same thing. That sentence is worth more '
         + 'than everything else on this screen.',
      show: 'confidence-vs-correct',
      cta: 'Into the labs',
    },
  ],

  /* ------------------------------------------------ 7. Lab A, how much data */
  lab_data: [
    {
      id: 'the-question',
      say: 'You have trained a model and it worked. Now the question every '
         + 'real team argues about: how many photos did it actually need? '
         + 'Everybody has an opinion. Almost nobody checks. You are about to '
         + 'check.',
      show: 'data-volume',
      cta: 'So let us measure it',
    },
    {
      id: 'pick-hard',
      say: 'Use Butterflies for this one. Twelve butterflies that really do '
         + 'look alike — same shapes, same colours, messy gardens behind them. '
         + 'An easy set would score well straight away and you would learn the '
         + 'wrong lesson.',
      cta: 'Right, loaded',
    },
    {
      id: 'train-small',
      say: 'Pull the slider all the way down to the smallest setting and press '
         + 'train. One photo of each butterfly. That is all it gets.',
      point: ['lab-controls', 'Start at the smallest'],
      waitFor: TASKS.TRAINED,
      waiting: 'Waiting for the first run…',
    },
    {
      id: 'read-the-failure',
      say: 'Look at the second number — the one from photos it was never '
         + 'shown. That is what training on almost nothing looks like. The '
         + 'model is not broken and it is not silly. It simply has not seen '
         + 'enough of each butterfly to tell them apart.',
      ask: 'One photo of a butterfly. What could it really have learned from '
         + 'that — the butterfly, or just that one picture?',
      cta: 'So give it more',
    },
    {
      id: 'now-more',
      say: 'Push the slider up and train again. Change nothing else. Same '
         + 'model, same locked layers, same twelve butterflies. The only thing '
         + 'different is how many photos it gets to study.',
      point: ['lab-controls', 'Now give it more'],
      waitFor: TASKS.TRAINED_TWICE,
      waiting: 'Waiting for a second run at a different size…',
    },
    {
      id: 'the-curve',
      say: 'There it is, and you measured it yourself. More photos, better '
         + 'learning. Not because I said so — because you ran it twice and the '
         + 'number moved.',
      cta: 'Keep going',
    },
    {
      id: 'the-gap',
      say: 'One more thing worth seeing. Look at the gap between the two '
         + 'numbers. With very few photos the model scores brilliantly on its '
         + 'homework and badly on anything new. It just memorised them. As you '
         + 'add photos that gap closes, because memorising a hundred photos is '
         + 'harder than actually learning what a butterfly looks like.',
      cta: 'And if I keep adding?',
    },
    {
      id: 'diminishing',
      say: 'Try the top of the slider and watch the climb go flat. Going from '
         + 'one photo to ten is a huge jump. Going from a hundred to two '
         + 'hundred is a small one. That flat part matters — it is how a real '
         + 'team decides that collecting more photos is no longer worth the '
         + 'money.',
      ask: 'And what if you have no more photos, and you cannot get any?',
      cta: 'Then what?',
    },
  ],

  /* ------------------------------------------- 8. Lab B, making data appear */
  lab_augment: [
    {
      id: 'setup',
      say: 'You have run out of photos. But you can flip one, tilt it, make it '
         + 'brighter. To the model that is a grid of numbers it has never seen '
         + 'before — so in a real way, it is a new photo.',
      cta: 'Does that actually help?',
    },
    {
      id: 'baseline',
      say: 'Only one way to find out, and it has to be a fair test. Train once '
         + 'with every switch off first. Without that first score to compare '
         + 'against, "it went up" is just a feeling.',
      point: ['lab-controls', 'Everything off, then train'],
      waitFor: TASKS.TRAINED,
      waiting: 'Waiting for the baseline run…',
    },
    {
      id: 'turn-on',
      say: 'Now switch some of them on and train again. Change only that. If '
         + 'you also move the data slider, you have changed two things at once '
         + 'and learned nothing.',
      point: ['lab-controls', 'Switch some on'],
      waitFor: TASKS.AUGMENTED,
      waiting: 'Waiting for a run with transforms on…',
    },
    {
      id: 'verdict',
      say: 'Compare them. And notice one detail that matters more than the '
         + 'result: the test only uses real photos, never flipped ones. If '
         + 'flipped copies were allowed into the test, this trick would look '
         + 'brilliant every single time — by marking its own homework.',
      ask: 'A flipped flower is still a perfectly normal flower. Is a flipped 7?',
      cta: 'One last lab',
    },
  ],

  /* --------------------------------- 9. Lab C, how much of the brain to open */
  lab_brain: [
    {
      id: 'setup',
      say: 'So far I kept the big model locked and retrained only the last '
         + 'layer. You could unlock the whole thing instead. This lab uses a '
         + 'much smaller model, small enough that both ways really run in front '
         + 'of you.',
      show: 'freeze-diagram',
      cta: 'Why smaller?',
    },
    {
      id: 'why-smaller',
      say: 'Because changing twenty-five million numbers inside a browser would '
         + 'take most of the lesson. Fifteen thousand takes seconds. Same idea, '
         + 'real numbers, nothing pre-recorded.',
      cta: 'Fair. Where do we start?',
    },
    {
      id: 'train-base',
      say: 'First give the little model one skill. Train it on your first '
         + 'subject and remember the score. That number is the one we are about '
         + 'to put at risk.',
      point: ['labc-base', 'Train it first'],
      waitFor: TASKS.BASE_TRAINED,
      waiting: 'Waiting for the first training run…',
    },
    {
      id: 'both-modes',
      say: 'Now teach it a second subject — twice. Once with the early layers '
         + 'locked, once with everything unlocked. Then look at what happened '
         + 'to the first skill.',
      point: ['labc-modes', 'Try both'],
      waitFor: TASKS.BOTH_MODES,
      waiting: 'Waiting for both tuning modes…',
    },
    {
      id: 'forgetting',
      say: 'It forgot. And you just measured it. With the layers locked, the '
         + 'old skill cannot move — they are the same numbers as before. '
         + 'Unlocked, they shifted to suit the new job and wrote over the old '
         + 'one.',
      show: 'freeze-diagram',
      ask: 'So why would anyone ever unlock everything?',
      cta: 'Because sometimes it is worth it',
    },
  ],

  /* ---------------------------------------------------- 10. the last reveal */
  multimodal: [
    {
      id: 'recap',
      say: 'Look at what you built. A model that could name a thousand things '
         + 'badly, turned into one that names a dozen things well — and you '
         + 'changed only a tiny piece of it.',
      cta: 'And?',
    },
    {
      id: 'the-limit',
      say: 'But every model you used today answers exactly one question: which '
         + 'of my names is this? It cannot answer anything else, because a list '
         + 'of numbers is the only shape its answer has.',
      ask: 'If you could ask a photo anything at all, what would you ask it?',
      cta: 'Show me',
    },
    {
      id: 'multimodal',
      say: 'There is another kind of model. It reads your picture and your '
         + 'sentence together, and it answers in sentences. Ask it something a '
         + 'label could never tell you.',
      point: ['mm-ask', 'Ask it something'],
      waitFor: TASKS.ASKED_MULTIMODAL,
      waiting: 'Waiting for your question…',
    },
    {
      id: 'closing',
      say: 'Neither one is better. They answer different questions, and knowing '
         + 'which kind your problem needs is most of the job. That is the thing '
         + 'worth taking home today.',
      cta: 'Finish',
    },
  ],
};

/**
 * Fill `{placeholders}` from real state.
 *
 * Only values the caller actually measured get through. An unknown placeholder
 * is dropped rather than printed, so a missing number can never surface as
 * "{confidence}" or "undefined" in front of a class.
 */
export function resolve(text, facts = {}) {
  if (!text) return '';
  return text.replace(/\{(\w+)\}/g, (whole, key) => {
    const v = facts[key];
    if (v === undefined || v === null || v === '') return '';
    return String(v);
  }).replace(/\s{2,}/g, ' ').trim();
}

export const beatsFor = (stepId) => LESSONS[stepId] || [];
