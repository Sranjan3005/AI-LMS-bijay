/* Runs every model test suite. Usage: node tests/run-all.mjs  (or npm test) */

import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(here).filter((f) => f.endsWith('.test.mjs')).sort();

let failed = 0;
for (const s of suites) {
  const r = spawnSync(process.execPath, [join(here, s)], { stdio: 'inherit' });
  if (r.status !== 0) failed++;
}

console.log(failed
  ? `\n✗ ${failed} of ${suites.length} suites failed\n`
  : `\n✓ all ${suites.length} suites passed\n`);
process.exit(failed ? 1 : 0);
