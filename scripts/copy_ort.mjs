/**
 * copy_ort.mjs -- put onnxruntime-web's WebAssembly files where the app can serve them.
 *
 * onnxruntime-web ships its .wasm binaries inside node_modules and, by default,
 * fetches them from a CDN at runtime. This module is supposed to work on school
 * wifi with the network unplugged, so instead we copy them into `public/ort/`
 * and `backbone.js` points `ort.env.wasm.wasmPaths` at that directory.
 *
 * Why a copy rather than a bundler import: Vite resolves `?url` imports of .wasm
 * differently in dev and in build, and onnxruntime-web loads its own sibling
 * .mjs loader by relative path at runtime, which a bundler cannot rewrite. A
 * plain directory both dev and build can serve is one fewer thing to be
 * surprised by at a bad moment.
 *
 * Wired to `npm run dev`, `npm run build` and `postinstall`, so nobody has to
 * remember it exists.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const from = join(root, 'node_modules', 'onnxruntime-web', 'dist');
const to = join(root, 'public', 'ort');

if (!existsSync(from)) {
  console.error('[copy_ort] node_modules/onnxruntime-web/dist is missing — run npm install first.');
  process.exit(1);
}

mkdirSync(to, { recursive: true });

// ONLY the runtime-fetched WebAssembly, not the library itself.
//
// `dist/` also contains ort.mjs, ort.webgpu.mjs and friends -- those are the
// JavaScript API, which Vite bundles from node_modules like any other import.
// Copying them here would add 40 MB to public/ that nothing ever requests.
//
// `backbone.js` pins `executionProviders: ['wasm']`, so the plain
// simd-threaded build is the only binary the runtime asks for. The `.jsep`
// variant is the WebGPU one -- if you ever add 'webgpu' to that list, widen
// this prefix to 'ort-wasm' and it will come along.
const NEEDED = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs'];
const wanted = readdirSync(from).filter((f) => NEEDED.includes(f));
if (wanted.length !== NEEDED.length) {
  console.error(`[copy_ort] expected ${NEEDED.join(', ')} in ${from}`);
  process.exit(1);
}

let copied = 0;
let bytes = 0;
for (const name of wanted) {
  const src = join(from, name);
  const dest = join(to, name);
  // Skip files that are already there and the same size. This runs on every
  // `npm run dev`, and re-copying 30 MB each time makes the command feel broken.
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
  copyFileSync(src, dest);
  copied += 1;
  bytes += statSync(src).size;
}

if (copied) {
  console.log(`[copy_ort] copied ${copied} file(s), ${(bytes / 1e6).toFixed(1)} MB -> public/ort/`);
} else {
  console.log(`[copy_ort] public/ort/ is up to date (${wanted.length} files)`);
}
