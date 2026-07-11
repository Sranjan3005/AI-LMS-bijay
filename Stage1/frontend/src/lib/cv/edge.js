/**
 * edge.js — real, instant edge detection in the browser (Sobel operator on canvas
 * pixels). No backend, no Docker. Produces the 4 teaching stages for the overlay.
 */

function readGray(canvas) {
  const w = canvas.width, h = canvas.height;
  const { data } = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  return { gray, w, h };
}

function grayCanvasURL(gray, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = gray[i] | 0;
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c.toDataURL('image/png');
}

/** Sobel gradient magnitude → normalized 0..255 edge array. */
function sobel(gray, w, h) {
  const mag = new Float32Array(w * h);
  let max = 1;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
        gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
      const gy =
        -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
        gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
      const m = Math.sqrt(gx * gx + gy * gy);
      mag[i] = m; if (m > max) max = m;
    }
  }
  for (let i = 0; i < mag.length; i++) mag[i] = (mag[i] / max) * 255;
  return mag;
}

/** Neon edge image (cyan edges on black). */
function edgeURL(mag, w, h, threshold = 40) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const on = mag[i] > threshold;
    const v = mag[i];
    out.data[i * 4] = on ? 0 : 0;
    out.data[i * 4 + 1] = on ? Math.min(255, v + 60) : 0;
    out.data[i * 4 + 2] = on ? 255 : 0;
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c.toDataURL('image/png');
}

/** Original drawing with detected edges overlaid in magenta. */
function overlayURL(sourceCanvas, mag, w, h, threshold = 40) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) {
    if (mag[i] > threshold) {
      img.data[i * 4] = 255; img.data[i * 4 + 1] = 0; img.data[i * 4 + 2] = 255; img.data[i * 4 + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export async function runEdgePipeline(sourceCanvas) {
  const { gray, w, h } = readGray(sourceCanvas);
  const threshold = 40;
  const mag = sobel(gray, w, h);

  let edgePixels = 0;
  for (let i = 0; i < mag.length; i++) if (mag[i] > threshold) edgePixels++;
  if (edgePixels < 20) return { ok: false, message: 'Draw a shape first — try a circle, square, or star!' };

  const pct = Math.round((edgePixels / (w * h)) * 100);
  return {
    ok: true,
    prediction: `Found the outlines! ${edgePixels.toLocaleString()} edge pixels (${pct}% of the image).`,
    stages: [
      { title: 'Capture', description: 'Your drawing — just a grid of coloured pixels to the computer.', image: sourceCanvas.toDataURL('image/png') },
      { title: 'Process', description: 'Converted to grayscale: colour is dropped so only brightness remains. Edges live in the brightness changes.', image: grayCanvasURL(gray, w, h) },
      { title: 'Understand', description: 'The Sobel filter measures how sharply brightness changes at every pixel. Big changes = an edge (shown in neon).', image: edgeURL(mag, w, h, threshold) },
      { title: 'Decide', description: 'The detected edges (magenta) laid back over your drawing — these outlines are the first thing a CNN learns to see.', image: overlayURL(sourceCanvas, mag, w, h, threshold) },
    ],
  };
}
