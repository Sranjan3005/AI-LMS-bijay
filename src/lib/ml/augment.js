/**
 * augment.js -- Lab B. Turning photos you have into photos you do not.
 *
 * THE ORDER MATTERS AND IT IS EASY TO GET WRONG: augmentation happens on the
 * *image*, then the augmented image is embedded. You cannot flip an embedding.
 * A 2048-number feature vector is not a picture and has no left or right, so
 * transforming it produces noise rather than a mirrored photo.
 *
 * Every variant therefore costs a real ResNet-50 forward pass -- about a third
 * of a second in a browser. For installed datasets that
 * is unaffordable live, so all six variants are embedded at build time by
 * `scripts/embed_datasets.py` and the toggles here just select among them.
 * This file still does the rendering for the *student's own* photos, where no
 * build step could have run, and for the preview strip in Lab B.
 *
 * THE VARIANT ORDER IN embed_datasets.py MUST MATCH `variantsOf` BELOW. If they
 * drift, "flip" starts selecting the brightened copy and Lab B measures the
 * wrong thing while looking completely normal. heads.js checks the names
 * rather than trusting the order, which is the only reason that is survivable.
 *
 * The transforms are deliberately the three from the blueprint -- flip, rotate,
 * brightness -- because each one has an honest real-world justification a
 * student can evaluate:
 *   flip       a photo taken from the other side
 *   rotate     a camera not held straight
 *   brightness a cloudy day, or a classroom light
 *
 * That framing matters for Lab B's real lesson: augmentation only helps when it
 * imitates variation that actually occurs. Flipping a digit produces a digit
 * that does not exist; flipping a flower produces a perfectly ordinary flower.
 */

import { containFitPixels } from './resample.js';

export const TRANSFORMS = [
  {
    id: 'flip',
    label: 'Horizontal flip',
    icon: '↔',
    blurb: 'Mirror it left-to-right.',
    justification: 'A photo taken from the other side of the plant.',
  },
  {
    id: 'rotate',
    label: 'Rotate ±20°',
    icon: '↻',
    blurb: 'Tilt it a little, either way.',
    justification: 'Nobody holds a phone perfectly straight.',
  },
  {
    id: 'brightness',
    label: 'Brightness shift',
    icon: '☀',
    blurb: 'Lighter and darker copies.',
    justification: 'Shade, cloud, classroom strip-lighting.',
  },
];

const SIZE = 224; // ResNet-50's input square -- see cnn_preprocess.py

/**
 * Draw `src` under a transform, then letterbox it to 224.
 *
 * THE ORDER HERE MIRRORS `apply_variant()` IN embed_datasets.py, EXACTLY:
 *
 *     rotate (expand) -> flip -> brightness -> contain-fit
 *
 * and it has to. Rotating a photo and *then* shrinking it is not the same
 * picture as shrinking and then rotating -- the second one rotates the black
 * letterbox bars too, and puts corners of nothing where the model expects
 * pixels. Lab B's whole claim is that a flipped variant is a genuine embedding
 * of a genuinely flipped photo, and that claim is only true if both sides build
 * the same photo.
 *
 * Two details that are easy to get backwards:
 *
 *   * PIL's `rotate(+20)` turns anti-clockwise. Canvas's `rotate(+rad)` turns
 *     clockwise, because its y axis points down. Hence the negation.
 *   * The final resize goes through `resample.js`, not `drawImage`. Canvas's
 *     default scaler disagrees with Pillow badly enough to move a feature
 *     vector several percent -- see the header of resample.js for the measured
 *     numbers.
 */
function render(src, { flip = false, rotate = 0, brightness = 1 } = {}) {
  const w = src.naturalWidth || src.width;
  const h = src.naturalHeight || src.height;

  // Fast path: nothing to do but fit it.
  let stage = src;

  if (rotate || flip || brightness !== 1) {
    // Rotate with expansion, the way PIL does -- the canvas grows to hold the
    // whole rotated image rather than cropping its corners off.
    const rad = (rotate * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const ew = Math.max(1, Math.round(w * cos + h * sin));
    const eh = Math.max(1, Math.round(w * sin + h * cos));

    const work = document.createElement('canvas');
    work.width = ew;
    work.height = eh;
    const wctx = work.getContext('2d', { willReadFrequently: true });

    // PIL's rotate fills the exposed corners with black.
    wctx.fillStyle = '#000';
    wctx.fillRect(0, 0, ew, eh);

    if (brightness !== 1) wctx.filter = `brightness(${brightness})`;
    wctx.translate(ew / 2, eh / 2);
    if (rotate) wctx.rotate(-rad);
    if (flip) wctx.scale(-1, 1);
    wctx.drawImage(src, -w / 2, -h / 2, w, h);

    stage = work;
  }

  const out = document.createElement('canvas');
  out.width = SIZE;
  out.height = SIZE;
  const octx = out.getContext('2d', { willReadFrequently: true });
  const pixels = containFitPixels(stage, SIZE);
  octx.putImageData(new ImageData(pixels, SIZE, SIZE), 0, 0);
  return out;
}

/** The identity render -- also how un-augmented images reach the model. */
export function toCanvas(src) {
  return render(src, {});
}

/**
 * Every variant of one image under the active transforms.
 *
 * The original is always variant 0, so `variantsOf(img, {})` returns exactly
 * one canvas and the augmentation-off path costs nothing extra.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} src
 * @param {{flip?:boolean, rotate?:boolean, brightness?:boolean}} active
 * @returns {HTMLCanvasElement[]}
 */
export function variantsOf(src, active = {}) {
  const out = [render(src, {})];
  if (active.flip) out.push(render(src, { flip: true }));
  if (active.rotate) {
    out.push(render(src, { rotate: 20 }));
    out.push(render(src, { rotate: -20 }));
  }
  if (active.brightness) {
    out.push(render(src, { brightness: 1.35 }));
    out.push(render(src, { brightness: 0.7 }));
  }
  return out;
}

/** How many images each real one becomes. Drives the "100 -> 500" counter. */
export function multiplier(active = {}) {
  return 1
    + (active.flip ? 1 : 0)
    + (active.rotate ? 2 : 0)
    + (active.brightness ? 2 : 0);
}

export const anyActive = (active = {}) => multiplier(active) > 1;
