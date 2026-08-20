/**
 * resample.js -- Pillow's bicubic resize, reimplemented for the browser.
 *
 * WHY THIS EXISTS, WHICH IS NOT "CANVAS IS BLURRY"
 *
 * Every head in this module is fitted in Python on features computed from
 * images that PIL resized. The student's live photo is resized by a `<canvas>`.
 * If those two produce different pixels, they produce different features, and a
 * head fitted on one is being applied to the other -- the exact failure the
 * single-ONNX design was meant to eliminate, sneaking back in one layer lower.
 *
 * Measured with `scripts/check_parity.py` on eight flowers:
 *
 *   canvas drawImage, one shot          cosine 0.949 - 0.997   (worst: foxglove)
 *   canvas drawImage, halving steps     cosine 0.976 - 0.997
 *   this file                           see the check; the goal is >= 0.999
 *
 * Halving helps because it forces averaging, but it is still a different filter
 * from Pillow's. The only way to stop guessing is to run the same algorithm, so
 * that is what this does.
 *
 * THE ALGORITHM, from Pillow's src/libImaging/Resample.c
 *
 * A separable convolution: horizontal pass, then vertical. For each output
 * pixel, a window of input pixels is weighted by a bicubic kernel and summed.
 * The details that actually matter for matching:
 *
 *   * `filterscale = max(1, inSize / outSize)`. When downscaling, the kernel
 *     *widens* by that factor, so shrinking 667 -> 224 averages about 12 input
 *     pixels per output pixel rather than sampling 4. This is the whole reason
 *     naive drawImage aliases: it does not widen.
 *   * The bicubic coefficient is a = -0.5, not the -0.75 some libraries use.
 *   * Weights are normalised to sum to exactly 1 per output pixel.
 *   * Pillow rounds to 8-bit *between* the two passes, so we do too. Carrying
 *     float precision through would be more accurate and would match less.
 *
 * Cost is about a million multiply-adds for a typical dataset photo -- a few
 * milliseconds, against ~300 ms for the ResNet forward pass that follows it.
 */

/** Pillow's BICUBIC kernel. `a = -0.5`; support 2.0. */
function bicubic(x) {
  const a = -0.5;
  const t = x < 0 ? -x : x;
  if (t < 1.0) return ((a + 2.0) * t - (a + 3.0)) * t * t + 1.0;
  if (t < 2.0) return (((t - 5.0) * t + 8.0) * t - 4.0) * a;
  return 0.0;
}

const SUPPORT = 2.0;

/**
 * Precompute, for one axis, which input pixels each output pixel reads and with
 * what weights. Lifted straight out of `precompute_coeffs`.
 *
 * @returns {{bounds:Int32Array, kk:Float64Array, ksize:number}}
 */
function coeffs(inSize, outSize) {
  const scale = inSize / outSize;
  const filterscale = scale < 1.0 ? 1.0 : scale;
  const support = SUPPORT * filterscale;
  const ksize = Math.ceil(support) * 2 + 1;

  const bounds = new Int32Array(outSize * 2);
  const kk = new Float64Array(outSize * ksize);

  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale;
    const ss = 1.0 / filterscale;

    let xmin = Math.floor(center - support + 0.5);
    if (xmin < 0) xmin = 0;
    let xmax = Math.floor(center + support + 0.5);
    if (xmax > inSize) xmax = inSize;
    xmax -= xmin;

    const k = kk.subarray(xx * ksize, xx * ksize + ksize);
    let ww = 0.0;
    for (let x = 0; x < xmax; x++) {
      const w = bicubic((x + xmin - center + 0.5) * ss);
      k[x] = w;
      ww += w;
    }
    if (ww !== 0.0) for (let x = 0; x < xmax; x++) k[x] /= ww;

    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = xmax;
  }
  return { bounds, kk, ksize };
}

/** Pillow's clip8: round half up, clamp to a byte. */
function clip8(v) {
  const r = Math.round(v);
  return r < 0 ? 0 : (r > 255 ? 255 : r);
}

/**
 * Resize RGBA bytes with Pillow's bicubic filter.
 *
 * Alpha is carried through the arithmetic but ignored downstream -- the images
 * here are opaque JPEGs, and dropping the channel would only complicate the
 * stride maths.
 *
 * @param {Uint8ClampedArray} src  RGBA, `sw * sh * 4`
 * @returns {Uint8ClampedArray} RGBA, `dw * dh * 4`
 */
export function resizeBicubic(src, sw, sh, dw, dh) {
  // -- horizontal pass: (sw x sh) -> (dw x sh) ------------------------------
  const hz = coeffs(sw, dw);
  const tmp = new Uint8ClampedArray(dw * sh * 4);

  for (let y = 0; y < sh; y++) {
    const srow = y * sw * 4;
    const trow = y * dw * 4;
    for (let xx = 0; xx < dw; xx++) {
      const xmin = hz.bounds[xx * 2];
      const xmax = hz.bounds[xx * 2 + 1];
      const k = hz.kk;
      const ko = xx * hz.ksize;
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let x = 0; x < xmax; x++) {
        const w = k[ko + x];
        const p = srow + (xmin + x) * 4;
        r += w * src[p];
        g += w * src[p + 1];
        b += w * src[p + 2];
        a += w * src[p + 3];
      }
      const q = trow + xx * 4;
      // Pillow quantises here, between the passes. Matching that matters more
      // than the extra precision we could have kept.
      tmp[q] = clip8(r);
      tmp[q + 1] = clip8(g);
      tmp[q + 2] = clip8(b);
      tmp[q + 3] = clip8(a);
    }
  }

  // -- vertical pass: (dw x sh) -> (dw x dh) --------------------------------
  const vt = coeffs(sh, dh);
  const out = new Uint8ClampedArray(dw * dh * 4);

  for (let yy = 0; yy < dh; yy++) {
    const ymin = vt.bounds[yy * 2];
    const ymax = vt.bounds[yy * 2 + 1];
    const k = vt.kk;
    const ko = yy * vt.ksize;
    const orow = yy * dw * 4;
    for (let x = 0; x < dw; x++) {
      let r = 0; let g = 0; let b = 0; let a = 0;
      for (let y = 0; y < ymax; y++) {
        const w = k[ko + y];
        const p = ((ymin + y) * dw + x) * 4;
        r += w * tmp[p];
        g += w * tmp[p + 1];
        b += w * tmp[p + 2];
        a += w * tmp[p + 3];
      }
      const q = orow + x * 4;
      out[q] = clip8(r);
      out[q + 1] = clip8(g);
      out[q + 2] = clip8(b);
      out[q + 3] = clip8(a);
    }
  }

  return out;
}

/**
 * Read an image element or canvas back as raw RGBA at its natural size.
 *
 * `willReadFrequently` matters: without it Chrome keeps the canvas on the GPU
 * and every `getImageData` pays a readback stall, which on a 20-photo folder is
 * the difference between "a moment" and "did it freeze".
 */
let readCanvas = null;
export function pixelsOf(el) {
  const w = el.naturalWidth || el.width;
  const h = el.naturalHeight || el.height;
  if (!w || !h) return { data: new Uint8ClampedArray(0), width: 0, height: 0 };

  // A canvas can be read directly; only <img> needs rasterising first.
  if (typeof HTMLCanvasElement !== 'undefined' && el instanceof HTMLCanvasElement) {
    const ctx = el.getContext('2d', { willReadFrequently: true });
    return { ...ctx.getImageData(0, 0, w, h), width: w, height: h };
  }

  if (!readCanvas) readCanvas = document.createElement('canvas');
  readCanvas.width = w;
  readCanvas.height = h;
  const ctx = readCanvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(el, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  return { data: img.data, width: w, height: h };
}

/**
 * Aspect-preserving fit onto a black square, byte-identical in intent to
 * `cnn_preprocess.contain_fit()`.
 *
 * @returns {Uint8ClampedArray} RGBA, `size * size * 4`, black where letterboxed
 */
export function containFitPixels(el, size) {
  const out = new Uint8ClampedArray(size * size * 4);
  // Opaque black, matching PIL's `Image.new("RGB", (size, size), (0, 0, 0))`.
  for (let i = 3; i < out.length; i += 4) out[i] = 255;

  const { data, width, height } = pixelsOf(el);
  if (!width || !height) return out;

  const scale = Math.min(size / width, size / height);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));

  const resized = (dw === width && dh === height)
    ? data
    : resizeBicubic(data, width, height, dw, dh);

  const ox = (size - dw) >> 1;   // PIL uses integer division for the paste box
  const oy = (size - dh) >> 1;

  for (let y = 0; y < dh; y++) {
    const src = y * dw * 4;
    const dst = ((y + oy) * size + ox) * 4;
    out.set(resized.subarray(src, src + dw * 4), dst);
  }
  return out;
}
