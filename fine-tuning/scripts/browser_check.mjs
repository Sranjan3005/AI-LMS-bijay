/**
 * browser_check.mjs -- drive the real app in a real browser and prove the CNN
 * path works end to end.
 *
 * WHY THIS EXISTS RATHER THAN A UNIT TEST
 *
 * Everything interesting in this module happens in a browser: an ONNX session
 * created by onnxruntime-web, a canvas resampling pixels, WebAssembly fetched
 * from `/ort/`. None of that has a Node equivalent, so none of it is covered by
 * anything runnable in CI, and both bugs this script found were invisible to
 * `vite build` -- which passed cleanly through both of them:
 *
 *   1. onnxruntime `import()`s its WASM loader from `/ort/`, and Vite's dev
 *      server refuses to serve a `public/` file as a source module. The session
 *      never started. Because the failure was inside a dynamic import, the UI
 *      showed a spinner forever rather than an error.
 *   2. The browser's canvas resize disagreed with Pillow's badly enough to move
 *      feature vectors 2-5% (cosine as low as 0.949), so a head fitted in
 *      Python was being applied to features the browser never produces. Nothing
 *      threw. See src/lib/ml/resample.js.
 *
 * USAGE
 *
 *     npm run dev                       # in one terminal
 *     node scripts/browser_check.mjs    # in another
 *     node scripts/browser_check.mjs --parity    # also run the parity fixtures
 *
 * Needs `playwright-core` and a local Chrome or Edge:
 *
 *     npm install --no-save playwright-core
 *
 * Deliberately not a dependency in package.json -- it is a diagnostic, and
 * nobody setting up the lesson for a classroom should have to install a browser
 * driver to run it.
 */

import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = value('--base', 'http://localhost:5180').replace(/\/$/, '');
const IMAGE = value('--image', '/embeddings/flowers/test/bougainvillea__image_07585.jpg');
const WANT_PARITY = flag('--parity');

let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
} catch {
  // Edge is on every Windows machine; Chrome is not.
  browser = await chromium.launch({ channel: 'msedge', headless: true });
}

const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`); });
page.on('requestfailed', (r) => errors.push(`REQFAIL: ${r.url()} ${r.failure()?.errorText}`));

let failed = false;
const check = (ok, label, detail = '') => {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? `  ${detail}` : ''}`);
  if (!ok) failed = true;
};

console.log(`\nbrowser check against ${BASE}\n`);

// -- 1. the app boots -------------------------------------------------------
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
const title = (await page.textContent('h1').catch(() => '')) || '';
check(/Fine-Tuning/.test(title), 'app boots', `title: ${title}`);

// -- 2. the model actually loads, via the button a student presses ----------
const btn = page.getByRole('button', { name: /Load the model/i });
await btn.waitFor({ timeout: 20000 });
await btn.click();
try {
  await page.waitForSelector('.banner.good', { timeout: 240000 });
  const banner = (await page.textContent('.banner.good')).replace(/\s+/g, ' ').trim();
  check(true, 'onnxruntime session created', banner.slice(0, 60) + '…');
} catch {
  check(false, 'onnxruntime session created', 'timed out waiting for the loaded banner');
}

// -- 3. classify + embed on a real photo ------------------------------------
const r = await page.evaluate(async (imgUrl) => {
  const bb = await import('/src/lib/ml/backbone.js');
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = () => rej(new Error(`image load failed: ${imgUrl}`));
    i.src = imgUrl;
  });
  const t0 = performance.now();
  const { predictions, features } = await bb.classifyAndEmbed(img, 5);
  return {
    ms: Math.round(performance.now() - t0),
    dim: features.length,
    top: predictions.map((p) => `${p.label} ${(p.score * 100).toFixed(1)}%`),
  };
}, BASE + IMAGE);

check(r.dim === 2048, 'embed() returns 2048-d', `${r.dim}-d in ${r.ms} ms`);
check(r.top.length === 5, 'classify() returns ImageNet labels', r.top.slice(0, 3).join(' | '));

// -- 4. optional: the Python/browser preprocessing fixtures -----------------
if (WANT_PARITY) {
  const p = await page.evaluate(async () => {
    try {
      const m = await import('/src/lib/ml/parity.js');
      const res = await m.checkParity();
      return {
        ok: res.ok,
        summary: res.summary,
        worst: Math.min(...res.results.filter((x) => !x.error).map((x) => x.cosine)),
        n: res.results.length,
      };
    } catch (e) {
      return { ok: false, summary: e.message, worst: 0, n: 0 };
    }
  });
  check(p.ok, 'preprocessing parity with Python',
    `${p.n} fixtures, worst cosine ${Number(p.worst).toFixed(6)}`);
  if (!p.ok) console.log(`        ${p.summary}`);
}

// -- 5. nothing shouted in the console --------------------------------------
// The favicon is served, so a 404 here is a real missing asset, not noise.
check(errors.length === 0, 'no console or network errors',
  errors.length ? errors[0].slice(0, 100) : '');
for (const e of errors.slice(0, 8)) console.log(`        ${e.slice(0, 140)}`);

await browser.close();
console.log(failed ? '\nBROWSER CHECK: FAIL\n' : '\nBROWSER CHECK: PASS\n');
process.exit(failed ? 1 : 0);
