/**
 * ocr.js — real handwriting → text recognition using Tesseract.js (lazy-loaded,
 * so its ~few-MB engine only downloads when a student actually runs OCR).
 * Produces the 4 teaching stages for the overlay.
 */

function readGray(canvas) {
  const w = canvas.width, h = canvas.height;
  const { data } = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
  return { gray, w, h };
}

/** White strokes on black → black text on white (what OCR reads best). */
function binarize(gray, w, h, threshold = 110) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const out = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = gray[i] > threshold ? 0 : 255; // ink → black, paper → white
    out.data[i * 4] = out.data[i * 4 + 1] = out.data[i * 4 + 2] = v; out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return c;
}

function pad(canvas, p = 30) {
  const c = document.createElement('canvas'); c.width = canvas.width + p * 2; c.height = canvas.height + p * 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(canvas, p, p);
  return c;
}

export async function runOcrPipeline(sourceCanvas) {
  const { gray, w, h } = readGray(sourceCanvas);
  let ink = 0;
  for (let i = 0; i < gray.length; i++) if (gray[i] > 110) ink++;
  if (ink < 40) return { ok: false, message: 'Write something first — try your name in clear letters!' };

  const binCanvas = binarize(gray, w, h);
  const padded = pad(binCanvas, 30);

  const Tesseract = await import('tesseract.js');
  let text = '', words = [];
  try {
    const { data } = await Tesseract.recognize(padded, 'eng');
    text = (data.text || '').trim();
    words = data.words || [];
  } catch (e) {
    console.error('OCR failed', e);
  }

  // Segmentation stage: word boxes over the binarized image.
  const boxCanvas = document.createElement('canvas');
  boxCanvas.width = padded.width; boxCanvas.height = padded.height;
  const bctx = boxCanvas.getContext('2d');
  bctx.drawImage(padded, 0, 0);
  bctx.strokeStyle = '#00FF88'; bctx.lineWidth = 2;
  words.forEach((wd) => {
    const b = wd.bbox || wd;
    if (b && b.x1 != null) bctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0);
  });

  const cleaned = text.replace(/\s+/g, ' ').trim();
  const prediction = cleaned ? `I read: "${cleaned}"` : "I couldn't read it clearly — try bigger, clearer letters!";

  return {
    ok: true,
    prediction,
    stages: [
      { title: 'Capture', description: 'Your handwriting, captured as pixels from the canvas.', image: sourceCanvas.toDataURL('image/png') },
      { title: 'Process', description: 'Binarization: every pixel becomes pure black (ink) or white (paper) — the cleanest input for OCR.', image: binCanvas.toDataURL('image/png') },
      { title: 'Understand', description: 'Segmentation: the OCR engine locates each word and boxes it before trying to read.', image: boxCanvas.toDataURL('image/png') },
      { title: 'Decide', description: 'Recognition: each letter shape is matched to a character and turned into typed text.', text: cleaned || '(nothing readable)' },
    ],
  };
}
