/**
 * script.js -- Chiti's narration for the guided steps.
 *
 * Steps 1-6 have no metrics to react to, so they need no LLM and no network:
 * they are deterministic lines built from what actually happened on screen.
 * That is a feature, not a shortcut -- most of the module speaks instantly and
 * works offline, and the live coach is saved for steps 7-10 where there are
 * real numbers to diagnose.
 *
 * Every function here is pure and takes real state. Nothing is invented: if a
 * line mentions a label or a score, it was passed in.
 */

export const STEPS = [
  {
    id: 'meet',
    n: 1,
    title: 'Meet the generalist',
    act: 'Act 1 -- The smart generalist',
    gate: 'Load the model to continue',
  },
  {
    id: 'works',
    n: 2,
    title: 'It works',
    act: 'Act 1 -- The smart generalist',
    gate: 'Run one prediction to continue',
  },
  {
    id: 'fails',
    n: 3,
    title: 'Now ask it something harder',
    act: 'Act 1 -- The smart generalist',
    gate: 'Look up the answer to continue',
  },
  {
    id: 'school',
    n: 4,
    title: 'Send it to specialist school',
    act: 'Act 2 -- Fine-tuning',
    gate: 'Train the model to continue',
  },
  {
    id: 'expert',
    n: 5,
    title: 'It is a specialist now',
    act: 'Act 2 -- Fine-tuning',
    gate: 'Run one prediction to continue',
  },
  {
    id: 'boundary',
    n: 6,
    title: 'The boundary test',
    act: 'Act 3 -- What it gave up',
    gate: 'Guess, then test, to continue',
  },
  {
    id: 'lab_data',
    n: 7,
    title: 'Lab A -- how much data is enough?',
    act: 'The labs',
    gate: 'Train at two different sizes to continue',
  },
  {
    id: 'lab_augment',
    n: 8,
    title: 'Lab B -- making data out of data',
    act: 'The labs',
    gate: 'Train once with augmentation on to continue',
  },
  {
    id: 'lab_brain',
    n: 9,
    title: 'Lab C -- how much of the brain to unlock',
    act: 'The labs',
    gate: 'Try both tuning modes to continue',
  },
  {
    id: 'multimodal',
    n: 10,
    title: 'One more kind of model',
    act: 'Act 4 -- Beyond one label',
    gate: null,
  },
];

export const stepIndex = (id) => STEPS.findIndex((s) => s.id === id);
export const stepById = (id) => STEPS.find((s) => s.id === id) || null;

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

/* Join a list the way a person says it: a, b and c. */
const listOf = (xs) => {
  const a = xs.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`;
};

/**
 * The line Chiti says on entering a step.
 *
 * @param {string} stepId
 * @param {object} ctx  real state -- see each case for what it reads
 * @returns {string}
 */
export function narrate(stepId, ctx = {}) {
  switch (stepId) {
    case 'meet':
      return 'This is a base model. It went to general school -- somebody showed it '
        + `${ctx.trainingImages || 'over a million'} photos covering `
        + `${ctx.classCount || 1000} different things. It knows a little about a lot. `
        + 'Read its card before you load it, especially the part where it tells you '
        + 'what it cannot do.';

    case 'works': {
      if (!ctx.top) {
        return 'Give it a photo. Anything -- upload one, or pick one of mine. '
          + 'Let us see what it makes of it.';
      }
      return `It says ${ctx.top.label}, ${pct(ctx.top.score)} confident. `
        + 'And it is right, more or less. This is a generalist doing what a '
        + 'generalist is good at: broad strokes.';
    }

    case 'fails': {
      if (!ctx.top) return 'Now the harder question. Which exact species is it?';
      const guesses = listOf((ctx.top3 || []).map((g) => g.label));
      return `Now ask the harder question -- which exact species is it? Here is `
        + `everything I have to offer: ${guesses}. The real answer is not on that `
        + 'list, and it never will be, because the word is not in my vocabulary. '
        + 'I cannot be more precise than the labels I was taught.';
    }

    case 'school':
      return 'So let us send it to specialist school. Open the Data Library and pick '
        + 'a set of images with the labels you actually want. I will keep the part '
        + 'of the model that knows how to see, and retrain only the part that '
        + 'decides what to call things.';

    case 'expert': {
      if (!ctx.top) return 'Now give it the same photo again.';
      return `${ctx.top.label}, ${pct(ctx.top.score)} confident. Same photo, same eyes, `
        + 'different answer -- because now it has the words. Nothing about how it '
        + 'sees changed. Only what it was taught to care about.';
    }

    case 'boundary': {
      if (!ctx.tested) {
        return 'Before you press anything: what do you think happens if I show my '
          + `brand new ${ctx.domain || 'specialist'} expert something from a `
          + 'completely different category? Make a guess first.';
      }
      return `${ctx.top?.label ?? 'Something'} -- ${pct(ctx.top?.score)} confident, and `
        + 'completely wrong. It is not that it does not know. It is that it can only '
        + `answer in ${ctx.labelCount || 'the'} labels I gave it, so it picked the `
        + 'closest one. Confidence is not correctness.';
    }

    case 'lab_data':
      return 'Here is the question every team building a model argues about: how much '
        + 'data is enough? Train me on one image per class. Then ten. Then everything '
        + 'you have. Watch the second score -- the one measured on photos I was never '
        + 'shown. The first only says I remembered my homework.';

    case 'lab_augment':
      return 'You are out of photos. But you can flip one, rotate it, brighten it -- '
        + 'and to me that is a new image, because I have never seen this exact grid '
        + 'of numbers before. Turn the transforms on and retrain.';

    case 'lab_brain':
      return 'Last one, and this is the one that surprises people. So far I have kept '
        + 'my convolutions locked and only retrained the last bit. You can unlock the '
        + 'whole thing instead. Try it -- but watch what it costs.';

    case 'multimodal':
      return 'Everything you built today gives back one label. Useful, and narrow. '
        + 'There is another kind of model that takes your picture and your question '
        + 'together, and answers in sentences. Ask it something a label could never '
        + 'tell you.';

    default:
      return '';
  }
}

/**
 * Short reactions to things the student does mid-step.
 * Keyed so `chiti.say()` will not repeat them on a re-render.
 */
export function react(event, ctx = {}) {
  switch (event) {
    case 'model_loaded':
      return { key: 'model_loaded', text: 'Loaded, and running on your machine. '
        + 'Nothing you upload here leaves this browser.' };

    case 'dataset_selected':
      return {
        key: `dataset_selected:${ctx.datasetId}`,
        text: `${ctx.count} images across ${ctx.labelCount} classes. That is the `
          + 'syllabus. Press train and I will study it.',
      };

    case 'training_started':
      return { key: `training_started:${ctx.runId}`, text: 'Studying. The curve you '
        + 'are watching is my error going down -- it is measured, not an animation.' };

    case 'low_confidence':
      return {
        key: `low_conf:${ctx.label}`,
        text: `Only ${pct(ctx.score)} sure. When I am this uncertain, treat the answer `
          + 'as a suggestion rather than a fact.',
      };

    case 'guess_recorded':
      return { key: `guess:${ctx.guess}`, text: 'Noted. Now let us find out.' };

    default:
      return null;
  }
}
