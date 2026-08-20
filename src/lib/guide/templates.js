import { KINDS } from './diagnose.js';

/**
 * templates.js -- fixed wording for every diagnosis, with the real numbers
 * interpolated.
 *
 * This is the *contract*, not a consolation prize. In the main app an LLM
 * rewords these for a 13-year-old; if it is slow or fails, this ships instead
 * and the student notices nothing except slightly stiffer prose. Which means
 * every line here has to be presentable on its own.
 *
 * Two rules, inherited from the main app's coach:
 *   1. Never state a number that is not in `evidence`.
 *   2. Never contradict `kind`.
 */

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

const TEMPLATES = {
  [KINDS.NO_LEARNING]: () => ({
    say: 'That model has no weights at all -- there is nothing in it to change. '
       + 'It cannot learn from your data, it can only be used as-is.',
    insight: 'Not every model is trainable. Some are only ever run.',
  }),

  [KINDS.TOO_FEW_SAMPLES]: (e) => ({
    say: `I only got ${e.trainCount} training images. That is not enough to learn `
       + 'what makes each class different, so I am mostly guessing. Slide the data '
       + 'volume up and watch what happens.',
    insight: 'More examples is usually the cheapest fix there is.',
  }),

  [KINDS.DISTRIBUTION_MISMATCH]: (e) => ({
    say: `I scored ${pct(e.ownAccuracy)} on ${e.ownDataset} -- the kind of images I `
       + `trained on. On ${e.worstDataset} I scored ${pct(e.worstAccuracy)}. I never `
       + 'saw anything like that, so I have no idea what I am looking at.',
    insight: 'A model is only as broad as the data it was trained on.',
  }),

  [KINDS.OVERFIT]: (e) => ({
    say: `I got ${pct(e.trainAccuracy)} on the images I studied but only `
       + `${pct(e.testAccuracy)} on images I had never seen. I memorised the answers `
       + 'instead of learning the pattern.',
    insight: 'Scoring well on your own homework proves nothing.',
  }),

  [KINDS.UNDERFIT]: (e) => ({
    say: `${pct(e.trainAccuracy)} on training and ${pct(e.testAccuracy)} on the test -- `
       + 'both low. I did not memorise anything, I just never learned enough. '
       + 'Give me more room or more time.',
    insight: 'When both numbers are bad, the model is too small for the job.',
  }),

  [KINDS.CLASS_IMBALANCE]: (e) => ({
    say: `One class has ${e.max} images and another has only ${e.min}. I will get very `
       + 'good at the common one and barely learn the rare one -- and my overall '
       + 'score will hide that.',
    insight: 'An average can look healthy while one class is being ignored.',
  }),

  [KINDS.CLASS_CONFUSION]: (e) => ({
    say: e.confusedWith
      ? `Most of my mistakes are one thing: I keep calling ${e.label} a ${e.confusedWith}. `
        + `That is ${e.errors} of my errors in one place.`
      : `Most of my mistakes are on ${e.label} -- ${e.errors} of them.`,
    insight: 'Errors are rarely spread evenly. Find the cluster.',
  }),

  [KINDS.CATASTROPHIC_FORGETTING]: (e) => ({
    say: `Look what I lost. Before you retrained me I scored ${pct(e.before)} on the `
       + `things I already knew. Now I score ${pct(e.after)}. You unlocked my whole `
       + `brain and gave me only ${e.trainCount} images, so I wrote over everything `
       + 'I had.',
    insight: 'Unlocking every layer with a small dataset destroys what the model '
           + 'already knew. That is catastrophic forgetting.',
  }),

  [KINDS.AUGMENTATION_HELPED]: (e) => ({
    say: `${pct(e.before)} to ${pct(e.after)} -- and you did not collect a single new `
       + `photo. Flipping and rotating turned your ${e.realCount} images into `
       + `${e.effectiveCount} for me to study.`,
    insight: 'Augmentation buys variety, not information -- but variety is often '
           + 'what was missing.',
  }),

  [KINDS.AUGMENTATION_DID_NOT_HELP]: (e) => ({
    say: `${pct(e.before)} before, ${pct(e.after)} after. Augmentation barely moved it `
       + 'this time. That happens -- if the transforms do not match how the real '
       + 'photos vary, they add noise rather than variety.',
    insight: 'Augmentation only helps when it imitates a difference that actually '
           + 'occurs in the real world.',
  }),

  [KINDS.SUCCESS]: (e) => ({
    say: `${pct(e.testAccuracy)} on images I had never seen, and it holds up across `
       + 'the board. That is a model you could actually use.',
    insight: 'Consistent across datasets beats brilliant on one.',
  }),
};

/**
 * Deterministic coaching line for a diagnosis.
 *
 * @param {{kind:string, evidence:object, candidateActions:Array}} diagnosis
 * @returns {{say:string, insight:string, suggestion:object|null, source:'template'}}
 */
export function templateFor(diagnosis) {
  if (!diagnosis?.kind) {
    return { say: '', insight: '', suggestion: null, source: 'template' };
  }
  const build = TEMPLATES[diagnosis.kind];
  const { say = '', insight = '' } = build ? build(diagnosis.evidence || {}) : {};
  return {
    say,
    insight,
    // The rules already ranked the candidates; the first one is the fallback
    // choice, so the button works even when nothing rewords it.
    suggestion: diagnosis.candidateActions?.[0] || null,
    source: 'template',
  };
}
