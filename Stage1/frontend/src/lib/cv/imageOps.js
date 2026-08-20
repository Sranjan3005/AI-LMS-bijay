/**
 * imageOps.js — small, dependency-free canvas/image helpers for the browser CV demos.
 * Everything here is deterministic and instant (plain ImageData math).
 */

/** Build an offscreen canvas from a PNG/JPEG data-URL (async). */
export function canvasFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = reject;
    img.src = dataURL;
  });
}

/** Read a source canvas, find the ink, and produce an MNIST-style centered 28×28 grid.
 *  Returns Float32Array(784) in [0,1] (white ink = 1 on black = 0), or null if blank. */
export function extractInput28(sourceCanvas) {
  const w = sourceCanvas.width, h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0; i < w * h; i++) {
    const v = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3 / 255;
    if (v > 0.15) {
      const x = i % w, y = (i / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null; // nothing drawn

  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  // Scale the ink box to fit in a 20×20 area (MNIST leaves a 4px margin in 28px).
  const scale = 20 / Math.max(bw, bh);
  const sw = Math.max(1, Math.round(bw * scale));
  const sh = Math.max(1, Math.round(bh * scale));

  const tmp = document.createElement('canvas');
  tmp.width = sw; tmp.height = sh;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(sourceCanvas, minX, minY, bw, bh, 0, 0, sw, sh);
  const sdata = tctx.getImageData(0, 0, sw, sh).data;

  // Centre of mass of the scaled ink, so we can place it at (14,14) like MNIST.
  const sg = new Float32Array(sw * sh);
  let mass = 0, cx = 0, cy = 0;
  for (let i = 0; i < sw * sh; i++) {
    const v = (sdata[i * 4] + sdata[i * 4 + 1] + sdata[i * 4 + 2]) / 3 / 255;
    sg[i] = v; mass += v; cx += v * (i % sw); cy += v * ((i / sw) | 0);
  }
  if (mass > 0) { cx /= mass; cy /= mass; } else { cx = sw / 2; cy = sh / 2; }

  const grid = new Float32Array(28 * 28);
  const offX = Math.round(14 - cx), offY = Math.round(14 - cy);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const tx = x + offX, ty = y + offY;
      if (tx >= 0 && tx < 28 && ty >= 0 && ty < 28) grid[ty * 28 + tx] = sg[y * sw + x];
    }
  }
  return grid;
}

/** Render a 28×28 (or NxN) intensity grid to a data-URL, upscaled `scale`×.
 *  mode: 'gray' | 'heat'. */
export function gridToDataURL(grid, n = 28, scale = 8, mode = 'gray') {
  const c = document.createElement('canvas');
  c.width = n * scale; c.height = n * scale;
  const ctx = c.getContext('2d');
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const v = Math.max(0, Math.min(1, grid[y * n + x]));
      ctx.fillStyle = mode === 'heat' ? heatColor(v) : `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c.toDataURL('image/png');
}

/** Dark-blue → purple → cyan → white heat ramp for the "what the model reads" stage. */
function heatColor(v) {
  // 0 -> #0a0f1e (near black-blue), mid -> magenta, high -> cyan/white
  const stops = [
    [10, 15, 30], [60, 20, 120], [178, 0, 255], [0, 240, 255], [230, 255, 255],
  ];
  const t = v * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  const f = t - i;
  const a = stops[i], b = stops[i + 1];
  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r},${g},${bl})`;
}
